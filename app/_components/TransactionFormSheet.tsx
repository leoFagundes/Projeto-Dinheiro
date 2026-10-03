"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useSeenFeature } from "@/lib/use-seen-feature";
import { formatCurrency, todayIsoDate } from "@/lib/format";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { BottomSheet } from "./BottomSheet";
import { CurrencyInput } from "./CurrencyInput";
import { ConfirmDialog } from "./ConfirmDialog";
import { NewBadge } from "./NewBadge";
import { CategoryCreateSheet } from "./CategoryCreateForm";
import type { Transaction, TransactionType } from "@/lib/types";

/**
 * "Empréstimo" é um modo de criação à parte (gera receita + parcelas de uma
 * vez, ver addLoan) — não existe como `tipo` de verdade no Firestore, então
 * nunca aparece ao editar uma transação já salva.
 */
type Modo = TransactionType | "emprestimo";

type FormState = {
  modo: Modo;
  valor: number;
  categoriaEscolhida: string;
  descricao: string;
  data: string;
  recorrente: boolean;
  recorrenteFim: string;
  recorrenciaIntervalo: "mensal" | "anual";
  parcelar: boolean;
  numParcelas: string;
  parcelaInicial: string;
  valorTotalPagar: number;
  numParcelasEmprestimo: string;
  dataPrimeiraParcela: string;
};

function emptyForm(): FormState {
  const hoje = todayIsoDate();
  return {
    modo: "despesa",
    valor: 0,
    categoriaEscolhida: "",
    descricao: "",
    data: hoje,
    recorrente: false,
    recorrenteFim: "",
    recorrenciaIntervalo: "mensal",
    parcelar: false,
    numParcelas: "2",
    parcelaInicial: "1",
    valorTotalPagar: 0,
    numParcelasEmprestimo: "2",
    dataPrimeiraParcela: hoje,
  };
}

function formFromTransaction(t: Transaction): FormState {
  return {
    ...emptyForm(),
    modo: t.tipo,
    valor: t.valor,
    categoriaEscolhida: t.categoria,
    descricao: t.descricao,
    data: t.data,
    recorrente: t.recorrente,
    recorrenteFim: t.recorrenteFim ?? "",
    recorrenciaIntervalo: t.recorrenciaIntervalo ?? "mensal",
  };
}

function isFormDirty(form: FormState): boolean {
  const vazio = emptyForm();
  return (
    form.modo !== vazio.modo ||
    form.valor > 0 ||
    form.descricao.trim() !== "" ||
    form.categoriaEscolhida !== "" ||
    form.data !== vazio.data ||
    form.recorrente ||
    form.parcelar ||
    form.valorTotalPagar > 0
  );
}

// Rascunho de uma transação NOVA (nunca de edição), por conta — sobrevive a
// fechar o modal e até a fechar o app (ex: sair pra conferir um valor no app
// do banco e voltar). Só some ao salvar com sucesso ou tocar em "Limpar".
const DRAFT_KEY_PREFIX = "rascunhoTransacao:";

function loadDraft(uid: string): FormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY_PREFIX + uid);
    if (!raw) return null;
    const { form, salvoEm } = JSON.parse(raw) as { form: Partial<FormState>; salvoEm: string };
    const restaurado = { ...emptyForm(), ...form };
    const hoje = todayIsoDate();
    if (salvoEm === hoje) return restaurado;
    // Rascunho de outro dia: data que ainda estava em "hoje" daquele dia
    // (provavelmente nunca foi mexida) acompanha o dia de hoje.
    return {
      ...restaurado,
      data: restaurado.data === salvoEm ? hoje : restaurado.data,
      dataPrimeiraParcela:
        restaurado.dataPrimeiraParcela === salvoEm ? hoje : restaurado.dataPrimeiraParcela,
    };
  } catch {
    return null;
  }
}

function saveDraft(uid: string, form: FormState) {
  try {
    if (isFormDirty(form)) {
      localStorage.setItem(DRAFT_KEY_PREFIX + uid, JSON.stringify({ form, salvoEm: todayIsoDate() }));
    } else {
      localStorage.removeItem(DRAFT_KEY_PREFIX + uid);
    }
  } catch {
    // armazenamento indisponível (ex: navegação privada) — só não guarda rascunho
  }
}

