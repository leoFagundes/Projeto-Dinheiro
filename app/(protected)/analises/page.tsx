"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, Receipt } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import { computeOriginDateById } from "@/lib/derived";
import {
  computeBucketTotals,
  computeCategoryBreakdownInRange,
  computeCumulativeComparison,
  computeFlowTrend,
  computePeriodSummary,
  computeTopTransactions,
} from "@/lib/analytics";
import {
  comparisonRange,
  formatDayHeader,
  isCurrentPeriod,
  periodContaining,
  previousPeriodName,
  type Granularidade,
  type Periodo,
} from "@/lib/periods";
import { formatMonthLabel } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { PeriodFilter } from "@/app/_components/PeriodFilter";
import { Skeleton } from "@/app/_components/Skeleton";
import { EmptyState } from "@/app/_components/EmptyState";
import { MaskedCurrency, Money } from "@/app/_components/Money";
import { TrendIndicator } from "@/app/_components/TrendIndicator";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import type { TransactionType } from "@/lib/types";
import { CategoryPieChart, CumulativeComparisonChart, FlowTrendChart, PeriodBarChart } from "../_components/Charts";
import { CategoryDetailSheet } from "../_components/CategoryDetailSheet";
import { TipoToggle } from "../_components/TipoToggle";

const FLOW_TREND_COUNT: Record<Granularidade, number> = { semana: 8, mes: 6, ano: 5 };
const PERIODO_ATUAL_NOME: Record<Granularidade, string> = {
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
};
const PERIODO_ANTERIOR_NOME: Record<Granularidade, string> = {
  semana: "Semana passada",
  mes: "Mês passado",
  ano: "Ano passado",
};

