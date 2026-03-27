'use client';

import { useMemo, useState } from 'react';
import {
  Globe,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';

import SecurityAccessRequestForm from '@/components/SecurityAccessRequestForm';
import { scannerAllowedTargets, scannerPolicy } from '@/data/scanner-policy';
import { runBackendWebScan, submitScanAccessRequest } from '@/services/api';

const severityStyles = {
  HIGH: {
    card: 'border-red-500/40 bg-red-950/30 text-red-200',
    badge: 'border-red-500/40 bg-red-500/10 text-red-300',
    Icon: ShieldAlert,
  },
  MEDIUM: {
    card: 'border-orange-500/40 bg-orange-950/30 text-orange-200',
    badge: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    Icon: ShieldQuestion,
  },
  PASS: {
    card: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    Icon: ShieldCheck,
  },
};

const categoryStatusStyles = {
  PASS: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  WARN: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  FAIL: 'border-red-500/30 bg-red-500/10 text-red-300',
};

const checkStatusStyles = {
  PASS: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  WARN: 'border-orange-500/20 bg-orange-500/10 text-orange-200',
  FAIL: 'border-red-500/20 bg-red-500/10 text-red-200',
  INFO: 'border-slate-700 bg-slate-900/80 text-slate-300',
};

const initialRequestForm = {
  name: '',
  contact: '',
  reason: '',
  website: '',
  ownershipConfirmed: false,
};

function ScoreCard({ label, value, tone }) {
  const toneStyles = {
    red: 'border-red-500/30 bg-red-950/30 text-red-300',
    orange: 'border-orange-500/30 bg-orange-950/30 text-orange-300',
    emerald: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300',
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${toneStyles[tone]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] opacity-80">{label}</div>
    </div>
  );
}

function AllowedTargetList({ targets }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {targets.map((target) => (
        <div key={target.hostname} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-100">{target.label}</div>
              <div className="mt-1 font-mono text-xs text-emerald-300">{target.hostname}</div>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Legal Lab
            </div>
          </div>
          <div className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{target.provider}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{target.notes}</p>
        </div>
      ))}
    </div>
  );
}

