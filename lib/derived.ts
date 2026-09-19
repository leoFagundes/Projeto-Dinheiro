import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  monthKeyOfIsoDate,
  todayIsoDate,
} from "./format";
import type {
  Bank,
  BankPayment,
  BankTransfer,
  Investment,
  InvestmentMovement,
  Pocket,
  PocketMovement,
  Transaction,
} from "./types";

export type CalendarEvent = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: Transaction["tipo"];
  /** "transacao": já existe no Firestore. "recorrencia": projeção — ainda não foi gerada. */
  origem: "transacao" | "recorrencia";
};

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

/**
 * Saldo em conta de um banco: base ajustada manualmente + receitas recebidas
 * nele + retiradas de caixinhas/resgates de investimento de volta pra conta +
 * transferências recebidas de outro banco, menos despesas no débito (saem da
 * conta na hora), depósitos em caixinhas, aportes em investimentos, pagamentos
 * de fatura e transferências enviadas a outro banco.
 * Despesas no crédito não entram aqui — elas compõem a fatura, cobrada depois.
 */
export function computeBankSaldoConta(
  bank: Bank,
  transactions: Transaction[],
  movements: PocketMovement[],
  payments: BankPayment[] = [],
  investmentMovements: InvestmentMovement[] = [],
  transfers: BankTransfer[] = [],
): number {
  let saldo = bank.saldoContaInicial ?? 0;
  for (const t of transactions) {
    if (t.bancoId !== bank.id) continue;
    if (t.tipo === "receita") saldo += t.valor;
    else if (t.formaPagamento === "debito") saldo -= t.valor;
  }
  for (const m of movements) {
    if (m.bancoId !== bank.id) continue;
    saldo += m.tipo === "retirada" ? m.valor : -m.valor;
  }
  for (const p of payments) {
    if (p.bancoId !== bank.id) continue;
    saldo -= p.valor;
  }
  for (const m of investmentMovements) {
    if (m.bancoId !== bank.id) continue;
    saldo += m.tipo === "resgate" ? m.valor : -m.valor;
  }
  for (const tr of transfers) {
    if (tr.fromBancoId === bank.id) saldo -= tr.valor;
    if (tr.toBancoId === bank.id) saldo += tr.valor;
  }
  return saldo;
}

/**
 * Patrimônio líquido "de verdade": o que está em conta nos bancos + guardado
 * em caixinhas + aportado em investimentos (custo, não cotação de mercado),
 * menos as dívidas de cartão (saldo anterior + fatura do mês corrente).
 */
export function computePatrimonio(
  banks: Bank[],
  pockets: Pocket[],
  investments: Investment[],
  transactions: Transaction[],
  pocketMovements: PocketMovement[],
  bankPayments: BankPayment[],
  investmentMovements: InvestmentMovement[],
  bankTransfers: BankTransfer[] = [],
): { contas: number; caixinhas: number; investimentos: number; dividas: number; total: number } {
  const contas = banks.reduce(
    (sum, b) =>
      sum +
      computeBankSaldoConta(
        b,
        transactions,
        pocketMovements,
        bankPayments,
        investmentMovements,
        bankTransfers,
      ),
    0,
  );
  const caixinhas = pockets.reduce((sum, p) => sum + p.saldo, 0);
  const investimentos = investments.reduce((sum, i) => sum + (i.saldoAtual ?? i.valorInvestido), 0);
  const thisMonth = currentMonthKey();
  const faturaMes = computeBankBreakdown(transactions, thisMonth, banks).reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const saldoAnteriorTotal = banks.reduce((sum, b) => sum + b.saldoDevedor, 0);
  const dividas = faturaMes + saldoAnteriorTotal;
  return {
    contas,
    caixinhas,
    investimentos,
    dividas,
    total: contas + caixinhas + investimentos - dividas,
  };
}

/**
 * Quanto uma caixinha já rendeu: soma dos movimentos "rendimento" (pode ser
 * negativo). O total aportado (sem contar o rendimento) é `saldo - rendimento`.
 */
export function computePocketRendimento(pocket: Pocket, movements: PocketMovement[]): number {
  return movements
    .filter((m) => m.pocketId === pocket.id && m.tipo === "rendimento")
    .reduce((sum, m) => sum + m.valor, 0);
}

/**
 * Eventos (reais + recorrências projetadas) de um mês, para o calendário.
 * Transações já existentes (inclusive parcelas futuras já geradas) entram
 * como estão; templates recorrentes sem instância naquele mês ainda são
 * projetados virtualmente, respeitando `recorrenteFim` quando definido.
 */
export function computeMonthEvents(
  transactions: Transaction[],
  monthKey: string,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const t of transactions) {
    if (monthKeyOfIsoDate(t.data) === monthKey) {
      events.push({
        id: t.id,
        data: t.data,
        descricao: t.descricao,
        valor: t.valor,
        tipo: t.tipo,
        origem: "transacao",
      });
    }
  }

  const templates = transactions.filter((t) => t.recorrente && !t.recorrenteOrigemId);
  for (const template of templates) {
    const templateMonth = monthKeyOfIsoDate(template.data);
    if (templateMonth === monthKey) continue; // já contado acima como transação real
    if (monthKey < templateMonth) continue; // recorrência ainda não começou
    if (template.recorrenteFim && monthKey > template.recorrenteFim) continue;

    const jaExiste = transactions.some(
      (t) => t.recorrenteOrigemId === template.id && monthKeyOfIsoDate(t.data) === monthKey,
    );
    if (jaExiste) continue;

    const day = clampDayToMonth(monthKey, Number(template.data.slice(8, 10)));
    events.push({
      id: `${template.id}-${monthKey}`,
      data: `${monthKey}-${day}`,
      descricao: template.descricao,
      valor: template.valor,
      tipo: template.tipo,
      origem: "recorrencia",
    });
  }

  return events.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

/** Eventos (reais + recorrências projetadas) dos próximos `days` dias, a partir de hoje. */
export function computeUpcomingEvents(transactions: Transaction[], days = 7): CalendarEvent[] {
  const start = todayIsoDate();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days - 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const startMonth = monthKeyOfIsoDate(start);
  const endMonth = monthKeyOfIsoDate(end);
  const monthsToCheck = startMonth === endMonth ? [startMonth] : [startMonth, endMonth];

  return monthsToCheck
    .flatMap((monthKey) => computeMonthEvents(transactions, monthKey))
    .filter((event) => event.data >= start && event.data <= end)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

/**
 * Receitas x despesas mês a mês (não é um saldo acumulado — cada mês é
 * independente). Usado pra ver tendência sem inventar um "saldo" que não bate
 * com o Patrimônio, já que este último depende do estado atual de bancos,
 * caixinhas e investimentos, não só do histórico de transações.
 */
export function computeMonthlyFlowTrend(
  transactions: Transaction[],
  months = 6,
): { monthKey: string; receitas: number; despesas: number; saldoMes: number }[] {
  const currentKey = currentMonthKey();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(addMonthsToKey(currentKey, -i));

  return keys.map((monthKey) => ({ monthKey, ...computeMonthTotals(transactions, monthKey) }));
}
