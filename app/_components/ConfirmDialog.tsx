"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useDismissable } from "@/lib/use-dismissable";

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
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  useDismissable(open, onCancel);
  const [busy, setBusy] = useState(false);

  // Trava os botões enquanto a ação roda (sem isso, dois toques rápidos
  // disparavam a ação duas vezes) e, se ela falhar sem tratar o erro por
  // conta própria, avisa — antes uma falha aqui passava em silêncio, e o
  // usuário ficava sem saber se tinha excluído ou não.
  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={busy ? undefined : onCancel}
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
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm text-ink-muted transition-transform active:scale-95 hover:bg-bg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-60 ${
                  danger ? "bg-negative hover:opacity-90" : "bg-accent hover:bg-accent-strong"
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
