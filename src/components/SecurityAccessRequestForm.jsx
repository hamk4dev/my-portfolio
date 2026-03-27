'use client';

import { Loader2, Mail } from 'lucide-react';

export default function SecurityAccessRequestForm({
  formState,
  onFieldChange,
  onSubmit,
  isSubmitting,
  error,
  feedback,
  description,
  submitLabel = 'Kirim Pesan',
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-slate-100">
        <Mail className="h-4 w-4 text-emerald-300" />
        <div className="text-sm font-semibold">Kirim Pesan Untuk Akses Pengujian Penuh</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" htmlFor="security-access-name">
              Nama
            </label>
            <input
              id="security-access-name"
              type="text"
              value={formState.name}
              onChange={onFieldChange('name')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Nama lengkap"
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" htmlFor="security-access-contact">
              Email atau LinkedIn
            </label>
            <input
              id="security-access-contact"
              type="text"
              value={formState.contact}
              onChange={onFieldChange('contact')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="nama@domain.com atau https://linkedin.com/in/..."
              maxLength={200}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" htmlFor="security-access-reason">
            Pesan
          </label>
          <textarea
            id="security-access-reason"
            value={formState.reason}
            onChange={onFieldChange('reason')}
            rows={5}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Jelaskan konteks pengujian dan kebutuhan Anda."
            maxLength={1500}
          />
        </div>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="security-access-website">Website</label>
          <input
            id="security-access-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formState.website}
            onChange={onFieldChange('website')}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {feedback && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
            {feedback}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Mengirim Pesan...
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </form>
    </div>
  );
}
