"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Repeat, Trash2 } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import {
  computeActiveSubscriptions,
  computeNextChargeDate,
  computeStoppedSubscriptions,
  computeSubscriptionTotalSpent,
} from "@/lib/derived";
import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  formatDate,
  formatMonthLabel,
  monthKeyOfIsoDate,
} from "@/lib/format";
import { categoryKey, FALLBACK_CATEGORY_ICON, mapCategoryIcons } from "@/lib/categories";
import { PageFade } from "@/app/_components/PageFade";
import { EmptyState } from "@/app/_components/EmptyState";
import { MaskedCurrency } from "@/app/_components/Money";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { CurrencyInput } from "@/app/_components/CurrencyInput";
import { TransactionFormSheet } from "@/app/_components/TransactionFormSheet";
import { INPUT_CLASS, SAVE_BUTTON_CLASS } from "@/app/_components/SettingsFormKit";
import type { Bank, Category, FormaPagamento, Transaction } from "@/lib/types";

type OrdemAssinatura = "valor" | "dia";

export default function AssinaturasPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { banks } = useBanks();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [stopping, setStopping] = useState<Transaction | null>(null);
  const [removing, setRemoving] = useState<Transaction | null>(null);
  const [adjusting, setAdjusting] = useState<Transaction | null>(null);
  const [ordem, setOrdem] = useState<OrdemAssinatura>("valor");

  const assinaturas = [...computeActiveSubscriptions(transactions)].sort((a, b) =>
    ordem === "dia" ? Number(a.data.slice(8, 10)) - Number(b.data.slice(8, 10)) : b.valor - a.valor,
  );
  const paradas = computeStoppedSubscriptions(transactions);
  const totalMensal = assinaturas
    .filter((t) => t.tipo === "despesa" && t.recorrenciaIntervalo !== "anual")
    .reduce((sum, t) => sum + t.valor, 0);
  const totalAnual = assinaturas
    .filter((t) => t.tipo === "despesa" && t.recorrenciaIntervalo === "anual")
    .reduce((sum, t) => sum + t.valor, 0);
  const iconByCategoria = mapCategoryIcons(categories);
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));

  async function handleStop() {
    if (!stopping) return;
    try {
      await updateTransaction(stopping.id, { recorrente: false });
      toast.success("Assinatura parada — não gera mais cobrança nos próximos meses.");
      setStopping(null);
    } catch {
      toast.error("Não foi possível parar essa assinatura.");
    }
  }

  async function handleReactivate(id: string) {
    try {
      await updateTransaction(id, { recorrente: true, recorrenteFim: "" });
      toast.success("Assinatura reativada.");
    } catch {
      toast.error("Não foi possível reativar essa assinatura.");
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await deleteTransaction(removing.id);
      toast.success("Assinatura excluída.");
      setRemoving(null);
    } catch {
      toast.error("Não foi possível excluir essa assinatura.");
    }
  }

  async function handleAdjust(params: {
    valor: number;
    categoria: string;
    descricao: string;
    bancoId?: string;
    formaPagamento?: FormaPagamento;
    recorrenciaIntervalo: "mensal" | "anual";
    mesInicio: string;
  }) {
    if (!adjusting) return;
    await updateTransaction(adjusting.id, { recorrente: false });
    const day = clampDayToMonth(params.mesInicio, Number(adjusting.data.slice(8, 10)));
    await addTransaction({
      valor: params.valor,
      tipo: adjusting.tipo,
      categoria: params.categoria,
      descricao: params.descricao,
      data: `${params.mesInicio}-${day}`,
      recorrente: true,
      ...(params.recorrenciaIntervalo === "anual" ? { recorrenciaIntervalo: "anual" } : {}),
      ...(params.bancoId
        ? adjusting.tipo === "despesa"
          ? { bancoId: params.bancoId, formaPagamento: params.formaPagamento ?? "credito" }
          : { bancoId: params.bancoId }
        : {}),
    });
  }

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Repeat size={20} className="text-accent-strong" />
          Assinaturas
        </h1>

        {assinaturas.length === 0 && paradas.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nada recorrente por aqui"
            description='Marque "Repetir" ao criar uma transação pra ela aparecer nesta lista.'
          />
        ) : (
          <>
            {(totalMensal > 0 || totalAnual > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 rounded-card bg-surface shadow-card p-4 text-xs text-ink-muted">
                {totalMensal > 0 && (
                  <span>
                    Por mês:{" "}
                    <span className="font-medium text-negative">
                      <MaskedCurrency value={totalMensal} />
                    </span>
                  </span>
                )}
                {totalAnual > 0 && (
                  <span>
                    Por ano:{" "}
                    <span className="font-medium text-negative">
                      <MaskedCurrency value={totalAnual} />
                    </span>
                  </span>
                )}
              </div>
            )}

            {assinaturas.length > 0 && (
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setOrdem("valor")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    ordem === "valor" ? "bg-accent-soft text-accent-strong" : "text-ink-muted hover:bg-bg"
                  }`}
                >
                  Por valor
                </button>
                <button
                  onClick={() => setOrdem("dia")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    ordem === "dia" ? "bg-accent-soft text-accent-strong" : "text-ink-muted hover:bg-bg"
                  }`}
                >
                  Por dia de cobrança
                </button>
              </div>
            )}

            <ul className="flex flex-col gap-2 text-sm">
              {assinaturas.map((t) => {
                const proximaCobranca = computeNextChargeDate(t, transactions);
                const totalGasto = computeSubscriptionTotalSpent(t, transactions);
                return (
                  <li key={t.id} className="rounded-card bg-surface shadow-card px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditing(t)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="shrink-0">
                          {iconByCategoria.get(categoryKey(t.tipo, t.categoria)) ?? FALLBACK_CATEGORY_ICON}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">
                            {t.descricao}
                            {t.recorrenciaIntervalo === "anual" && (
                              <span className="ml-1.5 rounded-full bg-bg px-1.5 py-0.5 text-[10px] text-ink-muted">
                                anual
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            <MaskedCurrency value={t.valor} /> · dia {Number(t.data.slice(8, 10))}
                            {t.bancoId && bankNameById.get(t.bancoId) ? ` · ${bankNameById.get(t.bancoId)}` : ""}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {proximaCobranca ? `próxima: ${formatDate(proximaCobranca)}` : "sem próxima cobrança"}
                            {totalGasto > 0 && (
                              <>
                                {" "}
                                · já gasto: <MaskedCurrency value={totalGasto} />
                              </>
                            )}
                            {t.recorrenteFim ? ` · até ${formatMonthLabel(t.recorrenteFim)}` : ""}
                          </span>
                        </span>
                      </button>
                    </div>
                    <div className="mt-1.5 flex justify-end gap-3">
                      <button
                        onClick={() => setAdjusting(t)}
                        className="text-xs font-medium text-accent-strong transition-transform active:scale-95 hover:underline"
                      >
                        Ajustar
                      </button>
                      <button
                        onClick={() => setStopping(t)}
                        className="text-xs font-medium text-negative transition-transform active:scale-95 hover:underline"
                      >
                        Parar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {paradas.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">Pausadas</p>
                <ul className="flex flex-col gap-2 text-sm">
                  {paradas.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 rounded-card bg-surface shadow-card px-4 py-3 opacity-70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{t.descricao}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          <MaskedCurrency value={t.valor} />
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <button
                          onClick={() => handleReactivate(t.id)}
                          className="text-xs font-medium text-accent-strong transition-transform active:scale-95 hover:underline"
                        >
                          Reativar
                        </button>
                        <button
                          onClick={() => setRemoving(t)}
                          aria-label="Excluir assinatura"
                          className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionFormSheet open={editing !== null} onClose={() => setEditing(null)} transaction={editing ?? undefined} />

      <AjustarAssinaturaSheet
        assinatura={adjusting}
        transactions={transactions}
        categories={categories}
        banks={banks}
        onAdjust={handleAdjust}
        onClose={() => setAdjusting(null)}
      />

      <ConfirmDialog
        open={stopping !== null}
        title="Parar assinatura?"
        description={`"${stopping?.descricao}" para de gerar cobrança nos próximos meses. O histórico já lançado continua igual, e ela fica disponível pra reativar depois.`}
        confirmLabel="Parar"
        danger
        onConfirm={handleStop}
        onCancel={() => setStopping(null)}
      />

      <ConfirmDialog
        open={removing !== null}
        title="Excluir assinatura?"
        description={`"${removing?.descricao}" será removida do histórico. Meses já gerados por ela continuam lá, só deixam de estar ligados a essa assinatura.`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </PageFade>
  );
}

/**
 * Ajusta os termos de uma assinatura ativa (valor, categoria, banco...) sem
 * mexer no que já passou: por baixo dos panos, para a assinatura antiga e
 * cria uma nova a partir do mês escolhido — os meses já gerados continuam
 * com o valor de antes.
 */
function AjustarAssinaturaSheet({
  assinatura,
  transactions,
  categories,
  banks,
  onAdjust,
  onClose,
}: {
  assinatura: Transaction | null;
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onAdjust: (params: {
    valor: number;
    categoria: string;
    descricao: string;
    bancoId?: string;
    formaPagamento?: FormaPagamento;
    recorrenciaIntervalo: "mensal" | "anual";
    mesInicio: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={assinatura !== null} onClose={onClose}>
      {assinatura && (
        <AjustarAssinaturaFields
          key={assinatura.id}
          assinatura={assinatura}
          transactions={transactions}
          categories={categories}
          banks={banks}
          onAdjust={onAdjust}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function AjustarAssinaturaFields({
  assinatura,
  transactions,
  categories,
  banks,
  onAdjust,
  onClose,
}: {
  assinatura: Transaction;
  transactions: Transaction[];
  categories: Category[];
  banks: Bank[];
  onAdjust: (params: {
    valor: number;
    categoria: string;
    descricao: string;
    bancoId?: string;
    formaPagamento?: FormaPagamento;
    recorrenciaIntervalo: "mensal" | "anual";
    mesInicio: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const thisMonth = currentMonthKey();
  const jaTemEsteMes =
    monthKeyOfIsoDate(assinatura.data) === thisMonth ||
    transactions.some(
      (t) => t.recorrenteOrigemId === assinatura.id && monthKeyOfIsoDate(t.data) === thisMonth,
    );
  const mesInicioPadrao = jaTemEsteMes ? addMonthsToKey(thisMonth, 1) : thisMonth;

  const [valor, setValor] = useState(assinatura.valor);
  const [descricao, setDescricao] = useState(assinatura.descricao);
  const [categoria, setCategoria] = useState(assinatura.categoria);
  const [bancoId, setBancoId] = useState(assinatura.bancoId ?? "");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(
    assinatura.formaPagamento ?? "credito",
  );
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState<"mensal" | "anual">(
    assinatura.recorrenciaIntervalo ?? "mensal",
  );
  const [mesInicio, setMesInicio] = useState(mesInicioPadrao);
  const [saving, setSaving] = useState(false);

  const categoriaOptions = categories.filter((c) => c.tipo === assinatura.tipo);

  async function handleSave() {
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Informe uma descrição.");
      return;
    }
    setSaving(true);
    try {
      await onAdjust({
        valor,
        categoria,
        descricao: descricao.trim(),
        bancoId: bancoId || undefined,
        formaPagamento,
        recorrenciaIntervalo,
        mesInicio,
      });
      toast.success("Assinatura ajustada — os meses já passados continuam com os valores antigos.");
      onClose();
    } catch {
      toast.error("Não foi possível ajustar a assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-1 font-medium">Ajustar assinatura</p>
      <p className="mb-4 text-xs text-ink-muted">
        Isso para a assinatura atual e cria uma nova com os valores abaixo, a partir do mês escolhido.
        Nada do que já foi cobrado antes muda.
      </p>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Descrição"
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          className={INPUT_CLASS}
        />
        <CurrencyInput value={valor} onChange={setValor} className={INPUT_CLASS} />
        {categoriaOptions.length > 0 && (
          <select value={categoria} onChange={(event) => setCategoria(event.target.value)} className={INPUT_CLASS}>
            {categoriaOptions.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.icone ?? FALLBACK_CATEGORY_ICON} {c.nome}
              </option>
            ))}
          </select>
        )}
        {banks.length > 0 && (
          <select value={bancoId} onChange={(event) => setBancoId(event.target.value)} className={INPUT_CLASS}>
            <option value="">Sem banco vinculado</option>
            {banks.map((banco) => (
              <option key={banco.id} value={banco.id}>
                {banco.nome}
              </option>
            ))}
          </select>
        )}
        {assinatura.tipo === "despesa" && bancoId !== "" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormaPagamento("credito")}
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
              onClick={() => setFormaPagamento("debito")}
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRecorrenciaIntervalo("mensal")}
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
            onClick={() => setRecorrenciaIntervalo("anual")}
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
          A partir de
          <input
            type="month"
            value={mesInicio}
            onChange={(event) => setMesInicio(event.target.value)}
            className="rounded-xl border border-border px-2 py-1.5 text-sm outline-none transition-colors focus:border-accent"
          />
        </label>
        <button onClick={handleSave} disabled={saving} className={SAVE_BUTTON_CLASS}>
          Salvar ajuste
        </button>
      </div>
    </>
  );
}
