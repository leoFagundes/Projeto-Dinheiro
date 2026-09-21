export type TransactionType = "receita" | "despesa";

export type FormaPagamento = "credito" | "debito";

export type Transaction = {
  id: string;
  userId: string;
  valor: number;
  tipo: TransactionType;
  categoria: string;
  descricao: string;
  /** ISO date string (yyyy-MM-dd), sem componente de hora */
  data: string;
  recorrente: boolean;
  /** Vincula uma transação gerada automaticamente ao template recorrente que a originou */
  recorrenteOrigemId?: string;
  /** Mês (yyyy-MM) em que a recorrência para de gerar novas instâncias, se definido */
  recorrenteFim?: string;
  /** Banco/instituição associada a esta despesa (opcional) */
  bancoId?: string;
  /** Crédito conta na fatura do banco; débito é pagamento imediato e não conta. Padrão: crédito. */
  formaPagamento?: FormaPagamento;
  /** Agrupa todas as parcelas de uma mesma compra parcelada */
  compraId?: string;
  parcelaAtual?: number;
  parcelaTotal?: number;
  criadoEm: number;
};

export type NewTransaction = Omit<Transaction, "id" | "userId" | "criadoEm">;

export type CategoryGoal = {
  id: string;
  userId: string;
  categoria: string;
  limiteMensal: number;
};

/** Exceção pontual ao limite geral de uma categoria, valendo só pra um mês específico. */
export type CategoryGoalOverride = {
  id: string;
  userId: string;
  categoria: string;
  /** Mês (yyyy-MM) em que esse limite substitui o geral. */
  monthKey: string;
  limiteMensal: number;
};

export type Category = {
  id: string;
  userId: string;
  nome: string;
  tipo: TransactionType;
  /** Emoji escolhido para representar a categoria. */
  icone?: string;
  criadoEm: number;
};

export type Bank = {
  id: string;
  userId: string;
  nome: string;
  /** Saldo anterior/ajuste manual — dívida não coberta por transações rastreadas. */
  saldoDevedor: number;
  /** Ajuste manual do saldo em conta — base sobre a qual receitas/débitos/caixinhas somam. */
  saldoContaInicial?: number;
  /** Oculta o banco das seções de resumo do Dashboard sem deixar de contar no patrimônio. */
  oculto?: boolean;
  criadoEm: number;
};

/**
 * Movimento de uma caixinha: depósito/retirada (opcionalmente ligados a um
 * banco) ou "rendimento" — ajuste do saldo atual informado pelo usuário para
 * refletir o que a caixinha rendeu, sem contar como aporte novo. Para
 * rendimento, `valor` é o delta (pode ser negativo) e não tem `bancoId`.
 */
