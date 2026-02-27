"use client";

interface WelcomeToastProps {
  toast: { message: string; isError?: boolean } | null;
}

export default function WelcomeToast({ toast }: WelcomeToastProps) {
  if (!toast) return null;
  return (
    <div className={`welcome-toast${toast.isError ? " toast-error" : ""}`}>
      {toast.isError ? "✕" : "✓"} {toast.message}
    </div>
  );
}
