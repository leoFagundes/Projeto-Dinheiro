"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChoiceDialog } from "./ChoiceDialog";
import { Money } from "./Money";
import { TransactionFormSheet } from "./TransactionFormSheet";
import { useTransactions } from "@/lib/use-transactions";
import { opcoesDeExclusao, type OpcaoExclusao } from "@/lib/delete-options";
import { categoryKey, categoryTint, FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Transaction } from "@/lib/types";

const UNDO_TOAST_MS = 7000;

export function TransactionListItem({
  transaction,
  colorByCategoria,
  iconByCategoria,
  originDateById,
  hideDate = false,
}: {
  transaction: Transaction;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  /** Esconde a data na linha — pra listas que já agrupam por dia num cabeçalho. */
  hideDate?: boolean;
  /**
   * Data (yyyy-MM-dd) do template original, indexada pelo id do template —
   * só usada quando essa transação é uma instância gerada dele
   * (`recorrenteOrigemId`), pra deixar claro "desde quando" a assinatura
   * existe em vez de só dizer "recorrente".
   */
  originDateById?: Map<string, string>;
}) {
  const { transactions, deleteTransactions } = useTransactions();
  const [editing, setEditing] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcaoExclusao[] | null>(null);
  const signedValue = transaction.tipo === "receita" ? transaction.valor : -transaction.valor;
  const categoriaKey = categoryKey(transaction.tipo, transaction.categoria);
  const categoriaColor = colorByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_COLOR;
  const categoriaIcon = iconByCategoria.get(categoriaKey) ?? FALLBACK_CATEGORY_ICON;
  const isRecorrenteOriginal = transaction.recorrente && !transaction.recorrenteOrigemId;
  const origemData = transaction.recorrenteOrigemId
    ? originDateById?.get(transaction.recorrenteOrigemId)
    : undefined;

  /**
   * Exclui NA HORA (não existe mais exclusão agendada que dependia do app
   * continuar aberto por alguns segundos) — o "Desfazer" do aviso restaura
   * exatamente o que foi apagado.
   */
  function excluir(opcao: OpcaoExclusao) {
    const desfazer = deleteTransactions(opcao.itens, { encerrarAssinaturaId: opcao.encerrarAssinaturaId });
    toast.success(
      opcao.itens.length === 1 ? `"${transaction.descricao}" excluída` : `${opcao.itens.length} lançamentos excluídos`,
      { duration: UNDO_TOAST_MS, action: { label: "Desfazer", onClick: desfazer } },
    );
  }

  function handleDeleteClick() {
    // Avulsa: exclui direto. Parte de um grupo (parcela, empréstimo,
    // assinatura): pergunta o que exatamente apagar.
    const disponiveis = opcoesDeExclusao(transaction, transactions);
    if (disponiveis.length === 1) excluir(disponiveis[0]);
    else setOpcoes(disponiveis);
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
              style={{ backgroundColor: categoryTint(categoriaColor) }}
            >
              {categoriaIcon}
            </span>
            <span className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.descricao}</p>
              <p className="text-xs text-ink-muted">
                {transaction.categoria}
                {hideDate ? "" : ` · ${formatDate(transaction.data)}`}
                {isRecorrenteOriginal ? " · assinatura (original)" : ""}
                {transaction.recorrenteOrigemId
                  ? ` · assinatura${origemData ? ` desde ${formatDate(origemData)}` : ""}`
                  : ""}
                {transaction.parcelaTotal ? ` · parcela ${transaction.parcelaAtual}/${transaction.parcelaTotal}` : ""}
                {transaction.emprestimoId ? " · empréstimo" : ""}
              </p>
            </span>
            <Pencil size={13} className="shrink-0 text-ink-muted/50" />
          </button>
          <div className="flex shrink-0 items-center gap-3">
            <Money value={signedValue} showSign className="text-sm font-medium" />
            <button
              onClick={handleDeleteClick}
              aria-label="Excluir transação"
              className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <TransactionFormSheet open={editing} onClose={() => setEditing(false)} transaction={transaction} />

      <ChoiceDialog
        open={opcoes !== null}
        title={`Excluir "${transaction.descricao}"?`}
        description="Escolha o que apagar:"
        options={(opcoes ?? []).map(({ id, label, description }) => ({ id, label, description }))}
        onChoose={(id) => {
          const escolhida = opcoes?.find((o) => o.id === id);
          setOpcoes(null);
          if (escolhida) excluir(escolhida);
        }}
        onCancel={() => setOpcoes(null)}
      />
    </>
  );
}
