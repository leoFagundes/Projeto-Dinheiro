import {
  addMonthsToKey,
  clampDayToMonth,
  currentMonthKey,
  currentYear,
  monthKeyOfIsoDate,
  todayIsoDate,
  yearOfIsoDate,
} from "./format";
import type {
  Investment,
  InvestmentMovement,
  Pocket,
  PocketMovement,
  PocketTransfer,
  Transaction,
  TransactionType,
} from "./types";

export type CalendarEvent = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: Transaction["tipo"];
  categoria: string;
  /** "transacao": já existe no Firestore. "recorrencia": projeção — ainda não foi gerada. */
  origem: "transacao" | "recorrencia";
  /** Se é (ou projeta) uma recorrência — usado pra destacar assinaturas/contas fixas na agenda. */
  recorrente: boolean;
  parcelaAtual?: number;
  parcelaTotal?: number;
};

/**
 * Data do template original de cada assinatura, indexada pelo id do
 * template — pra transações que são instâncias geradas (`recorrenteOrigemId`)
 * mostrarem "desde quando" a assinatura existe, e não só "é recorrente".
 */
export function computeOriginDateById(transactions: Transaction[]): Map<string, string> {
  return new Map(
    transactions.filter((t) => t.recorrente && !t.recorrenteOrigemId).map((t) => [t.id, t.data]),
  );
}

export type LoanSummary = {
  /** Mesmo id compartilhado pela receita (se existir) e por todas as parcelas (ver `addLoan`). */
  id: string;
  descricao: string;
  categoria: string;
  /**
   * Ausente quando a receita do valor recebido foi excluída (ex: dinheiro já
   * usado antes de começar a usar o app, sem sentido contar como entrada
   * nova) — o empréstimo continua existindo e sendo pago normalmente, só sem
   * esse dado pra mostrar.
   */
  valorRecebido?: number;
  dataRecebimento?: string;
  /** Soma do combinado originalmente (`valorOriginal`) de todas as parcelas — referência fixa, nunca muda. */
  valorTotalPagar: number;
  /** Soma do que realmente já saiu da conta (parcelas com `data` <= hoje, no valor atual delas). */
  totalPago: number;
  /** Soma do combinado (`valorOriginal`) das parcelas ainda não pagas. */
  restante: number;
  /** valorOriginal - valor de cada parcela já paga, somado — positivo é economia líquida, negativo é custo extra (multa/juros). */
  economiaTotal: number;
  parcelasPagas: number;
  parcelasTotal: number;
  parcelas: Transaction[];
};

/**
 * Reconstrói cada empréstimo a partir das transações que o compõem, ligadas
 * por `emprestimoId` — sem precisar de uma coleção separada. Âncora é sempre
 * uma parcela (nunca a receita): se o usuário excluir a receita do valor
 * recebido (ex: dinheiro que já tinha sido usado antes do app, e por isso não
 * devia contar como entrada nova), o empréstimo continua aparecendo normal,
 * só sem o dado de "quanto/quando recebeu". Uma parcela conta como paga
 * quando sua `data` atual já passou, então pagar antecipado ou atrasado —
 * com um valor diferente do combinado — já reflete aqui automaticamente.
 */
export function computeLoans(transactions: Transaction[]): LoanSummary[] {
  const hoje = todayIsoDate();
  const emprestimoIds = new Set(
    transactions
      .filter((t) => t.tipo === "despesa" && t.emprestimoId)
      .map((t) => t.emprestimoId as string),
  );

  return Array.from(emprestimoIds)
    .map((emprestimoId): LoanSummary => {
      const parcelas = transactions
        .filter((t) => t.emprestimoId === emprestimoId && t.tipo === "despesa")
        .sort((a, b) => (a.parcelaAtual ?? 0) - (b.parcelaAtual ?? 0));
      const receita = transactions.find(
        (t) => t.emprestimoId === emprestimoId && t.tipo === "receita",
      );
      const pagas = parcelas.filter((p) => p.data <= hoje);
      const naoPagas = parcelas.filter((p) => p.data > hoje);

      return {
        id: emprestimoId,
        descricao: parcelas[0]?.descricao ?? "Empréstimo",
        categoria: parcelas[0]?.categoria ?? "",
        valorRecebido: receita?.valor,
        dataRecebimento: receita?.data,
        valorTotalPagar: parcelas.reduce((sum, p) => sum + (p.valorOriginal ?? p.valor), 0),
        totalPago: pagas.reduce((sum, p) => sum + p.valor, 0),
        restante: naoPagas.reduce((sum, p) => sum + (p.valorOriginal ?? p.valor), 0),
        economiaTotal: pagas.reduce((sum, p) => sum + ((p.valorOriginal ?? p.valor) - p.valor), 0),
        parcelasPagas: pagas.length,
        parcelasTotal: parcelas.length,
        parcelas,
      };
    })
    .sort((a, b) => {
      const dataA = a.dataRecebimento ?? a.parcelas[0]?.dataVencimento ?? "";
      const dataB = b.dataRecebimento ?? b.parcelas[0]?.dataVencimento ?? "";
      return dataA < dataB ? 1 : -1;
    });
}

