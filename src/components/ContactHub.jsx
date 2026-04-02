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

  return 'Pesan belum dapat dikirim saat ini. Silakan coba lagi atau hubungi melalui email.';
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

  const statusMessage = useMemo(() => {
    if (!accessReady || (healthLoaded && !contactConfigured)) {
      return 'Form belum tersedia saat ini.';
    }

    return '';
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
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-100">Kontak</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Hubungi saya untuk kolaborasi proyek, konsultasi, atau peluang kerja profesional.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${contactInfo.email}`}
            className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-emerald-500/30 hover:bg-slate-900"
          >
            <div className="flex items-center gap-3 text-emerald-300">
              <Mail className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Email</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">Email</div>
            <div className="mt-2 break-words text-sm leading-relaxed text-slate-400">
              {contactInfo.email}
            </div>
          </a>

          <a
            href={contactInfo.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-blue-500/30 hover:bg-slate-900"
          >
            <div className="flex items-center gap-3 text-blue-300">
              <Github className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">GitHub</span>
            </div>
            <div className="mt-4 text-base font-semibold text-slate-100">hamk4dev</div>
            <div className="mt-2 break-words text-sm leading-relaxed text-slate-400">
              Lihat repo saya, eksperimen, dan proyek yang sudah dipublikasikan.
            </div>
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-100">Lokasi</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Alamat dan peta tersedia di bawah ini.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alamat</div>
            <div className="mt-3 break-words text-base font-semibold leading-relaxed text-slate-100">
              {contactInfo.locationName}
            </div>
            {contactInfo.addressLine ? (
              <div className="mt-2 break-words text-sm leading-relaxed text-slate-400">
                {contactInfo.addressLine}
              </div>
            ) : null}

            <a
              href={contactInfo.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/30 hover:text-emerald-300"
            >
              <ExternalLink className="h-4 w-4" />
              Buka di Maps
            </a>
          </div>

          <div className="portofolio-map-card min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Peta</div>
            <div className="portofolio-map-shell relative mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
              {showInlineMap ? (
                <>
                  <iframe
                    title="Lokasi Kontak"
                    src={contactInfo.mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="portofolio-map-iframe h-[280px] w-full border-0 sm:h-[340px] xl:h-[360px]"
                  />
                  <div className="portofolio-map-tint pointer-events-none absolute inset-0" aria-hidden="true" />
                </>
              ) : (
                <div className="portofolio-map-placeholder flex h-[280px] w-full flex-col justify-between p-5 sm:h-[340px] sm:p-6 xl:h-[360px]">
                  <div className="min-w-0">
                    <div className="portofolio-map-badge inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      Peta
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-slate-100">Tampilkan peta</h4>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
                      Lokasi domisili portofolio ini berada di Ulu Baula, Baula, Kolaka, Sulawesi Tenggara.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setShowInlineMap(true)}
                      className="portofolio-map-action inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <MapPin className="h-4 w-4" />
                      Tampilkan Peta
                    </button>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-inner sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-300">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-100">Kirim Pesan</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Kirim pesan untuk kebutuhan kolaborasi, proyek, atau peluang kerja.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-5 rounded-2xl border border-orange-500/30 bg-orange-950/30 px-4 py-3 text-sm text-orange-200">
            {statusMessage}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="contact-name">Nama</label>
              <input
                id="contact-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isFormDisabled}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
              rows={7}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200' : 'border-red-500/30 bg-red-950/30 text-red-200'}`}>
              {feedback.message}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="submit"
              disabled={isFormDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}


