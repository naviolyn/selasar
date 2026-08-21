"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Fokus ke tombol batal saat dialog dibuka + tutup dengan tombol Escape
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm bg-white rounded-card border border-line shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <h2
          id="confirm-dialog-title"
          className="font-display text-lg font-semibold text-ink"
        >
          {title}
        </h2>

        {description && (
          <p className="text-sm text-ink/60 mt-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-full border border-line text-ink text-sm font-semibold py-2.5 hover:bg-forest-light transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-full text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60 ${
              isDanger
                ? "bg-clay hover:bg-clay/90"
                : "bg-forest hover:bg-forest-dark"
            }`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
