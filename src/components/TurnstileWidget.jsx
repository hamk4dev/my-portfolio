'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const SCRIPT_TIMEOUT_MS = 10000;

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Pemeriksaan akses hanya tersedia di browser.'));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (window.__turnstileLoaderPromise) {
    return window.__turnstileLoaderPromise;
  }

  window.__turnstileLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-turnstile-script="true"]');
    const script = existingScript || document.createElement('script');

    let settled = false;
    let timeoutHandle;

    const cleanup = () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      window.clearTimeout(timeoutHandle);
    };

    const resolveWhenReady = () => {
      if (settled) return;

      if (window.turnstile) {
        settled = true;
        cleanup();
        resolve(window.turnstile);
        return;
      }

      window.setTimeout(resolveWhenReady, 100);
    };

    const handleLoad = () => {
      resolveWhenReady();
    };

    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      window.__turnstileLoaderPromise = null;
      reject(new Error('Pemeriksaan akses tidak dapat dimuat di browser ini.'));
    };

    timeoutHandle = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      window.__turnstileLoaderPromise = null;
      reject(new Error('Pemeriksaan akses tidak merespons tepat waktu.'));
    }, SCRIPT_TIMEOUT_MS);

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    if (!existingScript) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      document.head.appendChild(script);
    }

    resolveWhenReady();
  });

  return window.__turnstileLoaderPromise;
}

export default function TurnstileWidget({ siteKey, resetKey, onTokenChange, onStatusChange }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [status, setStatus] = useState(siteKey ? 'loading' : 'missing-config');
  const [message, setMessage] = useState(
    siteKey ? 'Menyiapkan pemeriksaan akses...' : 'Pemeriksaan akses belum tersedia di perangkat ini.'
  );

  useEffect(() => {
    if (!siteKey) {
      const missingMessage = 'Pemeriksaan akses belum tersedia di perangkat ini.';
      setStatus('missing-config');
      setMessage(missingMessage);
      onTokenChange('');
      onStatusChange?.({ status: 'missing-config', message: missingMessage });
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');
    setMessage('Menyiapkan pemeriksaan akses...');
    onStatusChange?.({ status: 'loading', message: '' });

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        containerRef.current.replaceChildren();
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenChange(token || ''),
          'expired-callback': () => onTokenChange(''),
          'error-callback': () => {
            const errorMessage = 'Pemeriksaan akses tidak dapat dijalankan di browser ini.';
            setStatus('unavailable');
            setMessage(errorMessage);
            onTokenChange('');
            onStatusChange?.({ status: 'unavailable', message: errorMessage });
          },
        });

        setStatus('ready');
        setMessage('');
        onStatusChange?.({ status: 'ready', message: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        const errorMessage = error.message || 'Pemeriksaan akses tidak dapat dimuat saat ini.';
        setStatus('unavailable');
        setMessage(errorMessage);
        onTokenChange('');
        onStatusChange?.({ status: 'unavailable', message: errorMessage });
      });

    return () => {
      cancelled = true;
      onTokenChange('');

      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [onStatusChange, onTokenChange, resetKey, siteKey]);

  return (
    <div className="space-y-3">
      {status === 'loading' && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
          {message}
        </div>
      )}

      {(status === 'missing-config' || status === 'unavailable') && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        </div>
      )}

      <div ref={containerRef} className={status === 'ready' ? 'min-h-[65px]' : 'hidden'} />
    </div>
  );
}
