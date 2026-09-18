"use client";

import { AnimatePresence, motion } from "motion/react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-card bg-surface p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.16 }}
          >
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-ink-muted">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-xl px-4 py-2 text-sm text-ink-muted transition-transform active:scale-95 hover:bg-bg"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 ${
                  danger
                    ? "bg-negative hover:opacity-90"
                    : "bg-accent hover:bg-accent-strong"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
