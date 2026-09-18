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
  criadoEm: number;
};

/** "Caixinha": reserva de dinheiro guardado para um objetivo. */
export type Pocket = {
  id: string;
  userId: string;
  nome: string;
  saldo: number;
  criadoEm: number;
};