/**
 * Assinaturas/recorrências ativas: templates que ainda estão gerando (ou vão
 * gerar) transação todo mês — exclui instâncias já geradas (só o template
 * conta) e templates cuja recorrência já passou da data-fim definida.
 * Ordenado do maior pro menor valor.
 */
export function computeActiveSubscriptions(transactions: Transaction[]): Transaction[] {
  const thisMonth = currentMonthKey();
  return transactions
    .filter(
      (t) =>
        t.recorrente &&
        !t.recorrenteOrigemId &&
        (!t.recorrenteFim || t.recorrenteFim >= thisMonth),
    )
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Assinaturas paradas recentemente: já foram um template ativo (têm pelo
 * menos uma instância gerada), mas hoje `recorrente` está false. Sem esse
 * "já teve instância" como pista, não daria pra distinguir de uma transação
 * comum que nunca foi recorrente.
 */
export function computeStoppedSubscriptions(transactions: Transaction[]): Transaction[] {
  return transactions
    .filter(
      (t) =>
        !t.recorrente &&
        !t.recorrenteOrigemId &&
        transactions.some((other) => other.recorrenteOrigemId === t.id),
    )
    .sort((a, b) => b.criadoEm - a.criadoEm);
}

/** Quanto já foi cobrado no total de uma assinatura (a primeira cobrança + todas as instâncias geradas dela). */
export function computeSubscriptionTotalSpent(
  template: Transaction,
  transactions: Transaction[],
): number {
  return transactions
    .filter((t) => t.id === template.id || t.recorrenteOrigemId === template.id)
    .reduce((sum, t) => sum + t.valor, 0);
}

/**
 * Próxima data em que essa assinatura deve cobrar, considerando a
 * frequência (mensal ou anual) e respeitando `recorrenteFim`. Retorna null
 * se a recorrência já tiver terminado.
 */
export function computeNextChargeDate(
  template: Transaction,
  transactions: Transaction[],
): string | null {
  const today = todayIsoDate();
  const thisMonth = currentMonthKey();
  if (template.recorrenteFim && thisMonth > template.recorrenteFim) return null;

  const originalDay = Number(template.data.slice(8, 10));
  const instanceOn = (monthKey: string) =>
    monthKeyOfIsoDate(template.data) === monthKey
      ? template
      : transactions.find(
          (t) => t.recorrenteOrigemId === template.id && monthKeyOfIsoDate(t.data) === monthKey,
        );

  const templateMonth = monthKeyOfIsoDate(template.data);

  if (template.recorrenciaIntervalo === "anual") {
    const anniversaryMonthNum = templateMonth.slice(5, 7);
    const thisYear = Number(thisMonth.slice(0, 4));
    for (const year of [thisYear, thisYear + 1]) {
      const cycleMonth = `${year}-${anniversaryMonthNum}`;
      if (cycleMonth < templateMonth) continue; // recorrência ainda não começou
      if (template.recorrenteFim && cycleMonth > template.recorrenteFim) return null;
      if (template.mesesExcluidos?.includes(cycleMonth)) continue;
      const cycleDate =
        instanceOn(cycleMonth)?.data ?? `${cycleMonth}-${clampDayToMonth(cycleMonth, originalDay)}`;
      if (cycleDate >= today) return cycleDate;
    }
    return null;
  }

  for (const cycleMonth of [thisMonth, addMonthsToKey(thisMonth, 1), addMonthsToKey(thisMonth, 2)]) {
    if (cycleMonth < templateMonth) continue; // recorrência ainda não começou
    if (template.recorrenteFim && cycleMonth > template.recorrenteFim) return null;
    if (template.mesesExcluidos?.includes(cycleMonth)) continue;
    const cycleDate =
      instanceOn(cycleMonth)?.data ?? `${cycleMonth}-${clampDayToMonth(cycleMonth, originalDay)}`;
    if (cycleDate >= today) return cycleDate;
  }
  return null;
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

export function computeCategoryBreakdown(
  transactions: Transaction[],
  monthKey: string,
  tipo: TransactionType = "despesa",
): { categoria: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.tipo !== tipo || monthKeyOfIsoDate(t.data) !== monthKey) continue;
    totals.set(t.categoria, (totals.get(t.categoria) ?? 0) + t.valor);
  }
  return Array.from(totals, ([categoria, total]) => ({ categoria, total })).sort(
    (a, b) => b.total - a.total,
  );
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
        categoria: t.categoria,
        origem: "transacao",
        recorrente: t.recorrente,
        parcelaAtual: t.parcelaAtual,
        parcelaTotal: t.parcelaTotal,
      });
    }
  }

  const templates = transactions.filter((t) => t.recorrente && !t.recorrenteOrigemId);
  for (const template of templates) {
    const templateMonth = monthKeyOfIsoDate(template.data);
    if (templateMonth === monthKey) continue; // já contado acima como transação real
    if (monthKey < templateMonth) continue; // recorrência ainda não começou
    if (template.recorrenteFim && monthKey > template.recorrenteFim) continue;
    if (template.mesesExcluidos?.includes(monthKey)) continue;
    if (template.recorrenciaIntervalo === "anual" && monthKey.slice(5, 7) !== templateMonth.slice(5, 7)) {
      continue;
    }

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
      categoria: template.categoria,
      origem: "recorrencia",
      recorrente: true,
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
  // Uma janela de 30 dias pode atravessar até 3 meses diferentes (ex: começando
  // dia 31/jan), então percorre mês a mês em vez de assumir só início e fim.
  const monthsToCheck: string[] = [];
  for (let monthKey = startMonth; monthKey <= endMonth; monthKey = addMonthsToKey(monthKey, 1)) {
    monthsToCheck.push(monthKey);
  }

  return monthsToCheck
    .flatMap((monthKey) => computeMonthEvents(transactions, monthKey))
    .filter((event) => event.data >= start && event.data <= end)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

export type UpcomingReminder = {
  id: string;
  titulo: string;
  valor: number;
  data: string;
  tipo: "assinatura" | "emprestimo";
};

/**
 * Cobranças de assinatura e parcelas de empréstimo ainda não pagas que caem
 * nos próximos `days` dias — usado pro aviso de "conta perto do vencimento"
 * (ver Ajustes → Notificações).
 */
export function computeUpcomingReminders(transactions: Transaction[], days = 3): UpcomingReminder[] {
  const start = todayIsoDate();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days - 1);
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  const assinaturas = computeUpcomingEvents(transactions, days)
    .filter((event) => event.recorrente && event.tipo === "despesa")
    .map(
      (event): UpcomingReminder => ({
        id: event.id,
        titulo: event.descricao,
        valor: event.valor,
        data: event.data,
        tipo: "assinatura",
      }),
    );

  const parcelas = computeLoans(transactions).flatMap((loan) =>
    loan.parcelas
      .filter((p) => p.data > start && p.data <= end)
      .map(
        (p): UpcomingReminder => ({
          id: p.id,
          titulo: `${loan.descricao} (parcela ${p.parcelaAtual}/${p.parcelaTotal})`,
          valor: p.valor,
          data: p.data,
          tipo: "emprestimo",
        }),
      ),
  );

  return [...assinaturas, ...parcelas].sort((a, b) => (a.data < b.data ? -1 : 1));
}

