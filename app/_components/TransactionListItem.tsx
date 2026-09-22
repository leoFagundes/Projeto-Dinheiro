"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { Money } from "./Money";
import { TransactionFormSheet } from "./TransactionFormSheet";
import { categoryKey, FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function TransactionListItem({
  transaction,
  onDelete,
  colorByCategoria,
  iconByCategoria,
  bankNameById,
  originDateById,
}: {
  transaction: Transaction;
  onDelete: (id: string) => Promise<void>;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  bankNameById: Map<string, string>;
  /**
   * Data (yyyy-MM-dd) do template original, indexada pelo id do template —
   * só usada quando essa transação é uma instância gerada dele
   * (`recorrenteOrigemId`), pra deixar claro "desde quando" a assinatura
   * existe em vez de só dizer "recorrente".
   */
  originDateById?: Map<string, string>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const signedValue =
    transaction.tipo === "receita" ? transaction.valor : -transaction.valor;
  const categoriaKey = categoryKey(transaction.tipo, transaction.categoria);
  const categoriaColor = colorByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_COLOR;
  const categoriaIcon = iconByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_ICON;
  const bancoNome = transaction.bancoId ? bankNameById.get(transaction.bancoId) : undefined;
  const isRecorrenteOriginal = transaction.recorrente && !transaction.recorrenteOrigemId;
  const origemData = transaction.recorrenteOrigemId
    ? originDateById?.get(transaction.recorrenteOrigemId)
    : undefined;

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await onDelete(transaction.id);
      toast.success("Transação excluída.");
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
        <div className="flex items-center justify-between gap-3 rounded-card bg-surface shadow-card px-4 py-3">
          <button
            onClick={() => setEditing(true)}
            aria-label="Editar transação"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
              style={{ backgroundColor: `${categoriaColor}22` }}
            >
              {categoriaIcon}
            </span>
            <span className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.descricao}</p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
                {transaction.categoria} · {formatDate(transaction.data)}
                {isRecorrenteOriginal ? " · assinatura (original)" : ""}
                {transaction.recorrenteOrigemId
                  ? ` · assinatura${origemData ? ` desde ${formatDate(origemData)}` : ""}`
                  : ""}
                {transaction.parcelaTotal
                  ? ` · parcela ${transaction.parcelaAtual}/${transaction.parcelaTotal}`
                  : ""}
                {bancoNome && (
                  <span className="rounded-full bg-bg px-1.5 py-0.5 text-[11px]">
                    {bancoNome}
                    {transaction.formaPagamento === "debito" ? " · débito" : ""}
                  </span>
                )}
              </p>
            </span>
            <Pencil size={13} className="shrink-0 text-ink-muted/50" />
          </button>
          <div className="flex shrink-0 items-center gap-3">
            <Money value={signedValue} showSign className="text-sm font-medium" />
            <button
              onClick={() => setConfirming(true)}
              disabled={deleting}
              aria-label="Excluir transação"
              className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <TransactionFormSheet
        open={editing}
        onClose={() => setEditing(false)}
        transaction={transaction}
      />

      <ConfirmDialog
        open={confirming}
        title="Excluir transação?"
        description={`"${transaction.descricao}" será removida permanentemente.`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