export default function AnalisesPage() {
  const { transactions, loading } = useTransactions();
  const { categories } = useCategories();
  const [periodo, setPeriodo] = useState<Periodo>(() => periodContaining("mes"));
  const [categoriaTipo, setCategoriaTipo] = useState<TransactionType>("despesa");
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  if (loading) {
    return (
      <PageFade>
        <div className="flex flex-col gap-4 pb-8">
          <h1 className="text-lg font-semibold">Análises</h1>
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-72" />
        </div>
      </PageFade>
    );
  }

  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const originDateById = computeOriginDateById(transactions);
  const resumo = computePeriodSummary(transactions, periodo);
  const anterior = comparisonRange(periodo);
  const nomeAnterior = previousPeriodName(periodo.granularidade);

  const categorias = computeCategoryBreakdownInRange(transactions, periodo.inicio, periodo.fim, categoriaTipo);
  const categoriasAnterior = computeCategoryBreakdownInRange(transactions, anterior.inicio, anterior.fim, categoriaTipo);
  const ritmo = computeCumulativeComparison(transactions, periodo, "despesa");
  const porFatia = computeBucketTotals(transactions, periodo, "despesa").map((bucket) => ({
    label: bucket.label,
    tooltipLabel: periodo.granularidade === "ano" ? formatMonthLabel(bucket.inicio.slice(0, 7)) : formatDayHeader(bucket.inicio),
    total: bucket.total,
  }));
  const fluxo = computeFlowTrend(transactions, periodo, FLOW_TREND_COUNT[periodo.granularidade]);
  const maiores = computeTopTransactions(transactions, periodo, "despesa", 5);
  const atual = isCurrentPeriod(periodo);

  return (
    <PageFade>
      <div className="flex flex-col gap-6 pb-8">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 size={20} className="text-accent-strong" />
          Análises
        </h1>

        <PeriodFilter periodo={periodo} onChange={setPeriodo} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${periodo.granularidade}-${periodo.inicio}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-8"
          >
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={atual ? "Recebido até hoje" : "Recebido"}
                value={<MaskedCurrency value={resumo.receitas} />}
                valueClass="text-accent-strong"
                extra={resumo.receitasAReceber > 0 ? <>+ <MaskedCurrency value={resumo.receitasAReceber} /> a receber</> : null}
                delta={
                  resumo.receitasAnterior > 0 && resumo.receitas !== resumo.receitasAnterior ? (
                    <>
                      <TrendIndicator current={resumo.receitas} previous={resumo.receitasAnterior} />
                      <span className="ml-1">vs {nomeAnterior}</span>
                    </>
                  ) : null
                }
              />
              <StatTile
                label={atual ? "Gasto até hoje" : "Gasto"}
                value={<MaskedCurrency value={resumo.despesas} />}
                valueClass="text-negative"
                extra={resumo.despesasAVencer > 0 ? <>+ <MaskedCurrency value={resumo.despesasAVencer} /> a vencer</> : null}
                delta={
                  resumo.despesasAnterior > 0 && resumo.despesas !== resumo.despesasAnterior ? (
                    <>
                      <TrendIndicator current={resumo.despesas} previous={resumo.despesasAnterior} invert />
                      <span className="ml-1">vs {nomeAnterior}</span>
                    </>
                  ) : null
                }
              />
              <StatTile
                label="Saldo"
                value={<Money value={resumo.receitas - resumo.despesas} showSign />}
                extra="recebido menos gasto"
              />
              <StatTile
                label="Gasto médio por dia"
                value={<MaskedCurrency value={resumo.mediaDiariaDespesas} />}
                extra={atual ? "nos dias até hoje" : "no período"}
              />
            </div>

            <Section title="Por categoria">
              <div className="rounded-card bg-surface p-4 shadow-card">
                <TipoToggle value={categoriaTipo} onChange={setCategoriaTipo} />
                <CategoryPieChart
                  data={categorias}
                  previousData={categoriasAnterior}
                  previousLabel={nomeAnterior}
                  tipo={categoriaTipo}
                  colorByCategoria={colorByCategoria}
                  iconByCategoria={iconByCategoria}
                  onSelectCategoria={setCategoriaAberta}
                />
              </div>
            </Section>

            <Section
              title="Ritmo de gastos"
              description={`Quanto já saiu acumulado, comparado com o mesmo ponto do ${nomeAnterior}.`}
            >
              <div className="rounded-card bg-surface p-4 shadow-card">
                <CumulativeComparisonChart
                  data={ritmo}
                  atualLabel={atual ? PERIODO_ATUAL_NOME[periodo.granularidade] : periodo.label}
                  anteriorLabel={atual ? PERIODO_ANTERIOR_NOME[periodo.granularidade] : "Período anterior"}
                  color="var(--color-negative)"
                  tooltipLabelPrefix={periodo.granularidade === "mes" ? "Dia " : ""}
                />
              </div>
            </Section>

            <Section title={periodo.granularidade === "ano" ? "Gastos por mês" : "Gastos por dia"}>
              <div className="rounded-card bg-surface p-4 shadow-card">
                <PeriodBarChart
                  data={porFatia}
                  seriesName="Gasto"
                  color="var(--color-negative)"
                  emptyTitle="Nenhum gasto neste período"
                  emptyDescription="Quando houver despesas, elas aparecem aqui distribuídas ao longo do período."
                />
              </div>
            </Section>

            <Section title="Receitas x despesas" description="Os últimos períodos lado a lado.">
              <div className="rounded-card bg-surface p-4 shadow-card">
                <FlowTrendChart data={fluxo} />
              </div>
            </Section>

            <Section title="Maiores gastos">
              {maiores.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Nenhum gasto neste período"
                  description="As maiores despesas do período aparecem aqui."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {maiores.map((transaction) => (
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
            </Section>
          </motion.div>
        </AnimatePresence>
      </div>

      <CategoryDetailSheet
        categoria={categoriaAberta}
        tipo={categoriaTipo}
        periodo={periodo}
        transactions={transactions}
        colorByCategoria={colorByCategoria}
        iconByCategoria={iconByCategoria}
        originDateById={originDateById}
        onClose={() => setCategoriaAberta(null)}
      />
    </PageFade>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-ink-muted">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-ink-muted/80">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatTile({
  label,
  value,
  valueClass = "",
  extra,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  extra?: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
      {extra && <p className="mt-0.5 text-xs text-ink-muted">{extra}</p>}
      {delta && <p className="mt-0.5 flex items-center text-xs text-ink-muted">{delta}</p>}
    </div>
  );
}

