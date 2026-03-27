'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Github, Mail, MapPin, MessageSquare, Send } from 'lucide-react';

import { contactInfo } from '@/data/contact';
import { submitContactMessage } from '@/services/api';

const emptyForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: '',
};

function getContactErrorMessage(error) {
  if (error?.status === 400) {
    return error.message || 'Periksa kembali data yang Anda isi.';
  }

  if (error?.status === 429) {
    return 'Pengiriman terlalu sering. Coba lagi beberapa saat lagi.';
  }

  return 'Pesan belum dapat dikirim saat ini. Silakan coba lagi atau gunakan email langsung.';
}

export default function ContactHub({ systemHealth, siteAccessMode = 'blocked' }) {
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [showInlineMap, setShowInlineMap] = useState(false);

  const healthLoaded = Boolean(systemHealth);
  const contactConfigured = systemHealth?.services?.contact ?? false;
  const accessReady = siteAccessMode === 'verified';
  const isFormDisabled = isSubmitting || !accessReady || (healthLoaded && !contactConfigured);

  const statusNotes = useMemo(() => {
    const notes = [];

    if (healthLoaded && !contactConfigured) {
      notes.push('Form pesan sedang tidak tersedia. Silakan gunakan email langsung untuk sementara.');
    }

    if (!accessReady) {
      notes.push('Akses penuh untuk form belum tersedia pada sesi ini. Muat ulang halaman atau gunakan email langsung.');
    }

    return notes;
  }, [accessReady, contactConfigured, healthLoaded]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isFormDisabled) return;

    setFeedback({ type: '', message: '' });
    setIsSubmitting(true);

    try {
      const response = await submitContactMessage(formData);
      setFeedback({ type: 'success', message: response.message || 'Pesan berhasil dikirim.' });
      setFormData(emptyForm);
    } catch (error) {
      setFeedback({ type: 'error', message: getContactErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Lokasi dan Kontak</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Contact hub ini menampilkan alamat, peta, dan jalur komunikasi profesional dalam satu tempat.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-sm font-semibold text-slate-100">Alamat</div>
              <div className="mt-2 text-sm text-slate-300">{contactInfo.locationName}</div>
              <div className="mt-1 text-sm text-slate-400">{contactInfo.addressLine}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 transition hover:border-emerald-500/30 hover:bg-slate-900"
              >
                <Mail className="h-4 w-4 text-emerald-300" />
                <span>{contactInfo.email}</span>
              </a>
              <a
                href={contactInfo.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 transition hover:border-blue-500/30 hover:bg-slate-900"
              >
                <Github className="h-4 w-4 text-blue-300" />
                <span>GitHub Profile</span>
              </a>
            </div>

            <a
              href={contactInfo.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500/30 hover:text-emerald-300"
            >
              <ExternalLink className="h-4 w-4" />
              Buka di Google Maps
            </a>

            <div className="space-y-2">
              {contactInfo.notes.map((note) => (
                <div key={note} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-400">
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
          {showInlineMap ? (
            <iframe
              title="Lokasi Kontak"
              src={contactInfo.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[320px] w-full border-0 sm:h-[420px]"
            />
          ) : (
            <div className="flex h-[320px] w-full flex-col justify-between p-5 sm:h-[420px] sm:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Privacy-Aware Map
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-100">Peta tidak dimuat otomatis</h4>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                  Untuk mengurangi beban pihak ketiga dan menjaga privasi pengunjung, embed Google Maps hanya dimuat setelah Anda memintanya.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowInlineMap(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <MapPin className="h-4 w-4" />
                  Muat Peta Inline
                </button>
                <div className="text-xs leading-relaxed text-slate-500">
                  Alternatif paling aman tetap memakai tombol Google Maps di atas untuk membuka peta pada tab terpisah.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-300">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Kirim Email atau Pesan</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Form ini aktif saat akses penuh tersedia. Jika form sedang tidak aktif, Anda tetap bisa menghubungi melalui email langsung.
            </p>
          </div>
        </div>

        {statusNotes.length > 0 && (
          <div className="mt-5 space-y-2">
            {statusNotes.map((note) => (
              <div key={note} className="rounded-xl border border-orange-500/30 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
                {note}
              </div>
            ))}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="contact-name">Nama</label>
              <input
                id="contact-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isFormDisabled}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isFormDisabled}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="contact-subject">Subjek</label>
            <input
              id="contact-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              disabled={isFormDisabled}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Subjek pesan"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="contact-message">Pesan</label>
            <textarea
              id="contact-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              disabled={isFormDisabled}
              rows={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Tulis pesan Anda di sini"
            />
          </div>

          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {feedback.message && (
            <div className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200' : 'border-red-500/30 bg-red-950/30 text-red-200'}`}>
              {feedback.message}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-relaxed text-slate-500">
              Gunakan email langsung jika form sedang dinonaktifkan atau akses penuh belum tersedia.
            </div>
            <button
              type="submit"
              disabled={isFormDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
