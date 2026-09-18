import { addMonthsToKey, currentMonthKey, monthKeyOfIsoDate } from "./format";
import type { Bank, Transaction } from "./types";

function signedValue(t: Transaction): number {
  return t.tipo === "receita" ? t.valor : -t.valor;
}

export function computeSaldoAtual(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + signedValue(t), 0);
}

export function computeMonthTotals(transactions: Transaction[], monthKey: string) {
  const monthTx = transactions.filter((t) => monthKeyOfIsoDate(t.data) === monthKey);
  const receitas = monthTx
    .filter((t) => t.tipo === "receita")
    .reduce((sum, t) => sum + t.valor, 0);
  const despesas = monthTx
    .filter((t) => t.tipo === "despesa")
    .reduce((sum, t) => sum + t.valor, 0);
  return { receitas, despesas, saldoMes: receitas - despesas };
}

/** Variação percentual de despesas em relação ao mês anterior (null se não houver base de comparação). */
export function computeDespesasVariacao(
  transactions: Transaction[],
  monthKey: string,
): number | null {
  const despesasMes = computeMonthTotals(transactions, monthKey).despesas;
  const despesasMesAnterior = computeMonthTotals(
    transactions,
    addMonthsToKey(monthKey, -1),
  ).despesas;
  if (despesasMesAnterior === 0) return null;
  return ((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100;
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
): { categoria: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.tipo !== "despesa" || monthKeyOfIsoDate(t.data) !== monthKey) continue;
    totals.set(t.categoria, (totals.get(t.categoria) ?? 0) + t.valor);
  }
  return Array.from(totals, ([categoria, total]) => ({ categoria, total })).sort(
    (a, b) => b.total - a.total,
  );
}

/**
 * Total de despesas no crédito vinculadas a cada banco no mês (fatura).
 * Débito é pagamento imediato e não entra na fatura.
 */
export function computeBankBreakdown(
  transactions: Transaction[],
  monthKey: string,
  banks: Bank[],
): { bancoId: string; nome: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (
      t.tipo !== "despesa" ||
      !t.bancoId ||
      t.formaPagamento === "debito" ||
      monthKeyOfIsoDate(t.data) !== monthKey
    ) {
      continue;
    }
    totals.set(t.bancoId, (totals.get(t.bancoId) ?? 0) + t.valor);
  }
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  return Array.from(totals, ([bancoId, total]) => ({
    bancoId,
    nome: bankNameById.get(bancoId) ?? "Banco removido",
    total,
  })).sort((a, b) => b.total - a.total);
}

export function computeBalanceTrend(
  transactions: Transaction[],
  months = 6,
): { monthKey: string; saldo: number }[] {
  const currentKey = currentMonthKey();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(addMonthsToKey(currentKey, -i));

  const windowStart = keys[0];
  let runningBalance = transactions
    .filter((t) => monthKeyOfIsoDate(t.data) < windowStart)
    .reduce((sum, t) => sum + signedValue(t), 0);

  return keys.map((monthKey) => {
    const net = transactions
      .filter((t) => monthKeyOfIsoDate(t.data) === monthKey)
      .reduce((sum, t) => sum + signedValue(t), 0);
    runningBalance += net;
    return { monthKey, saldo: runningBalance };
  });
}
