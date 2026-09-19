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
  criadoEm: number;
};

/** Pagamento de fatura/dívida de cartão — sai do saldo em conta do banco. */
export type BankPayment = {
  id: string;
  userId: string;
  bancoId: string;
  valor: number;
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};

export type InvestmentType = "rendaFixa" | "rendaVariavel";

/**
 * Um ativo de investimento (ex: "Tesouro Selic", "PETR4"). `valorInvestido` é
 * sempre o total realmente aportado (custo), nunca uma cotação de mercado —
 * o objetivo aqui é controlar quanto entrou, não acompanhar valorização.
 */
export type Investment = {
  id: string;
  userId: string;
  nome: string;
  tipo: InvestmentType;
  valorInvestido: number;
  /** Total de cotas/ações possuídas — só faz sentido para renda variável. */
  totalCotas?: number;
  /** Valor atual informado pelo usuário (cotação/saldo real). Ausente até o primeiro rendimento registrado. */
  saldoAtual?: number;
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
  /** ISO date string (yyyy-MM-dd) */
  data: string;
  criadoEm: number;
};