/**
 * Receitas/despesas do mês divididas em "já aconteceu" (data até hoje) e
 * "ainda vai acontecer" (data depois de hoje, incluindo cobranças de
 * assinatura que só existem como projeção) — o total do mês sozinho misturava
 * o que já saiu com o que ainda vai vencer. A comparação com o mês anterior
 * usa o MESMO PERÍODO (dia 1 até o dia de hoje), senão no começo do mês o
 * gasto parcial sempre parecia uma queda enorme frente ao mês passado inteiro.
 */
export function computeMonthProgress(transactions: Transaction[], monthKey: string) {
  const hoje = todayIsoDate();
  let receitasAteHoje = 0;
  let despesasAteHoje = 0;
  let receitasAReceber = 0;
  let despesasAPagar = 0;
  for (const event of computeMonthEvents(transactions, monthKey)) {
    const jaAconteceu = event.data <= hoje;
    if (event.tipo === "receita") {
      if (jaAconteceu) receitasAteHoje += event.valor;
      else receitasAReceber += event.valor;
    } else if (jaAconteceu) {
      despesasAteHoje += event.valor;
    } else {
      despesasAPagar += event.valor;
    }
  }

  const mesAnterior = addMonthsToKey(monthKey, -1);
  const diaLimite = clampDayToMonth(mesAnterior, Number(hoje.slice(8, 10)));
  const limiteMesAnterior = `${mesAnterior}-${diaLimite}`;
  const despesasMesAnteriorMesmoPeriodo = transactions
    .filter(
      (t) =>
        t.tipo === "despesa" &&
        monthKeyOfIsoDate(t.data) === mesAnterior &&
        t.data <= limiteMesAnterior,
    )
    .reduce((sum, t) => sum + t.valor, 0);

  return {
    receitasAteHoje,
    despesasAteHoje,
    receitasAReceber,
    despesasAPagar,
    despesasMesAnteriorMesmoPeriodo,
  };
}

