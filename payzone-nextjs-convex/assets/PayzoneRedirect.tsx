"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface PayzoneRedirectProps {
  payload: string;
  signature: string;
  payzoneUrl: string;
  /**
   * Optional callback when redirect fails
   */
  onError?: (error: Error) => void;
  /**
   * Optional callback to go back to payment selection
   */
  onGoBack?: () => void;
  /**
   * Language for UI text
   * @default "fr"
   */
  lang?: "fr" | "ar" | "en";
}

type RedirectStatus = "loading" | "error" | "retrying";

const UI_TEXT = {
  fr: {
    title: "Redirection en cours...",
    subtitle: "Connexion sécurisée à PayZone. Veuillez patienter.",
    errorTitle: "Erreur de redirection",
    errorSubtitle: "Impossible de se connecter à PayZone. Veuillez réessayer.",
    retrying: "Nouvelle tentative...",
    goBack: "Retour",
    retry: "Réessayer",
  },
  ar: {
    title: "جاري التحويل...",
    subtitle: "الاتصال الآمن بـ PayZone. يرجى الانتظار.",
    errorTitle: "خطأ في التحويل",
    errorSubtitle: "تعذر الاتصال بـ PayZone. يرجى المحاولة مرة أخرى.",
    retrying: "محاولة جديدة...",
    goBack: "عودة",
    retry: "إعادة المحاولة",
  },
  en: {
    title: "Redirecting...",
    subtitle: "Secure connection to PayZone. Please wait.",
    errorTitle: "Redirect Error",
    errorSubtitle: "Unable to connect to PayZone. Please try again.",
    retrying: "Retrying...",
    goBack: "Go Back",
    retry: "Try Again",
  },
};

export function PayzoneRedirect({
  payload,
  signature,
  payzoneUrl,
  onError,
  onGoBack,
  lang = "fr",
}: PayzoneRedirectProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<RedirectStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const text = UI_TEXT[lang];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

    const attemptSubmit = () => {
      if (!isSubscribed) return;

      try {
        if (!formRef.current) {
          throw new Error("Form reference not available");
        }

        // Validate form has required fields
        const payloadInput = formRef.current.querySelector('input[name="payload"]') as HTMLInputElement;
        const signatureInput = formRef.current.querySelector('input[name="signature"]') as HTMLInputElement;

        if (!payloadInput?.value || !signatureInput?.value) {
          throw new Error("Missing payload or signature");
        }

        // Attempt form submission
        formRef.current.submit();

        // If we get here without error, submission was initiated
        // Note: We can't detect if the navigation actually succeeded
        // because the browser leaves the page
      } catch (err) {
        if (!isSubscribed) return;

        const error = err instanceof Error ? err : new Error("Unknown error during redirect");
        setError(error);
        setStatus("error");
        onError?.(error);

        // Auto-retry if under max retries
        if (retryCount < maxRetries) {
          setStatus("retrying");
          timeoutId = setTimeout(() => {
            if (isSubscribed) {
              setRetryCount((prev) => prev + 1);
              setStatus("loading");
              attemptSubmit();
            }
          }, 2000 * (retryCount + 1)); // Exponential backoff
        }
      }
    };

    // Start submission after a short delay to ensure form is rendered
    timeoutId = setTimeout(attemptSubmit, 100);

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [payload, signature, payzoneUrl, onError, retryCount]);

  const handleRetry = () => {
    setError(null);
    setStatus("loading");
    setRetryCount(0);
  };

  const isError = status === "error";
  const isRetrying = status === "retrying";
  const showSpinner = status === "loading" || isRetrying;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="flex max-w-md flex-col items-center space-y-6 px-4">
        {/* Loading Spinner */}
        {showSpinner && (
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-800 border-t-purple-600"></div>
            {isRetrying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            )}
          </div>
        )}

        {/* Error Icon */}
        {isError && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        )}

        {/* Text Content */}
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {isError ? text.errorTitle : isRetrying ? text.retrying : text.title}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {isError ? text.errorSubtitle : text.subtitle}
          </p>
          {isError && error && process.env.NODE_ENV === "development" && (
            <p className="mt-2 text-xs text-red-400">{error.message}</p>
          )}
        </div>

        {/* Error Actions */}
        {isError && (
          <div className="flex gap-3">
            {onGoBack && (
              <button
                onClick={onGoBack}
                className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {text.goBack}
              </button>
            )}
            {retryCount < maxRetries && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4" />
                {text.retry}
              </button>
            )}
          </div㸀3e
        )}
      </div>

      {/* Hidden Form for POST Handoff */}
      <form ref={formRef} method="POST" action={payzoneUrl} className="hidden">
        <input type="hidden" name="payload" value={payload} />
        <input type="hidden" name="signature" value={signature} />
      </form>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 left-4 max-w-sm rounded bg-zinc-900 p-4 text-xs text-zinc-500">
          <div>Status: {status}</div>
          <div>Retry: {retryCount}/{maxRetries}</div>
          <div>URL: {payzoneUrl}</div>
          <div className="mt-2 truncate">Payload length: {payload.length} chars</div>
        </div>
      )}
    </div>
  );
}
