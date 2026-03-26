'use client';

import { useState } from 'react';
import { Globe, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

import { runBackendWebScan } from '@/services/api';

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

export default function WebSecurityScanner() {
  const [targetUrl, setTargetUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedTarget = targetUrl.trim();
    if (!normalizedTarget) {
      setError('URL target wajib diisi.');
      return;
    }

    setIsScanning(true);
    setError('');
    setResult(null);

    try {
      const data = await runBackendWebScan(normalizedTarget);
      setResult(data);
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setIsScanning(false);
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
          Scanner lokal ini memakai backend internal aplikasi untuk validasi DNS publik, pengecekan redirect, dan inspeksi header keamanan dasar.
        </p>
      </div>

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
          onChange={(event) => setTargetUrl(event.target.value)}
          placeholder="Masukkan URL target, misalnya https://example.com"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          disabled={isScanning}
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

      {isScanning && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
          Memeriksa target secara aman di backend...
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-6">
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