/** Valor atual da carteira separado por tipo (renda fixa x variável), pra ver a composição. */
export function computeInvestmentComposition(
  investments: Investment[],
): { acoes: number; fiis: number; rendaVariavelOutros: number; rendaFixa: number } {
  let acoes = 0;
  let fiis = 0;
  let rendaVariavelOutros = 0;
  let rendaFixa = 0;
  for (const inv of investments) {
    const valor = inv.saldoAtual ?? inv.valorInvestido;
    if (inv.tipo === "rendaFixa") {
      rendaFixa += valor;
    } else if (inv.subtipo === "acao") {
      acoes += valor;
    } else if (inv.subtipo === "fii") {
      fiis += valor;
    } else {
      rendaVariavelOutros += valor;
    }
  }
  return { acoes, fiis, rendaVariavelOutros, rendaFixa };
}

/** Rótulo de exibição pro tipo de um investimento — usa a subclassificação (Ação/FII) quando houver. */
export function investmentTypeLabel(investment: Pick<Investment, "tipo" | "subtipo">): string {
  if (investment.subtipo === "acao") return "Ação";
  if (investment.subtipo === "fii") return "FII";
  return investment.tipo === "rendaVariavel" ? "Renda variável" : "Renda fixa";
}

/** Anos (mais recente primeiro) em que houve pelo menos um movimento de investimento, sempre incluindo o ano atual. */
export function computeInvestmentYears(movements: InvestmentMovement[]): number[] {
  const years = new Set(movements.map((m) => yearOfIsoDate(m.data)));
  years.add(currentYear());
  return Array.from(years).sort((a, b) => b - a);
}

/** Total aportado em cada mês (Jan a Dez) de um ano específico, olhando todos os investimentos. */
export function computeYearlyContributions(
  movements: InvestmentMovement[],
  year: number,
): { monthKey: string; total: number }[] {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return months.map((monthKey) => ({
    monthKey,
    total: movements
      .filter((m) => m.tipo === "aporte" && monthKeyOfIsoDate(m.data) === monthKey)
      .reduce((sum, m) => sum + m.valor, 0),
  }));
}

/**
 * Evolução acumulada do total aportado (aporte - resgate, mês a mês) desde o
 * primeiro movimento até o mês atual — reconstruída retroativamente, já que
 * cada contribuição tem data exata.
 */
export function computeCumulativeContributions(
  movements: InvestmentMovement[],
): { monthKey: string; total: number }[] {
  if (movements.length === 0) return [];
  const aportesResgates = movements.filter((m) => m.tipo === "aporte" || m.tipo === "resgate");
  if (aportesResgates.length === 0) return [];

  const primeiroMes = aportesResgates.reduce(
    (min, m) => (monthKeyOfIsoDate(m.data) < min ? monthKeyOfIsoDate(m.data) : min),
    monthKeyOfIsoDate(aportesResgates[0].data),
  );
  const ultimoMes = currentMonthKey();

  const meses: string[] = [];
  for (let monthKey = primeiroMes; monthKey <= ultimoMes; monthKey = addMonthsToKey(monthKey, 1)) {
    meses.push(monthKey);
  }

  let acumulado = 0;
  return meses.map((monthKey) => {
    const delta = aportesResgates
      .filter((m) => monthKeyOfIsoDate(m.data) === monthKey)
      .reduce((sum, m) => sum + (m.tipo === "aporte" ? m.valor : -m.valor), 0);
    acumulado += delta;
    return { monthKey, total: acumulado };
  });
}

