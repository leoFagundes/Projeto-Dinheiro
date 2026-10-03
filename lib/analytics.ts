import { todayIsoDate } from "./format";
import {
  addDaysIso,
  comparisonRange,
  daysBetween,
  isCurrentPeriod,
  periodBuckets,
  periodShortLabel,
  shiftPeriod,
  type Periodo,
} from "./periods";
import type { Transaction, TransactionType } from "./types";

/**
 * Cálculos da tela de Análises. Tudo aqui olha só transações reais (as que já
 * existem no Firestore, inclusive parcelas/assinaturas com data futura já
 * geradas) — projeções de assinatura que ainda não viraram transação ficam de
 * fora, assim como no resto dos gráficos.
 */

function inRange(t: Transaction, inicio: string, fim: string): boolean {
  return t.data >= inicio && t.data <= fim;
}

function sumTipo(transactions: Transaction[], tipo: TransactionType, inicio: string, fim: string): number {
  let total = 0;
  for (const t of transactions) {
    if (t.tipo === tipo && inRange(t, inicio, fim)) total += t.valor;
  }
  return total;
}

export type PeriodSummary = {
  /** Até hoje, se o período está em andamento; o período inteiro, se já passou. */
  receitas: number;
  despesas: number;
  /** Lançado no período com data depois de hoje (parcela/assinatura agendada). */
  receitasAReceber: number;
  despesasAVencer: number;
  /** Mesma conta no período anterior, cortado no mesmo ponto (ver comparisonRange). */
  receitasAnterior: number;
  despesasAnterior: number;
  /** Gasto médio por dia já decorrido do período. */
  mediaDiariaDespesas: number;
};

export function computePeriodSummary(transactions: Transaction[], periodo: Periodo): PeriodSummary {
  const hoje = todayIsoDate();
  const emAndamento = isCurrentPeriod(periodo);
  const futuro = periodo.inicio > hoje;
  const fimRealizado = emAndamento ? hoje : periodo.fim;

  const receitas = futuro ? 0 : sumTipo(transactions, "receita", periodo.inicio, fimRealizado);
  const despesas = futuro ? 0 : sumTipo(transactions, "despesa", periodo.inicio, fimRealizado);
  const inicioAVencer = futuro ? periodo.inicio : emAndamento ? addDaysIso(hoje, 1) : null;
  const receitasAReceber = inicioAVencer ? sumTipo(transactions, "receita", inicioAVencer, periodo.fim) : 0;
  const despesasAVencer = inicioAVencer ? sumTipo(transactions, "despesa", inicioAVencer, periodo.fim) : 0;

  const anterior = comparisonRange(periodo);
  const diasDecorridos = futuro ? 0 : daysBetween(periodo.inicio, fimRealizado) + 1;

  return {
    receitas,
    despesas,
    receitasAReceber,
    despesasAVencer,
    receitasAnterior: sumTipo(transactions, "receita", anterior.inicio, anterior.fim),
    despesasAnterior: sumTipo(transactions, "despesa", anterior.inicio, anterior.fim),
    mediaDiariaDespesas: diasDecorridos > 0 ? despesas / diasDecorridos : 0,
  };
}

/** Total de um tipo em cada fatia do período (cada dia, ou cada mês no ano). */
export function computeBucketTotals(
  transactions: Transaction[],
  periodo: Periodo,
  tipo: TransactionType,
): { label: string; inicio: string; total: number }[] {
  return periodBuckets(periodo).map((bucket) => ({
    label: bucket.label,
    inicio: bucket.inicio,
    total: sumTipo(transactions, tipo, bucket.inicio, bucket.fim),
  }));
}

/**
 * Acumulado ao longo do período, lado a lado com o período anterior na mesma
 * posição (dia 1 com dia 1, segunda com segunda, janeiro com janeiro). A
 * linha do período atual para em hoje — depois disso fica `null`, senão
 * desenharia um platô falso até o fim do mês.
 */
export function computeCumulativeComparison(
  transactions: Transaction[],
  periodo: Periodo,
  tipo: TransactionType,
): { label: string; atual: number | null; anterior: number | null }[] {
  const hoje = todayIsoDate();
  const atuais = periodBuckets(periodo);
  const anteriores = periodBuckets(shiftPeriod(periodo, -1));
  let somaAtual = 0;
  let somaAnterior = 0;
  return atuais.map((bucket, index) => {
    const anteriorBucket = anteriores[index];
    if (anteriorBucket) somaAnterior += sumTipo(transactions, tipo, anteriorBucket.inicio, anteriorBucket.fim);
    const jaChegou = bucket.inicio <= hoje;
    if (jaChegou) somaAtual += sumTipo(transactions, tipo, bucket.inicio, bucket.fim);
    return {
      label: bucket.label,
      atual: jaChegou ? somaAtual : null,
      anterior: anteriorBucket ? somaAnterior : null,
    };
  });
}

/** Receitas x despesas nos últimos `count` períodos da mesma granularidade, terminando em `periodo`. */
export function computeFlowTrend(
  transactions: Transaction[],
  periodo: Periodo,
  count: number,
): { label: string; receitas: number; despesas: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const p = shiftPeriod(periodo, index - (count - 1));
    return {
      label: periodShortLabel(p),
      receitas: sumTipo(transactions, "receita", p.inicio, p.fim),
      despesas: sumTipo(transactions, "despesa", p.inicio, p.fim),
    };
  });
}

export function computeCategoryBreakdownInRange(
  transactions: Transaction[],
  inicio: string,
  fim: string,
  tipo: TransactionType,
): { categoria: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.tipo !== tipo || !inRange(t, inicio, fim)) continue;
    totals.set(t.categoria, (totals.get(t.categoria) ?? 0) + t.valor);
  }
  return Array.from(totals, ([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
}

/** Transações de uma categoria num período, mais recentes primeiro. */
export function categoryTransactionsInRange(
  transactions: Transaction[],
  categoria: string,
  tipo: TransactionType,
  inicio: string,
  fim: string,
): Transaction[] {
  return transactions
    .filter((t) => t.tipo === tipo && t.categoria === categoria && inRange(t, inicio, fim))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadoEm - a.criadoEm));
}

/** Quanto uma categoria somou em cada um dos últimos `count` períodos, terminando em `periodo`. */
export function computeCategoryTrend(
  transactions: Transaction[],
  categoria: string,
  tipo: TransactionType,
  periodo: Periodo,
  count: number,
): { label: string; total: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const p = shiftPeriod(periodo, index - (count - 1));
    let total = 0;
    for (const t of transactions) {
      if (t.tipo === tipo && t.categoria === categoria && inRange(t, p.inicio, p.fim)) total += t.valor;
    }
    return { label: periodShortLabel(p), total };
  });
}

/** As maiores despesas do período. */
export function computeTopTransactions(
  transactions: Transaction[],
  periodo: Periodo,
  tipo: TransactionType,
  limit: number,
): Transaction[] {
  return transactions
    .filter((t) => t.tipo === tipo && inRange(t, periodo.inicio, periodo.fim))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limit);
}
