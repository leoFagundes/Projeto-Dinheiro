"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDismissable } from "@/lib/use-dismissable";

export type ChoiceOption = {
  id: string;
  label: string;
  description?: string;
};

/** Como o ConfirmDialog, mas com várias saídas — cada opção explica o que vai acontecer. */
export function ChoiceDialog({
  open,
  title,
  description,
  options,
  onChoose,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  options: ChoiceOption[];
  onChoose: (id: string) => void;
  onCancel: () => void;
}) {
  useDismissable(open, onCancel);

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
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
            <div className="mt-4 flex flex-col gap-2">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onChoose(option.id)}
                  className="rounded-2xl border border-border px-4 py-3 text-left transition-colors active:scale-[0.99] hover:border-negative hover:bg-negative-soft"
                >
                  <span className="block text-sm font-medium text-negative">{option.label}</span>
                  {option.description && (
                    <span className="mt-0.5 block text-xs text-ink-muted">{option.description}</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={onCancel}
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-ink-muted transition-transform active:scale-95 hover:bg-bg"
            >
              Cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