/**
 * Ficha mensal de um ativo específico num ano: valor aportado, cotas
 * compradas e preço médio da compra em cada mês, mais o acumulado de cotas
 * (desde sempre, não só do ano) — no estilo da planilha de controle manual.
 */
export function computeInvestmentYearLedger(
  investimentoId: string,
  movements: InvestmentMovement[],
  year: number,
): { monthKey: string; valorAportado: number; cotas: number; precoMedio: number | null; cotasAcumuladas: number }[] {
  const doAtivo = movements
    .filter((m) => m.investimentoId === investimentoId && (m.tipo === "aporte" || m.tipo === "resgate"))
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  let cotasAcumuladas = doAtivo
    .filter((m) => yearOfIsoDate(m.data) < year)
    .reduce((sum, m) => sum + (m.tipo === "aporte" ? (m.cotas ?? 0) : -(m.cotas ?? 0)), 0);

  return months.map((monthKey) => {
    const doMes = doAtivo.filter((m) => monthKeyOfIsoDate(m.data) === monthKey);
    const aportesDoMes = doMes.filter((m) => m.tipo === "aporte");
    const valorAportado = aportesDoMes.reduce((sum, m) => sum + m.valor, 0);
    const cotas = aportesDoMes.reduce((sum, m) => sum + (m.cotas ?? 0), 0);
    const precoMedio = cotas > 0 ? valorAportado / cotas : null;
    cotasAcumuladas += doMes.reduce(
      (sum, m) => sum + (m.tipo === "aporte" ? (m.cotas ?? 0) : -(m.cotas ?? 0)),
      0,
    );
    return { monthKey, valorAportado, cotas, precoMedio, cotasAcumuladas };
  });
}

export type HistoryEntryTipo =
  | "receita"
  | "despesa"
  | "transferencia_caixinha"
  | "caixinha"
  | "investimento";

/**
 * Item unificado do Histórico: junta transações com todas as outras
 * movimentações que hoje ficam em coleções separadas (caixinha,
 * investimento) — sem isso, essas ações nunca apareciam em lugar nenhum pro
 * usuário revisar.
 */
export type HistoryEntry = {
  id: string;
  data: string;
  criadoEm: number;
  tipo: HistoryEntryTipo;
  titulo: string;
  detalhe?: string;
  valor: number;
  /** Direção pra exibição: soma ou subtrai visualmente (não é sinal contábil). */
  direcao: "positivo" | "negativo" | "neutro";
  categoria?: string;
  /** Presente só quando `tipo` é "receita"/"despesa" — permite editar/excluir. */
  transaction?: Transaction;
  /**
   * Presente quando o item pode ser excluído (desfazendo exatamente o que
   * alterou nos saldos envolvidos) — sem isso, um lançamento errado de
   * transferência/pagamento/movimento nunca podia ser corrigido.
   */
  onDelete?: () => Promise<void>;
};

/**
 * Cobranças de assinaturas que ainda não existem no Firestore (o mês
 * navegado ainda não chegou/não foi aberto pelo app pra gerar de verdade),
 * mas que vão acontecer — pra não sumir do Histórico quando o usuário avança
 * pros próximos meses. Só entra o que ainda não tem instância real gerada.
 */
export function computeProjectedSubscriptionEntries(
  transactions: Transaction[],
  monthKey: string,
): HistoryEntry[] {
  const templates = transactions.filter((t) => t.recorrente && !t.recorrenteOrigemId);
  const entries: HistoryEntry[] = [];

  for (const template of templates) {
    const templateMonth = monthKeyOfIsoDate(template.data);
    if (templateMonth === monthKey) continue; // já é uma transação real
    if (monthKey < templateMonth) continue;
    if (template.recorrenteFim && monthKey > template.recorrenteFim) continue;
    if (template.mesesExcluidos?.includes(monthKey)) continue;
    if (
      template.recorrenciaIntervalo === "anual" &&
      monthKey.slice(5, 7) !== templateMonth.slice(5, 7)
    ) {
      continue;
    }

    const jaExiste = transactions.some(
      (t) => t.recorrenteOrigemId === template.id && monthKeyOfIsoDate(t.data) === monthKey,
    );
    if (jaExiste) continue;

    const day = clampDayToMonth(monthKey, Number(template.data.slice(8, 10)));
    entries.push({
      id: `previsto-${template.id}-${monthKey}`,
      data: `${monthKey}-${day}`,
      criadoEm: 0,
      tipo: template.tipo,
      titulo: template.descricao,
      detalhe: "previsto",
      valor: template.valor,
      direcao: template.tipo === "receita" ? "positivo" : "negativo",
      categoria: template.categoria,
    });
  }

  return entries;
}

