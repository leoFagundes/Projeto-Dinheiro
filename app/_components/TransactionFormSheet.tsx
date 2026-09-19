"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { formatCurrency, todayIsoDate } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { BottomSheet } from "./BottomSheet";
import { CurrencyInput } from "./CurrencyInput";
import { ConfirmDialog } from "./ConfirmDialog";
import type { FormaPagamento, Transaction, TransactionType } from "@/lib/types";

export function TransactionFormSheet({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  /** Quando presente, o formulário edita esta transação em vez de criar uma nova. */
  transaction?: Transaction;
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <TransactionFormFields
        key={transaction?.id ?? "create"}
        transaction={transaction}
        onClose={onClose}
      />
    </BottomSheet>
  );
}

function TransactionFormFields({
  transaction,
  onClose,
}: {
  transaction?: Transaction;
  onClose: () => void;
}) {
  const { addTransaction, addInstallmentPurchase, updateTransaction, cancelRemainingInstallments } =
    useTransactions();
  const { byType: categoriesByType } = useCategories();
  const { banks } = useBanks();
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancelParcelas, setConfirmingCancelParcelas] = useState(false);

  const isEditing = transaction !== undefined;
  const isRecurringChild = isEditing && Boolean(transaction?.recorrenteOrigemId);

  const [tipo, setTipo] = useState<TransactionType>(transaction?.tipo ?? "despesa");
  const [valor, setValor] = useState(transaction?.valor ?? 0);
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(transaction?.categoria ?? "");
  const [bancoId, setBancoId] = useState(transaction?.bancoId ?? "");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(
    transaction?.formaPagamento ?? "credito",
  );
  const [descricao, setDescricao] = useState(transaction?.descricao ?? "");
  const [data, setData] = useState(transaction?.data ?? todayIsoDate());
  const [recorrente, setRecorrente] = useState(transaction?.recorrente ?? false);
  const [recorrenteFim, setRecorrenteFim] = useState(transaction?.recorrenteFim ?? "");
  const [parcelar, setParcelar] = useState(false);
  const [numParcelas, setNumParcelas] = useState("2");
  const [parcelaInicial, setParcelaInicial] = useState("1");

  const categoriaOptions = categoriesByType(tipo);
  // Deriva a categoria efetivamente selecionada em vez de sincronizar via
  // efeito: se a escolha anterior não existe mais nesta lista, cai na primeira.
  const categoria = categoriaOptions.some((c) => c.nome === categoriaEscolhida)
    ? categoriaEscolhida
    : categoriaOptions[0]?.nome ?? "";

  // Parcelamento só faz sentido para uma despesa nova, no crédito, vinculada a um banco.
  const podeParcelar =
    !isEditing && tipo === "despesa" && bancoId !== "" && formaPagamento === "credito";
  const parcelasCount = Math.min(24, Math.max(2, Math.round(Number(numParcelas)) || 2));
  const parcelaInicialCount = Math.min(
    parcelasCount,
    Math.max(1, Math.round(Number(parcelaInicial)) || 1),
  );

  function changeTipo(next: TransactionType) {
    setTipo(next);
    if (next !== "despesa") {
      setParcelar(false);
    }
  }

  function changeBanco(next: string) {
    setBancoId(next);
    if (!next) setParcelar(false);
  }

  function changeFormaPagamento(next: FormaPagamento) {
    setFormaPagamento(next);
    if (next === "debito") setParcelar(false);
  }

  function resetForm() {
    setValor(0);
    setDescricao("");
    setData(todayIsoDate());
    setRecorrente(false);
    setRecorrenteFim("");
    setParcelar(false);
    setNumParcelas("2");
    setParcelaInicial("1");
    setFormaPagamento("credito");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Informe uma descrição.");
      return;
    }
    if (!categoria) {
      toast.error("Cadastre uma categoria antes de continuar.");
      return;
    }

    setSubmitting(true);
    try {
      if (transaction) {
        await updateTransaction(transaction.id, {
          valor,
          tipo,
          categoria,
          descricao: descricao.trim(),
          data,
          recorrente,
          ...(recorrente && recorrenteFim ? { recorrenteFim } : {}),
          ...(bancoId ? (tipo === "despesa" ? { bancoId, formaPagamento } : { bancoId }) : {}),
        });
        toast.success("Transação atualizada.");
      } else if (podeParcelar && parcelar) {
        await addInstallmentPurchase(
          { valorTotal: valor, categoria, descricao: descricao.trim(), data, bancoId },
          parcelasCount,
          parcelaInicialCount,
        );
        toast.success(`Compra parcelada em ${parcelasCount}x.`);
      } else {
        await addTransaction({
          valor,
          tipo,
          categoria,
          descricao: descricao.trim(),
          data,
          recorrente,
          ...(recorrente && recorrenteFim ? { recorrenteFim } : {}),
          ...(bancoId ? (tipo === "despesa" ? { bancoId, formaPagamento } : { bancoId }) : {}),
        });
        toast.success("Transação adicionada.");
      }
      resetForm();
      onClose();
    } catch {
      toast.error("Não foi possível salvar a transação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStopRecurring() {
    if (!transaction) return;
    const templateId = transaction.recorrenteOrigemId ?? transaction.id;
    try {
      await updateTransaction(templateId, { recorrente: false });
      toast.success("Recorrência cancelada — os próximos meses não geram mais esta transação.");
      onClose();
    } catch {
      toast.error("Não foi possível cancelar a recorrência.");
    }
  }

  async function handleCancelRemaining() {
    if (!transaction?.compraId || !transaction.parcelaAtual) return;
    try {
      await cancelRemainingInstallments(transaction.compraId, transaction.parcelaAtual);
      toast.success("Parcelas restantes canceladas.");
      setConfirmingCancelParcelas(false);
      onClose();
    } catch {
      toast.error("Não foi possível cancelar as parcelas.");
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-medium">{isEditing ? "Editar transação" : "Nova transação"}</p>
        <button
          onClick={onClose}
          className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => changeTipo("despesa")}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              tipo === "despesa"
                ? "border-negative bg-negative-soft text-negative"
                : "border-border text-ink-muted"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => changeTipo("receita")}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              tipo === "receita"
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border text-ink-muted"
            }`}
          >
            Receita
          </button>
        </div>

        <CurrencyInput
          value={valor}
          onChange={setValor}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        <input
          type="text"
          placeholder="Descrição"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        {categoriaOptions.length > 0 ? (
          <select
            value={categoria}
            onChange={(event) => setCategoriaEscolhida(event.target.value)}
            className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          >
            {categoriaOptions.map((option) => (
              <option key={option.id} value={option.nome}>
                {option.icone ?? FALLBACK_CATEGORY_ICON} {option.nome}
              </option>
            ))}
          </select>
        ) : (
          <Link
            href="/configuracoes"
            onClick={onClose}
            className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-ink-muted hover:text-accent-strong"
          >
            Nenhuma categoria de {tipo} ainda — toque para criar uma
          </Link>
        )}

        {banks.length > 0 && (
          <select
            value={bancoId}
            onChange={(event) => changeBanco(event.target.value)}
            className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
          >
            <option value="">Sem banco vinculado</option>
            {banks.map((banco) => (
              <option key={banco.id} value={banco.id}>
                {banco.nome}
              </option>
            ))}
          </select>
        )}

        {tipo === "despesa" && bancoId !== "" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => changeFormaPagamento("credito")}
              className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                formaPagamento === "credito"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              Crédito
            </button>
            <button
              type="button"
              onClick={() => changeFormaPagamento("debito")}
              className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                formaPagamento === "debito"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              Débito
            </button>
          </div>
        )}

        {podeParcelar && (
          <div className="rounded-2xl bg-bg px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={parcelar}
                onChange={(event) => setParcelar(event.target.checked)}
                className="size-4 accent-accent"
              />
              Parcelar essa compra
            </label>
            {parcelar && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    Em
                    <input
                      type="number"
                      min="2"
                      max="24"
                      value={numParcelas}
                      onChange={(event) => setNumParcelas(event.target.value)}
                      className="w-16 rounded-xl border border-border bg-surface px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                    />
                    vezes
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    A partir da parcela
                    <input
                      type="number"
                      min="1"
                      max={parcelasCount}
                      value={parcelaInicial}
                      onChange={(event) => setParcelaInicial(event.target.value)}
                      className="w-14 rounded-xl border border-border bg-surface px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                    />
                  </label>
                </div>
                <span className="text-xs text-ink-muted">
                  {parcelasCount}x de {formatCurrency(valor / parcelasCount)} — lança da parcela{" "}
                  {parcelaInicialCount}/{parcelasCount} em diante
                </span>
              </div>
            )}
          </div>
        )}

        <input
          type="date"
          value={data}
          onChange={(event) => setData(event.target.value)}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        {transaction?.parcelaTotal && (
          <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3 text-sm text-ink-muted">
            <span>
              Parcela {transaction.parcelaAtual}/{transaction.parcelaTotal}
            </span>
            <button
              type="button"
              onClick={() => setConfirmingCancelParcelas(true)}
              className="text-negative transition-transform active:scale-95 hover:underline"
            >
              Cancelar restantes
            </button>
          </div>
        )}

        {parcelar ? null : isRecurringChild ? (
          <div className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3 text-sm text-ink-muted">
            Parte de uma recorrência
            <button
              type="button"
              onClick={handleStopRecurring}
              className="text-negative transition-transform active:scale-95 hover:underline"
            >
              Parar repetição
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 py-1 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(event) => setRecorrente(event.target.checked)}
                className="size-4 accent-accent"
              />
              Repetir todo mês
            </label>
            {recorrente && (
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                Repetir até (opcional)
                <input
                  type="month"
                  value={recorrenteFim}
                  onChange={(event) => setRecorrenteFim(event.target.value)}
                  className="rounded-xl border border-border px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                />
              </label>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          {isEditing ? "Salvar alterações" : "Salvar"}
        </button>
      </form>

      <ConfirmDialog
        open={confirmingCancelParcelas}
        title="Cancelar parcelas restantes?"
        description={`Esta e todas as próximas parcelas dessa compra (a partir de ${transaction?.parcelaAtual}/${transaction?.parcelaTotal}) serão excluídas.`}
        confirmLabel="Cancelar parcelas"
        danger
        onConfirm={handleCancelRemaining}
        onCancel={() => setConfirmingCancelParcelas(false)}
      />
    </>
  );
}