function clearDraft(uid: string) {
  try {
    localStorage.removeItem(DRAFT_KEY_PREFIX + uid);
  } catch {
    // idem
  }
}

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
  const { user } = useAuth();
  const {
    addTransaction,
    addInstallmentPurchase,
    addLoan,
    updateTransaction,
    cancelRemainingInstallments,
  } = useTransactions();
  const { categories, byType: categoriesByType, addCategory } = useCategories();
  const { seen: seenEmprestimo, markSeen: markEmprestimoSeen } = useSeenFeature("aba-emprestimo");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCancelParcelas, setConfirmingCancelParcelas] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const isEditing = transaction !== undefined;
  const draftKey = !isEditing && user ? user.uid : null;
  const [form, setForm] = useState<FormState>(() => {
    if (transaction) return formFromTransaction(transaction);
    return (draftKey ? loadDraft(draftKey) : null) ?? emptyForm();
  });
  const [draftRestaurado, setDraftRestaurado] = useState(() => !isEditing && isFormDirty(form));

  useEffect(() => {
    if (draftKey) saveDraft(draftKey, form);
  }, [draftKey, form]);

  function update(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const isRecurringChild = isEditing && Boolean(transaction?.recorrenteOrigemId);
  // O próprio template de uma assinatura (não uma instância gerada dele) —
  // editar valor/categoria aqui também muda as próximas cobranças ainda não
  // geradas, já que elas copiam esses campos do template na hora de gerar.
  // Sem avisar isso, parecia um ajuste só daquele mês.
  const isRecurringTemplate = isEditing && Boolean(transaction?.recorrente) && !isRecurringChild;

  const { modo, valor, descricao, data, recorrente, recorrenteFim, recorrenciaIntervalo, parcelar } = form;
  const tipo: TransactionType = modo === "emprestimo" ? "despesa" : modo;
  const categoriaOptions = [...categoriesByType(tipo)].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  // Deriva a categoria efetivamente selecionada em vez de sincronizar via
  // efeito: se a escolha anterior não existe nesta lista, cai na primeira.
  const categoria = categoriaOptions.some((c) => c.nome === form.categoriaEscolhida)
    ? form.categoriaEscolhida
    : (categoriaOptions[0]?.nome ?? "");

  // Parcelamento só faz sentido para uma despesa nova.
  const podeParcelar = !isEditing && modo === "despesa";
  const parcelasCount = Math.min(24, Math.max(2, Math.round(Number(form.numParcelas)) || 2));
  const parcelaInicialCount = Math.min(
    parcelasCount,
    Math.max(1, Math.round(Number(form.parcelaInicial)) || 1),
  );

  // Empréstimo: valor recebido vira receita na hora; valor total a pagar
  // vira parcelas mensais.
  const isEmprestimo = !isEditing && modo === "emprestimo";
  const parcelasCountEmprestimo = Math.min(
    120,
    Math.max(1, Math.round(Number(form.numParcelasEmprestimo)) || 1),
  );

  function changeModo(next: Modo) {
    update(next === "despesa" ? { modo: next } : { modo: next, parcelar: false });
    if (next === "emprestimo") markEmprestimoSeen();
  }

  function handleReset() {
    setForm(emptyForm());
    setDraftRestaurado(false);
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
      toast.error("Crie uma categoria antes de continuar.");
      return;
    }
    if (isEmprestimo && (!form.valorTotalPagar || form.valorTotalPagar <= 0)) {
      toast.error("Informe o valor total a pagar do empréstimo.");
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
          recorrenteFim: recorrente ? recorrenteFim : "",
          recorrenciaIntervalo: recorrente ? recorrenciaIntervalo : "",
        });
        toast.success("Transação atualizada.");
      } else if (podeParcelar && parcelar) {
        await addInstallmentPurchase(
          { valorTotal: valor, categoria, descricao: descricao.trim(), data },
          parcelasCount,
          parcelaInicialCount,
        );
        toast.success(`Compra parcelada em ${parcelasCount}x.`);
      } else if (isEmprestimo) {
        await addLoan(
          {
            valorRecebido: valor,
            valorTotalPagar: form.valorTotalPagar,
            categoria,
            descricao: descricao.trim(),
            dataRecebimento: data,
            dataPrimeiraParcela: form.dataPrimeiraParcela,
          },
          parcelasCountEmprestimo,
        );
        toast.success(`Empréstimo registrado em ${parcelasCountEmprestimo}x.`);
      } else {
        await addTransaction({
          valor,
          tipo,
          categoria,
          descricao: descricao.trim(),
          data,
          recorrente,
          ...(recorrente && recorrenteFim ? { recorrenteFim } : {}),
          ...(recorrente && recorrenciaIntervalo === "anual" ? { recorrenciaIntervalo } : {}),
        });
        toast.success("Transação adicionada.");
      }
      if (draftKey) clearDraft(draftKey);
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
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{isEditing ? "Editar transação" : "Nova transação"}</p>
          {draftRestaurado && <p className="text-xs text-ink-muted">Rascunho restaurado</p>}
        </div>
        <div className="flex items-center gap-3">
          {!isEditing && isFormDirty(form) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-medium text-ink-muted transition-transform active:scale-95 hover:text-ink"
            >
              <RotateCcw size={13} />
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className={`grid gap-2 ${isEditing ? "grid-cols-2" : "grid-cols-3"}`}>
          <button
            type="button"
            onClick={() => changeModo("despesa")}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              modo === "despesa"
                ? "border-negative bg-negative-soft text-negative"
                : "border-border text-ink-muted"
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => changeModo("receita")}
            className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              modo === "receita"
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border text-ink-muted"
            }`}
          >
            Receita
          </button>
          {!isEditing && (
            <button
              type="button"
              onClick={() => changeModo("emprestimo")}
              className={`relative rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                modo === "emprestimo"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              Empréstimo
              {!seenEmprestimo && <NewBadge />}
            </button>
          )}
        </div>

        {isEmprestimo && (
          <p className="-mb-1 text-xs text-ink-muted">Valor que você vai receber agora</p>
        )}
        <CurrencyInput
          value={valor}
          onChange={(next) => update({ valor: next })}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        <input
          type="text"
          placeholder="Descrição"
          value={descricao}
          onChange={(event) => update({ descricao: event.target.value })}
          className="rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />

        <div>
          <p className="mb-1.5 text-xs text-ink-muted">Categoria</p>
          <div className="flex flex-wrap gap-1.5">
            {categoriaOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => update({ categoriaEscolhida: option.nome })}
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoria === option.nome
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-border text-ink-muted hover:bg-bg"
                }`}
              >
                <span aria-hidden>{option.icone ?? FALLBACK_CATEGORY_ICON}</span>
                {option.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreatingCategory(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
            >
              <Plus size={12} />
              Nova
            </button>
          </div>
        </div>

        {podeParcelar && (
          <div className="rounded-2xl bg-bg px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={parcelar}
                onChange={(event) => update({ parcelar: event.target.checked })}
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
                      value={form.numParcelas}
                      onChange={(event) => update({ numParcelas: event.target.value })}
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
                      value={form.parcelaInicial}
                      onChange={(event) => update({ parcelaInicial: event.target.value })}
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

        {isEmprestimo && (
          <div className="rounded-2xl bg-bg px-4 py-3">
            <p className="text-xs text-ink-muted">Valor total a pagar (com juros, se houver)</p>
            <CurrencyInput
              value={form.valorTotalPagar}
              onChange={(next) => update({ valorTotalPagar: next })}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
            <label className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
              Em
              <input
                type="number"
                min="1"
                max="120"
                value={form.numParcelasEmprestimo}
                onChange={(event) => update({ numParcelasEmprestimo: event.target.value })}
                className="w-16 rounded-xl border border-border bg-surface px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
              />
              parcelas mensais
            </label>
            <p className="mt-3 text-xs text-ink-muted">Data da 1ª parcela</p>
            <input
              type="date"
              value={form.dataPrimeiraParcela}
              onChange={(event) => update({ dataPrimeiraParcela: event.target.value })}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent"
            />
            <span className="mt-2 block text-xs text-ink-muted">
              {parcelasCountEmprestimo}x de{" "}
              {formatCurrency((form.valorTotalPagar || 0) / parcelasCountEmprestimo)} — uma por mês, a
              partir da data acima
            </span>
          </div>
        )}

        {isEmprestimo && (
          <p className="-mb-1 text-xs text-ink-muted">Data em que você recebeu o dinheiro</p>
        )}
        <input
          type="date"
          value={data}
          onChange={(event) => update({ data: event.target.value })}
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

        {parcelar || isEmprestimo ? null : isRecurringChild ? (
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
                onChange={(event) => update({ recorrente: event.target.checked })}
                className="size-4 accent-accent"
              />
              Repetir
            </label>
            {recorrente && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => update({ recorrenciaIntervalo: "mensal" })}
                    className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${
                      recorrenciaIntervalo === "mensal"
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-border text-ink-muted"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ recorrenciaIntervalo: "anual" })}
                    className={`rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${
                      recorrenciaIntervalo === "anual"
                        ? "border-accent bg-accent-soft text-accent-strong"
                        : "border-border text-ink-muted"
                    }`}
                  >
                    Anual
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-muted">
                  Repetir até (opcional)
                  <input
                    type="month"
                    value={recorrenteFim}
                    onChange={(event) => update({ recorrenteFim: event.target.value })}
                    className="rounded-xl border border-border px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {isRecurringTemplate && (
          <p className="rounded-2xl bg-bg px-4 py-3 text-xs text-ink-muted">
            Isso é o início de uma assinatura — mudar valor ou categoria aqui também muda as
            próximas cobranças ainda não geradas (elas copiam esses dados na hora de gerar). Se
            quiser corrigir só este mês sem afetar os próximos, use &ldquo;Ajustar&rdquo; na tela
            de Assinaturas.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
        >
          {isEditing ? "Salvar alterações" : "Salvar"}
        </button>
      </form>

      <CategoryCreateSheet
        open={creatingCategory}
        onClose={() => setCreatingCategory(false)}
        categories={categories}
        onCreate={addCategory}
        tipo={tipo}
        onCreated={(nome) => update({ categoriaEscolhida: nome })}
      />

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