export type PocketMovement = {
  id: string;
  userId: string;
  pocketId: string;
  bancoId?: string;
  tipo: "deposito" | "retirada" | "rendimento";
  valor: number;
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

/** "Caixinha": reserva de dinheiro guardado para um objetivo. */
export type Pocket = {
  id: string;
  userId: string;
  nome: string;
  saldo: number;
  /** Valor-alvo opcional, para mostrar uma barra de progresso. */
  metaValor?: number;
  /** Oculta a caixinha das seções de resumo do Dashboard sem deixar de contar no patrimônio. */
  oculto?: boolean;
  criadoEm: number;
};

/**
 * Pagamento de fatura/dívida de cartão (sai do saldo em conta do banco) ou
 * ajuste manual da fatura exibida (não mexe no saldo em conta — `valor: 0`).
 * `aplicadoFatura` é quanto isso reduz (ou aumenta, se negativo) a fatura
 * exibida do mês em que `data` cai — permite a fatura "descontar" o que já
 * foi pago, e corrigir na mão quando o cálculo automático não bateu.
 */
export type BankPayment = {
  id: string;
  userId: string;
  bancoId: string;
  valor: number;
  aplicadoFatura?: number;
  tipo?: "pagamento" | "ajuste";
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

/** Transferência de saldo em conta de um banco para outro. */
export type BankTransfer = {
  id: string;
  userId: string;
  fromBancoId: string;
  toBancoId: string;
  valor: number;
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

/** Transferência de saldo guardado de uma caixinha para outra. */
export type PocketTransfer = {
  id: string;
  userId: string;
  fromPocketId: string;
  toPocketId: string;
  valor: number;
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

export type InvestmentType = "rendaFixa" | "rendaVariavel";

/** Subclassificação de renda variável — não se aplica a renda fixa. */
export type InvestmentSubtipo = "acao" | "fii";

/**
 * Um ativo de investimento (ex: "Tesouro Selic", "PETR4"). `valorInvestido` é
 * sempre o total realmente aportado (custo), nunca uma cotação de mercado —
 * o objetivo aqui é controlar quanto entrou, não acompanhar valorização.
 */
export type Investment = {
  id: string;
  userId: string;
  nome: string;
  /** Nota livre opcional (ex: corretora, motivo do investimento, vencimento). */
  descricao?: string;
  tipo: InvestmentType;
  /** Só faz sentido quando `tipo` é "rendaVariavel". */
  subtipo?: InvestmentSubtipo;
  valorInvestido: number;
  /** Total de cotas/ações possuídas — só faz sentido para renda variável. */
  totalCotas?: number;
  /** Valor atual informado pelo usuário (cotação/saldo real). Ausente até o primeiro rendimento registrado. */
  saldoAtual?: number;
  /** Oculta o investimento das seções de resumo do Dashboard sem deixar de contar no patrimônio. */
  oculto?: boolean;
  criadoEm: number;
};

/**
 * Histórico de aportes/resgates/rendimentos de um investimento (ex: "comprei
 * 11 cotas a X"). Para "rendimento", `valor` é o delta do saldo atual (pode
 * ser negativo em caso de perda) e não afeta `valorInvestido`.
 */
export type InvestmentMovement = {
  id: string;
  userId: string;
  investimentoId: string;
  tipo: "aporte" | "resgate" | "rendimento";
  valor: number;
  /** Quantidade de cotas/ações desse movimento, quando aplicável. */
  cotas?: number;
  /** Banco de onde saiu (aporte) ou pra onde voltou (resgate) o dinheiro, quando informado. */
  bancoId?: string;
  /**
   * Delta real aplicado a `valorInvestido` nesse movimento (só em aporte/resgate).
   * Guardado explicitamente porque um resgate que supera o custo investido é
   * travado em 0 em vez de ficar negativo, então nem sempre é só ±valor —
   * sem isso, excluir o movimento não daria pra desfazer com exatidão.
   */
  custoDelta?: number;
  /** Delta aplicado a `saldoAtual` nesse movimento, só quando o investimento já tinha saldoAtual definido. */
  saldoDelta?: number;
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

/**
 * Retrato do patrimônio num mês — um documento por usuário+mês (id
 * `${userId}_${monthKey}`), atualizado sempre que o app é aberto naquele mês.
 * Meses passados ficam congelados no último valor visto; sem isso não dava
 * pra montar um gráfico de evolução, só o valor de agora.
 */
export type PatrimonioSnapshot = {
  id: string;
  userId: string;
  monthKey: string;
  contas: number;
  caixinhas: number;
  investimentos: number;
  dividas: number;
  total: number;
  criadoEm: number;
  atualizadoEm: number;
};

/**
 * Meta de valor total da carteira de investimentos (não por ativo). Dá pra
 * ter várias — funcionam como marcos: ao atingir o valor, a meta fica
 * marcada como concluída, sem deixar de contar as outras que ainda faltam.
 */
export type InvestmentGoal = {
  id: string;
  userId: string;
  /** Rótulo opcional (ex: "Reserva de emergência"). Sem isso, mostra só o valor. */
  nome?: string;
  metaValor: number;
  criadoEm: number;
};
