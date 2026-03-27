'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';

import { emailAuthPolicy, emailAuthSuggestedTargets } from '@/data/email-auth-policy';
import { runEmailAuthAnalysis } from '@/services/api';

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

function SampleDomainList({ targets, onPick }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {targets.map((target) => (
        <button
          key={target.hostname}
          type="button"
          onClick={() => onPick(target.hostname)}
          className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left transition hover:border-cyan-500/30 hover:bg-slate-950"
        >
          <div className="font-semibold text-slate-100">{target.label}</div>
          <div className="mt-1 break-all font-mono text-xs text-cyan-300">{target.hostname}</div>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{target.provider}</div>
          <p className="mt-2 break-words text-sm leading-relaxed text-slate-400">{target.notes}</p>
        </button>
      ))}
    </div>
  );
}

function ResultCard({ title, result }) {
  const style = severityStyles[result.severity] || severityStyles.MEDIUM;
  const ResultIcon = style.Icon;

  return (
    <div className={`min-w-0 rounded-3xl border p-5 ${style.card}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex items-start gap-3">
          <ResultIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</div>
            <div className="mt-2 break-words text-xl font-semibold leading-snug text-slate-100">{result.verdict}</div>
          </div>
        </div>
        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style.badge}`}>
          {result.status}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-200/90">{result.summary}</p>

      {result.rawRecord && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Record yang dinilai</div>
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-cyan-200">{result.rawRecord}</pre>
        </div>
      )}

      {Array.isArray(result.rawMatches) && result.rawMatches.length > 1 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Record terkait</div>
          {result.rawMatches.map((record, index) => (
            <pre key={`${title}-${index}`} className="whitespace-pre-wrap break-words font-mono text-xs text-slate-200">
              {record}
            </pre>
          ))}
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
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Query DNS</div>
        <div className="mt-2 break-all font-mono text-xs text-cyan-200">{query}</div>
      </div>
      <div className="mt-3 space-y-3">
        {records.length ? (
          records.map((record, index) => (
            <div key={`${query}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">TXT #{index + 1}</div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{record}</pre>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-400">
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showSampleDomains, setShowSampleDomains] = useState(false);

  const siteAccessVerified = siteAccessMode === 'verified';

  const handleDomainChange = (event) => {
    setDomain(event.target.value);
    setError('');
    setResult(null);
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!siteAccessVerified) {
      setError('Analyzer belum tersedia untuk sesi ini. Coba lagi setelah akses penuh aktif.');
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

    try {
      const data = await runEmailAuthAnalysis(normalizedDomain);
      setResult(data);
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-cyan-300">
              <Mail className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Email Auth Analyzer</span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Audit SPF dan DMARC dilakukan lewat query TXT DNS publik secara real-time, tanpa request HTTP ke aplikasi target.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-3 text-sm leading-relaxed text-cyan-100/85 lg:max-w-sm">
            Analyzer ini membaca DNS publik saja. Tidak ada crawl web, tidak ada simulasi email, dan tidak ada exploit aktif.
          </div>
        </div>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleAnalyze}>
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
            placeholder="Masukkan domain, misalnya cloudflare.com"
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!siteAccessVerified || isAnalyzing}
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analisis DNS'}
          </button>
        </form>

        {!siteAccessVerified && (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm leading-relaxed text-amber-100/85">
            Akses penuh belum aktif. Anda tetap bisa melihat contoh domain publik dan metodologi analyzer.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowSampleDomains((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-500/30 hover:text-cyan-300"
          >
            {showSampleDomains ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showSampleDomains ? 'Sembunyikan Contoh Domain' : 'Lihat Contoh Domain'}
          </button>
          <button
            type="button"
            onClick={() => setShowMethodology((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-cyan-500/30 hover:text-cyan-300"
          >
            {showMethodology ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showMethodology ? 'Sembunyikan Metodologi' : 'Lihat Metodologi'}
          </button>
        </div>

        {showMethodology && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-400">
            <div className="font-semibold text-slate-100">{emailAuthPolicy.title}</div>
            <p className="mt-2">{emailAuthPolicy.summary}</p>
            <p className="mt-2">{emailAuthPolicy.rationale}</p>
          </div>
        )}

        {showSampleDomains && (
          <div className="mt-4">
            <SampleDomainList targets={emailAuthSuggestedTargets} onPick={setDomain} />
          </div>
        )}
      </section>

      {isAnalyzing && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
          Melakukan query TXT DNS secara real-time...
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Target</div>
                <div className="mt-2 break-all text-2xl font-semibold leading-snug text-slate-100">{result.domain}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Resolver SPF</div>
                  <div className="mt-2 break-all text-sm font-semibold text-cyan-200">{result.resolvers?.spf || 'system'}</div>
                </div>
                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Resolver DMARC</div>
                  <div className="mt-2 break-all text-sm font-semibold text-cyan-200">{result.resolvers?.dmarc || 'system'}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Ringkasan</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-300">{result.summary}</div>
              </div>
              <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 lg:col-span-2">
                <div className="flex items-center gap-2 text-slate-100">
                  <BadgeCheck className="h-4 w-4 text-cyan-300" />
                  <div className="text-sm font-semibold">Metodologi</div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {result.methodology?.map((item, index) => (
                    <div key={`${item}-${index}`} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm leading-relaxed text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <ResultCard title="SPF Analysis" result={result.spf} />
            <ResultCard title="DMARC Analysis" result={result.dmarc} />
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-slate-100">
              <FileText className="h-4 w-4 text-cyan-300" />
              <div className="text-sm font-semibold">Bukti Mentah DNS</div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              TXT record di bawah ini ditampilkan apa adanya agar hasil analisis bisa diverifikasi manual.
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
          </section>
        </div>
      )}
    </div>
  );
}
