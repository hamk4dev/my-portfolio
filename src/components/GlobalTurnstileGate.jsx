'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

import TurnstileWidget from '@/components/TurnstileWidget';
import { getTurnstileSessionStatus, verifyTurnstileSiteAccess } from '@/services/api';

function getGateFeedbackMessage(error) {
  if (error?.status === 429) {
    return 'Percobaan terlalu sering. Coba lagi beberapa saat lagi.';
  }

  return 'Pemeriksaan akses belum berhasil. Silakan coba lagi.';
}

export default function GlobalTurnstileGate({ onVerified, onAccessStateChange }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [limitedMode, setLimitedMode] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [widgetState, setWidgetState] = useState({ status: 'idle', message: '' });
  const [serviceIssue, setServiceIssue] = useState('');
  const onVerifiedRef = useRef(onVerified);
  const onAccessStateChangeRef = useRef(onAccessStateChange);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const canContinueLimited =
    !siteKey ||
    widgetState.status === 'missing-config' ||
    widgetState.status === 'unavailable' ||
    Boolean(serviceIssue);

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    onAccessStateChangeRef.current = onAccessStateChange;
  }, [onAccessStateChange]);

  useEffect(() => {
    if (!sessionChecked) {
      onAccessStateChangeRef.current?.('verifying');
      return;
    }

    if (verified) {
      onAccessStateChangeRef.current?.('verified');
      return;
    }

    if (limitedMode) {
      onAccessStateChangeRef.current?.('limited');
      return;
    }

    onAccessStateChangeRef.current?.('blocked');
  }, [limitedMode, sessionChecked, verified]);

  useEffect(() => {
    let mounted = true;

    getTurnstileSessionStatus()
      .then((data) => {
        if (!mounted) return;
        setVerified(Boolean(data.verified));
        setSessionChecked(true);
        if (data.verified) {
          onVerifiedRef.current?.();
        }
      })
      .catch(() => {
        if (!mounted) return;
        setSessionChecked(true);
        setVerified(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!turnstileToken || verified || limitedMode) return;

    let cancelled = false;

    const verifyAccess = async () => {
      setIsSubmitting(true);
      setFeedback('');
      setServiceIssue('');

      try {
        await verifyTurnstileSiteAccess(turnstileToken);
        if (cancelled) return;
        setVerified(true);
        onVerifiedRef.current?.();
      } catch (error) {
        if (cancelled) return;
        setFeedback(getGateFeedbackMessage(error));
        setTurnstileToken('');
        setResetKey((value) => value + 1);

        if (error.status === 502 || error.status === 503 || error.status === 504) {
          setServiceIssue('Pemeriksaan akses sementara tidak tersedia. Anda tetap membuka situs dalam mode terbatas.');
        }
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
      }
    };

    verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [limitedMode, turnstileToken, verified]);

  if (verified || limitedMode) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Pemeriksaan Akses</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Situs ini menjalankan pemeriksaan akses keamanan singkat.
            </p>
          </div>
        </div>

        {!sessionChecked ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
            Memeriksa status akses...
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <TurnstileWidget
                siteKey={siteKey}
                resetKey={resetKey}
                onTokenChange={setTurnstileToken}
                onStatusChange={setWidgetState}
              />
            </div>

            {isSubmitting && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                Menyiapkan akses penuh...
              </div>
            )}

            {feedback && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {feedback}
              </div>
            )}

            {canContinueLimited && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-amber-200">Mode Terbatas Tersedia</div>
                    <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
                      {serviceIssue || widgetState.message || 'Pemeriksaan akses belum tersedia sepenuhnya di browser ini. Anda tetap bisa membuka situs dalam mode terbatas, tetapi beberapa fitur belum aktif.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback('');
                      setServiceIssue('');
                      setTurnstileToken('');
                      setResetKey((value) => value + 1);
                      setWidgetState({ status: siteKey ? 'loading' : 'missing-config', message: '' });
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitedMode(true)}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                  >
                    Buka Mode Terbatas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



