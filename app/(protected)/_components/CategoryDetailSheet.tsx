"use client";

import { AnimatePresence } from "motion/react";
import { Receipt, X } from "lucide-react";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { MaskedCurrency } from "@/app/_components/Money";
import { TrendIndicator } from "@/app/_components/TrendIndicator";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import { EmptyState } from "@/app/_components/EmptyState";
import { categoryKey, categoryTint, FALLBACK_CATEGORY_COLOR, FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { categoryTransactionsInRange, computeCategoryTrend } from "@/lib/analytics";
import { comparisonRange, previousPeriodName, type Periodo } from "@/lib/periods";
import type { Transaction, TransactionType } from "@/lib/types";
import { PeriodBarChart } from "./Charts";

const TREND_COUNT = 6;
const PLURAL_GRANULARIDADE = { semana: "semanas", mes: "meses", ano: "anos" } as const;

/**
 * Detalhe de uma categoria num período: total, variação vs período anterior,
 * os últimos períodos num gráfico e TODAS as transações dela no período —
 * cada uma editável/excluível ali mesmo (TransactionListItem já traz isso).
 * A lista é derivada de `transactions` a cada render, então editar ou excluir
 * reflete na hora, sem fechar o modal.
 */
export function CategoryDetailSheet({
  categoria,
  tipo,
  periodo,
  transactions,
  colorByCategoria,
  iconByCategoria,
  originDateById,
  onClose,
}: {
  /** `null` fecha o modal. */
  categoria: string | null;
  tipo: TransactionType;
  periodo: Periodo;
  transactions: Transaction[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  originDateById?: Map<string, string>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={categoria !== null} onClose={onClose}>
      {categoria !== null && (
        <CategoryDetailFields
          categoria={categoria}
          tipo={tipo}
          periodo={periodo}
          transactions={transactions}
          colorByCategoria={colorByCategoria}
          iconByCategoria={iconByCategoria}
          originDateById={originDateById}
          onClose={onClose}
        />
      )}
    </BottomSheet>
  );
}

function CategoryDetailFields({
  categoria,
  tipo,
  periodo,
  transactions,
  colorByCategoria,
  iconByCategoria,
  originDateById,
  onClose,
}: {
  categoria: string;
  tipo: TransactionType;
  periodo: Periodo;
  transactions: Transaction[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  originDateById?: Map<string, string>;
  onClose: () => void;
}) {
  const key = categoryKey(tipo, categoria);
  const color = colorByCategoria.get(key) ?? FALLBACK_CATEGORY_COLOR;
  const icon = iconByCategoria.get(key) ?? FALLBACK_CATEGORY_ICON;

  const lista = categoryTransactionsInRange(transactions, categoria, tipo, periodo.inicio, periodo.fim);
  const total = lista.reduce((sum, t) => sum + t.valor, 0);
  const anterior = comparisonRange(periodo);
  const totalAnterior = categoryTransactionsInRange(transactions, categoria, tipo, anterior.inicio, anterior.fim).reduce(
    (sum, t) => sum + t.valor,
    0,
  );
  const trend = computeCategoryTrend(transactions, categoria, tipo, periodo, TREND_COUNT);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: categoryTint(color) }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{categoria}</p>
            <p className="text-xs text-ink-muted">{periodo.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-bg p-4">
        <p className="text-xs text-ink-muted">{tipo === "despesa" ? "Gasto no período" : "Recebido no período"}</p>
        <p className="mt-0.5 text-2xl font-semibold">
          <MaskedCurrency value={total} />
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
          <span>
            {lista.length} {lista.length === 1 ? "transação" : "transações"}
          </span>
          {totalAnterior > 0 && total !== totalAnterior && (
            <span className="flex items-center gap-1">
              <TrendIndicator current={total} previous={totalAnterior} invert={tipo === "despesa"} />
              vs {previousPeriodName(periodo.granularidade)}
            </span>
          )}
        </p>
      </div>

      <p className="mb-2 text-xs font-medium text-ink-muted">
        Últimos {TREND_COUNT} {PLURAL_GRANULARIDADE[periodo.granularidade]}
      </p>
      <div className="mb-5">
        <PeriodBarChart
          data={trend}
          seriesName={categoria}
          color={color}
          heightClass="h-36"
          emptyTitle="Sem histórico ainda"
          emptyDescription="Os totais dessa categoria nos períodos anteriores aparecem aqui."
        />
      </div>

      <p className="mb-2 text-xs font-medium text-ink-muted">Transações</p>
      {lista.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nada nesta categoria"
          description="Nenhuma transação dessa categoria no período selecionado."
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {lista.map((transaction) => (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                colorByCategoria={colorByCategoria}
                iconByCategoria={iconByCategoria}
                originDateById={originDateById}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
