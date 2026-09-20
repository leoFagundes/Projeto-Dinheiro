"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  PiggyBank,
  Receipt,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/derived";

const ICON_BY_TIPO = {
  transferencia: ArrowLeftRight,
  transferencia_caixinha: ArrowLeftRight,
  pagamento_fatura: Receipt,
  ajuste_fatura: SlidersHorizontal,
  caixinha: PiggyBank,
  investimento: TrendingUp,
} as const;

/** Linha pras movimentações que não são transações — só dá pra excluir (desfaz o efeito nos saldos), não editar. */
export function HistoryEntryRow({ entry }: { entry: HistoryEntry }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const Icon = ICON_BY_TIPO[entry.tipo as keyof typeof ICON_BY_TIPO] ?? ArrowLeftRight;
  const signedValue =
    entry.direcao === "positivo" ? entry.valor : entry.direcao === "negativo" ? -entry.valor : 0;

  async function handleConfirmDelete() {
    if (!entry.onDelete) return;
    setDeleting(true);
    try {
      await entry.onDelete();
      toast.success("Excluído.");
    } catch {
      toast.error("Não foi possível excluir.");
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
      >
        <div className="flex items-center justify-between gap-3 rounded-card bg-surface px-4 py-3">
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-ink-muted">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{entry.titulo}</p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                {formatDate(entry.data)}
                {entry.detalhe ? ` · ${entry.detalhe}` : ""}
              </p>
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-3">
            {entry.direcao === "neutro" ? (
              <span className="text-sm font-medium text-ink-muted">
                {formatCurrency(entry.valor)}
              </span>
            ) : (
              <span
                className={`text-sm font-medium ${signedValue < 0 ? "text-negative" : "text-accent-strong"}`}
              >
                {signedValue >= 0 ? "+" : ""}
                {formatCurrency(signedValue)}
              </span>
            )}
            {entry.onDelete && (
              <button
                onClick={() => setConfirming(true)}
                disabled={deleting}
                aria-label="Excluir"
                className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirming}
        title="Excluir este item?"
        description="Desfaz exatamente o que ele alterou nos saldos envolvidos (banco, caixinha ou investimento)."
        confirmLabel="Excluir"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
