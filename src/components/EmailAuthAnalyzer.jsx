'use client';

import { useMemo, useState } from 'react';
import {
  Database,
  FileText,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';

import SecurityAccessRequestForm from '@/components/SecurityAccessRequestForm';
import { emailAuthAllowedTargets, emailAuthPolicy } from '@/data/email-auth-policy';
import { runEmailAuthAnalysis, submitScanAccessRequest } from '@/services/api';

const initialRequestForm = {
  name: '',
  contact: '',
  reason: '',
  website: '',
  ownershipConfirmed: false,
};

const severityStyles = {
  HIGH: {
    card: 'border-red-500/30 bg-red-950/30 text-red-100',
    badge: 'border-red-500/30 bg-red-500/10 text-red-300',
    Icon: ShieldAlert,
  },
  MEDIUM: {
    card: 'border-amber-500/30 bg-amber-950/30 text-amber-100',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    Icon: ShieldQuestion,
  },
  PASS: {
    card: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-100',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    Icon: ShieldCheck,
  },
};

function PolicyTargetList({ targets }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {targets.map((target) => (
        <div key={target.hostname} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="font-semibold text-slate-100">{target.label}</div>
          <div className="mt-1 font-mono text-xs text-cyan-300">{target.hostname}</div>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{target.provider}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{target.notes}</p>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ title, result }) {
  const style = severityStyles[result.severity] || severityStyles.MEDIUM;
  const ResultIcon = style.Icon;

  return (
    <div className={`rounded-2xl border p-5 ${style.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ResultIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</div>
            <div className="mt-2 text-xl font-semibold text-slate-100">{result.verdict}</div>
          </div>
        </div>
        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style.badge}`}>
          {result.status}
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-200/90">{result.summary}</p>
      {result.rawRecord && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Record yang Dinilai</div>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-cyan-200">{result.rawRecord}</pre>
        </div>
      )}
    </div>
  );
}

function RawDnsPanel({ title, query, records }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center gap-2 text-slate-100">
        <Database className="h-4 w-4 text-cyan-300" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Query</div>
        <div className="mt-2 break-all font-mono text-xs text-cyan-200">{query}</div>
      </div>
      <div className="mt-3 space-y-3">
        {records.length ? (
          records.map((record, index) => (
            <div key={`${query}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">TXT #{index + 1}</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{record}</pre>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-400">
            Tidak ada TXT record yang dikembalikan untuk query ini.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailAuthAnalyzer({ siteAccessMode = 'blocked' }) {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [policyBlock, setPolicyBlock] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [requestError, setRequestError] = useState('');
  const [requestFeedback, setRequestFeedback] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const allowedTargets = useMemo(
    () => policyBlock?.policy?.allowedTargets || emailAuthAllowedTargets,
    [policyBlock]
  );
  const siteAccessVerified = siteAccessMode === 'verified';

  const handleDomainChange = (event) => {
    setDomain(event.target.value);
    setError('');
    setResult(null);
    setRequestError('');
    setRequestFeedback('');
    if (policyBlock) {
      setPolicyBlock(null);
    }
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!siteAccessVerified) {
      setError('Analyzer DNS belum tersedia untuk sesi ini. Muat ulang halaman atau coba lagi sebentar lagi.');
      return;
    }

    const normalizedDomain = domain.trim();
    if (!normalizedDomain) {
      setError('Nama domain wajib diisi.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResult(null);
    setPolicyBlock(null);
    setRequestError('');
    setRequestFeedback('');

    try {
      const data = await runEmailAuthAnalysis(normalizedDomain);
      setResult(data);
    } catch (analysisError) {
      if (analysisError.code === 'DOMAIN_NOT_ALLOWED') {
        setPolicyBlock(analysisError.data);
        return;
      }

      setError(analysisError.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRequestFieldChange = (field) => (event) => {
    const value = field === 'ownershipConfirmed' ? event.target.checked : event.target.value;
    setRequestForm((current) => ({
      ...current,
      [field]: value,
    }));
    setRequestError('');
    setRequestFeedback('');
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();

    if (!policyBlock?.blockedTarget) {
      setRequestError('Domain yang diblokir tidak tersedia. Jalankan analisis ulang terlebih dahulu.');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError('');
    setRequestFeedback('');

    try {
      const response = await submitScanAccessRequest({
        ...requestForm,
        targetUrl: policyBlock.blockedTarget,
        toolName: 'Passive Email Spoofing Analyzer (SPF/DMARC)',
        targetType: 'domain',
      });

      setRequestFeedback(response.message || 'Permintaan izin domain berhasil dikirim.');
      setRequestForm(initialRequestForm);
    } catch (submitError) {
      setRequestError(submitError.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-inner sm:p-6">
      <div className="mb-6 flex flex-col gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-cyan-300">
          <Mail className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            Email Auth Analyzer
          </span>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          Tool ini menjalankan passive OSINT nyata dengan query TXT DNS real-time untuk mengevaluasi SPF dan DMARC.
          Tidak ada HTTP request ke target dan tidak ada simulasi kirim email. Bukti mentah TXT record wajib ditampilkan
          agar hasilnya bisa diverifikasi manual.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
          <div>
            <div className="text-sm font-semibold text-cyan-200">Kebijakan Legal Analyzer</div>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/80">{emailAuthPolicy.summary}</p>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">{emailAuthPolicy.rationale}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 text-sm font-semibold text-slate-100">Domain Demonstrasi Yang Diizinkan</div>
        <PolicyTargetList targets={allowedTargets} />
      </div>

      {!siteAccessVerified && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-100/85">
Analyzer DNS baru tersedia setelah akses penuh aktif. Selama mode terbatas, Anda tetap bisa membaca metodologi dan kebijakan legal, tetapi query backend belum dijalankan.
        </div>
      )}

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAnalyze}>
        <label className="sr-only" htmlFor="email-auth-domain">
          Domain Target
        </label>
        <input
          id="email-auth-domain"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck="false"
          value={domain}
          onChange={handleDomainChange}
          disabled={!siteAccessVerified || isAnalyzing}
          placeholder="Masukkan domain, misalnya example.com"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!siteAccessVerified || isAnalyzing}
          className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analisis DNS'}
        </button>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {policyBlock && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <div className="text-sm font-semibold text-amber-200">Analyzer Dikunci Untuk Domain Ini</div>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/85">{policyBlock.error}</p>
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Domain yang Anda masukkan</div>
                  <div className="mt-1 break-all font-mono text-amber-200">{policyBlock.blockedTarget}</div>
                </div>
              </div>
            </div>
          </div>

          <SecurityAccessRequestForm
            formState={requestForm}
            onFieldChange={handleRequestFieldChange}
            onSubmit={handleRequestSubmit}
            isSubmitting={isSubmittingRequest}
            error={requestError}
            feedback={requestFeedback}
            description="Untuk domain di luar daftar demonstrasi aman, analyzer ini memakai review manual. Jika Anda pemilik domain atau memiliki izin tertulis, kirim permintaan ini agar domain dapat ditinjau untuk audit DNS SPF/DMARC yang sah."
          />
        </div>
      )}

      {isAnalyzing && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          Melakukan query TXT DNS secara real-time...
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="text-sm font-semibold text-slate-100">Metodologi</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{result.summary}</p>
            <div className="mt-4 space-y-2">
              {result.methodology?.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ResultCard title="SPF Analysis" result={result.spf} />
            <ResultCard title="DMARC Analysis" result={result.dmarc} />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-slate-100">
              <FileText className="h-4 w-4 text-cyan-300" />
              <div className="text-sm font-semibold">Bukti Mentah DNS</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Record di bawah ini ditampilkan apa adanya dari server DNS publik. Bagian ini sengaja dipertahankan agar pengguna
              dapat memverifikasi bahwa engine benar-benar membaca TXT record nyata, bukan hasil simulasi.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <RawDnsPanel
                title="SPF / Root TXT"
                query={result.rawDnsRecords.spfQuery}
                records={result.rawDnsRecords.spfTxtRecords || []}
              />
              <RawDnsPanel
                title="DMARC TXT"
                query={result.rawDnsRecords.dmarcQuery}
                records={result.rawDnsRecords.dmarcTxtRecords || []}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