export function computeUnifiedHistory(params: {
  transactions: Transaction[];
  pockets: Pocket[];
  investments: Investment[];
  pocketMovements: PocketMovement[];
  investmentMovements: InvestmentMovement[];
  pocketTransfers?: PocketTransfer[];
  onDeletePocketMovement?: (movement: PocketMovement) => Promise<void>;
  onDeleteInvestmentMovement?: (movement: InvestmentMovement) => Promise<void>;
  onDeletePocketTransfer?: (transfer: PocketTransfer) => Promise<void>;
}): HistoryEntry[] {
  const {
    transactions,
    pockets,
    investments,
    pocketMovements,
    investmentMovements,
    pocketTransfers = [],
    onDeletePocketMovement,
    onDeleteInvestmentMovement,
    onDeletePocketTransfer,
  } = params;

  const pocketNameById = new Map(pockets.map((p) => [p.id, p.nome]));
  const investmentNameById = new Map(investments.map((i) => [i.id, i.nome]));

  const entries: HistoryEntry[] = [];

  for (const t of transactions) {
    entries.push({
      id: `t-${t.id}`,
      data: t.data,
      criadoEm: t.criadoEm,
      tipo: t.tipo,
      titulo: t.descricao,
      valor: t.valor,
      direcao: t.tipo === "receita" ? "positivo" : "negativo",
      categoria: t.categoria,
      transaction: t,
    });
  }

  for (const tr of pocketTransfers) {
    const de = pocketNameById.get(tr.fromPocketId) ?? "caixinha removida";
    const para = pocketNameById.get(tr.toPocketId) ?? "caixinha removida";
    entries.push({
      id: `pt-${tr.id}`,
      data: tr.data,
      criadoEm: tr.criadoEm,
      tipo: "transferencia_caixinha",
      titulo: `Transferência entre caixinhas: ${de} → ${para}`,
      valor: tr.valor,
      direcao: "neutro",
      onDelete: onDeletePocketTransfer ? () => onDeletePocketTransfer(tr) : undefined,
    });
  }

  for (const m of pocketMovements) {
    const caixinha = pocketNameById.get(m.pocketId) ?? "caixinha removida";
    entries.push({
      id: `pm-${m.id}`,
      data: m.data,
      criadoEm: m.criadoEm,
      tipo: "caixinha",
      titulo:
        m.tipo === "deposito"
          ? `Caixinha ${caixinha} — depósito`
          : m.tipo === "retirada"
            ? `Caixinha ${caixinha} — retirada`
            : `Caixinha ${caixinha} — rendimento`,
      valor: Math.abs(m.valor),
      direcao:
        m.tipo === "retirada" || (m.tipo === "rendimento" && m.valor < 0) ? "positivo" : "negativo",
      onDelete: onDeletePocketMovement ? () => onDeletePocketMovement(m) : undefined,
    });
  }

  for (const m of investmentMovements) {
    const investimento = investmentNameById.get(m.investimentoId) ?? "investimento removido";
    entries.push({
      id: `im-${m.id}`,
      data: m.data,
      criadoEm: m.criadoEm,
      tipo: "investimento",
      titulo:
        m.tipo === "aporte"
          ? `Investimento ${investimento} — aporte`
          : m.tipo === "resgate"
            ? `Investimento ${investimento} — resgate`
            : `Investimento ${investimento} — rendimento`,
      detalhe: m.cotas ? `${m.cotas} cotas` : undefined,
      valor: Math.abs(m.valor),
      direcao:
        m.tipo === "resgate" || (m.tipo === "rendimento" && m.valor < 0) ? "positivo" : "negativo",
      onDelete: onDeleteInvestmentMovement ? () => onDeleteInvestmentMovement(m) : undefined,
    });
  }

  return entries.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.criadoEm - a.criadoEm));
}
