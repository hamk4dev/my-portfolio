'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

import TurnstileWidget from '@/components/TurnstileWidget';
import { getTurnstileSessionStatus, verifyTurnstileSiteAccess } from '@/services/api';

function getGateFeedbackMessage(error) {
  if (error?.status === 429) {
    return 'Percobaan terlalu sering. Coba lagi beberapa saat lagi.';
  }

  if (error?.status === 502 || error?.status === 503 || error?.status === 504) {
    return 'Pemeriksaan akses sedang sibuk. Anda bisa mencoba lagi atau melanjutkan dengan mode terbatas.';
  }

  if (error?.status === 403) {
    return 'Verifikasi belum dapat dikonfirmasi. Silakan muat ulang pemeriksaan akses.';
  }

  return 'Pemeriksaan akses belum berhasil. Silakan coba lagi.';
}

function isServiceIssue(error) {
  return (
    error?.status === 502 ||
    error?.status === 503 ||
    error?.status === 504 ||
    [
      'turnstile-missing-secret',
      'turnstile-session-unavailable',
      'turnstile-unreachable',
      'turnstile-timeout',
      'turnstile-invalid-response',
    ].includes(error?.code)
  );
}

export default function GlobalTurnstileGate({ onVerified, onAccessStateChange, reopenSignal = 0 }) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [limitedMode, setLimitedMode] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [widgetState, setWidgetState] = useState({ status: 'idle', message: '' });
  const [serviceIssue, setServiceIssue] = useState('');
  const [manualRetryRequired, setManualRetryRequired] = useState(false);
  const onVerifiedRef = useRef(onVerified);
  const onAccessStateChangeRef = useRef(onAccessStateChange);
  const reopenSignalRef = useRef(reopenSignal);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const canContinueLimited =
    !siteKey ||
    widgetState.status === 'missing-config' ||
    widgetState.status === 'unavailable' ||
    Boolean(serviceIssue);
  const showActionPanel = manualRetryRequired || canContinueLimited;

  const resetVerification = () => {
    setFeedback('');
    setServiceIssue('');
    setTurnstileToken('');
    setManualRetryRequired(false);
    setResetKey((value) => value + 1);
    setWidgetState({ status: siteKey ? 'loading' : 'missing-config', message: '' });
  };

  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    onAccessStateChangeRef.current = onAccessStateChange;
  }, [onAccessStateChange]);

  useEffect(() => {
    if (reopenSignalRef.current === reopenSignal) {
      return;
    }

    reopenSignalRef.current = reopenSignal;

    if (verified) {
      return;
    }

    setLimitedMode(false);
    resetVerification();
  }, [reopenSignal, verified]);

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
    if (!turnstileToken || verified || limitedMode || manualRetryRequired) return;

    let cancelled = false;

    const verifyAccess = async () => {
      setIsSubmitting(true);
      setFeedback('');
      setServiceIssue('');

      try {
        await verifyTurnstileSiteAccess(turnstileToken);
        if (cancelled) return;
        setVerified(true);
        setManualRetryRequired(false);
        onVerifiedRef.current?.();
      } catch (error) {
        if (cancelled) return;

        setFeedback(getGateFeedbackMessage(error));
        setTurnstileToken('');
        setManualRetryRequired(true);

        if (isServiceIssue(error)) {
          setServiceIssue('Pemeriksaan akses penuh di server sedang tidak tersedia. Anda bisa mencoba lagi nanti atau melanjutkan dengan mode terbatas.');
          return;
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
  }, [limitedMode, manualRetryRequired, turnstileToken, verified]);

  if (verified || limitedMode) return null;

  return (
    <div className="portofolio-modal-overlay portofolio-gate fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md">
      <div className="portofolio-surface-theme portofolio-gate-card w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Pemeriksaan Akses</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Situs ini menjalankan pemeriksaan akses keamanan singkat sebelum akses penuh dibuka.
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

            {showActionPanel && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-amber-200">
                      {canContinueLimited ? 'Mode Terbatas Tersedia' : 'Pemeriksaan Perlu Diulang'}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
                      {serviceIssue ||
                        widgetState.message ||
                        'Pemeriksaan akses perlu dijalankan ulang sebelum akses penuh dibuka.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetVerification}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Coba Lagi
                  </button>
                  {canContinueLimited && (
                    <button
                      type="button"
                      onClick={() => setLimitedMode(true)}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                    >
                      Buka Mode Terbatas
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