export default function WebSecurityScanner({ siteAccessMode = 'blocked' }) {
  const [targetUrl, setTargetUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [policyBlock, setPolicyBlock] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [requestError, setRequestError] = useState('');
  const [requestFeedback, setRequestFeedback] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const allowedTargets = useMemo(
    () => policyBlock?.policy?.allowedTargets || scannerAllowedTargets,
    [policyBlock]
  );
  const siteAccessVerified = siteAccessMode === 'verified';

  const handleTargetChange = (event) => {
    setTargetUrl(event.target.value);
    setError('');
    setResult(null);
    setRequestError('');
    setRequestFeedback('');
    if (policyBlock) {
      setPolicyBlock(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!siteAccessVerified) {
      setError('Scanner belum tersedia untuk sesi ini. Muat ulang halaman atau coba lagi sebentar lagi.');
      return;
    }

    const normalizedTarget = targetUrl.trim();
    if (!normalizedTarget) {
      setError('URL target wajib diisi.');
      return;
    }

    setIsScanning(true);
    setError('');
    setResult(null);
    setPolicyBlock(null);
    setRequestError('');
    setRequestFeedback('');

    try {
      const data = await runBackendWebScan(normalizedTarget);
      setResult(data);
    } catch (scanError) {
      if (scanError.code === 'DOMAIN_NOT_ALLOWED') {
        setPolicyBlock(scanError.data);
        setResult(null);
        return;
      }

      setError(scanError.message);
    } finally {
      setIsScanning(false);
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
      setRequestError('Target domain yang diblokir tidak tersedia. Coba kirim ulang scan terlebih dahulu.');
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError('');
    setRequestFeedback('');

    try {
      const response = await submitScanAccessRequest({
        ...requestForm,
        targetUrl: policyBlock.blockedTarget,
        toolName: 'Web Security Scanner',
        targetType: 'url',
      });

      setRequestFeedback(response.message || 'Permintaan izin domain berhasil dikirim.');
      setRequestForm(initialRequestForm);
    } catch (submitError) {
      setRequestError(submitError.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const scoreTone =
    !result ? 'text-slate-200 border-slate-700 bg-slate-900/80' :
    result.score >= 85 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' :
    result.score >= 70 ? 'text-blue-300 border-blue-500/30 bg-blue-500/10' :
    result.score >= 50 ? 'text-orange-300 border-orange-500/30 bg-orange-500/10' :
    'text-red-300 border-red-500/30 bg-red-500/10';

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-inner sm:p-6">
      <div className="mb-6 flex flex-col gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <Globe className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">Web Security Scanner</span>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Scanner ini berjalan dalam mode <span className="font-semibold text-slate-200">{scannerPolicy.title}</span>. Engine
          hanya aktif untuk domain lab yang memang didesain untuk pentesting legal, lalu menjalankan passive baseline
          assessment tanpa exploit aktif.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <div className="text-sm font-semibold text-amber-200">Kebijakan Pembatasan Domain</div>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/80">{scannerPolicy.summary}</p>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/70">{scannerPolicy.rationale}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-4 text-sm font-semibold text-slate-100">Domain Lab Yang Diizinkan</div>
        <AllowedTargetList targets={allowedTargets} />
      </div>

      {!siteAccessVerified && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-relaxed text-amber-100/85">
Scanner baru tersedia setelah akses penuh aktif. Selama mode terbatas, Anda tetap bisa membaca dokumentasi dan daftar target legal, tetapi scan backend belum dijalankan.
        </div>
      )}

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="web-security-scanner-target">
          Target URL
        </label>
        <input
          id="web-security-scanner-target"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck="false"
          value={targetUrl}
          onChange={handleTargetChange}
          disabled={!siteAccessVerified || isScanning}
          placeholder="Masukkan URL target, misalnya https://testphp.vulnweb.com"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!siteAccessVerified || isScanning}
          className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mulai Scan'}
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
                <div className="text-sm font-semibold text-amber-200">Engine Dikunci Untuk Target Ini</div>
                <p className="mt-2 text-sm leading-relaxed text-amber-100/85">{policyBlock.error}</p>
                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-xs text-slate-300">
                  <div className="font-semibold text-slate-100">Target yang Anda masukkan</div>
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
            description="Jika Anda memang pemilik domain atau memiliki izin tertulis, kirim permintaan ini. Form akan dikirim ke email pemilik situs untuk review manual, bukan membuka scan otomatis saat itu juga."
          />
        </div>
      )}

      {isScanning && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
          Memeriksa target secara aman di backend...
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
            <div className={`rounded-2xl border p-5 ${scoreTone}`}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Skor Keseluruhan</div>
              <div className="mt-3 text-5xl font-bold">{result.score}</div>
              <div className="mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold">
                Grade {result.grade}
              </div>
              <div className="mt-4 text-sm text-slate-400">Target: {result.target}</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreCard label="Kritis" value={result.highCount || 0} tone="red" />
              <ScoreCard label="Peringatan" value={result.medCount || 0} tone="orange" />
              <ScoreCard label="Aman" value={result.lowCount || 0} tone="emerald" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">
              Unit Yang Diuji
            </div>
            <div className="space-y-4 p-4">
              {result.categories?.map((category) => (
                <div key={category.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-100">{category.name}</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Skor unit: {category.score}/{category.maxScore}
                      </div>
                    </div>
                    <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${categoryStatusStyles[category.status] || 'border-slate-700 bg-slate-800 text-slate-300'}`}>
                      {category.status}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {category.checks.map((check, index) => (
                      <div key={`${category.id}-${check.name}-${index}`} className={`rounded-lg border px-3 py-3 ${checkStatusStyles[check.status] || checkStatusStyles.INFO}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="font-medium text-slate-100">{check.name}</div>
                            <div className="mt-1 text-sm leading-relaxed text-slate-300">{check.desc}</div>
                          </div>
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {check.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200">
              Log Temuan
            </div>
            <div className="space-y-3 p-4">
              {result.issues.map((issue, index) => {
                const style = severityStyles[issue.severity] || {
                  card: 'border-slate-700 bg-slate-950/40 text-slate-200',
                  badge: 'border-slate-700 bg-slate-800 text-slate-300',
                  Icon: ShieldQuestion,
                };
                const IssueIcon = style.Icon;

                return (
                  <div
                    key={`${issue.name}-${index}`}
                    className={`rounded-xl border p-4 ${style.card}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <IssueIcon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-100">{issue.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {issue.source || 'Analyzer'}
                          </div>
                        </div>
                      </div>
                      <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                        {issue.severity}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{issue.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


