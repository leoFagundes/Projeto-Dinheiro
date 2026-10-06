export type TransactionType = "receita" | "despesa";

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
  /** Frequência da recorrência. Ausente = "mensal" (padrão histórico). */
  recorrenciaIntervalo?: "mensal" | "anual";
  /**
   * Só no template de uma recorrência: meses (yyyy-MM) cuja cobrança gerada
   * foi excluída de propósito — o gerador automático não recria esses meses,
   * e eles também não aparecem como "previsto". Sem isso, excluir a cobrança
   * do mês fazia ela voltar na próxima vez que o app abria.
   */
  mesesExcluidos?: string[];
  /** Agrupa todas as parcelas de uma mesma compra parcelada (ou empréstimo, ver `emprestimoId`) */
  compraId?: string;
  parcelaAtual?: number;
  parcelaTotal?: number;
  /**
   * Vincula a receita do valor recebido e todas as parcelas de um mesmo
   * empréstimo (ver `addLoan`) — mesmo id nos dois lados, permite reconstruir
   * o empréstimo inteiro a partir das transações, sem coleção separada.
   */
  emprestimoId?: string;
  /**
   * Valor/data originalmente combinados pra esta parcela, congelados na
   * criação. `valor`/`data` continuam sendo o estado atual (o que realmente
   * vai sair da conta e quando) — pagar antes ou depois do previsto, por um
   * valor diferente (desconto/multa), edita só `valor`/`data`; comparar com
   * `valorOriginal`/`dataVencimento` é o que mostra "economizou/pagou a mais".
   * Uma parcela é considerada paga quando `data` (o estado atual) já passou.
   */
  valorOriginal?: number;
  dataVencimento?: string;
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
  /**
   * Cor da categoria: posição na paleta categórica (0-based, ver
   * CATEGORY_PALETTE — muda de tom com o tema claro/escuro) ou uma cor livre
   * em hex ("#rrggbb", igual nos dois temas). Uma categoria nova recebe por
   * padrão uma cor que nenhuma outra usa, mas o usuário pode escolher qualquer
   * uma, inclusive repetida.
   */
  cor?: number | string;
  criadoEm: number;
};

/**
 * Movimento de uma caixinha: depósito/retirada ou "rendimento" — ajuste do
 * saldo atual informado pelo usuário para refletir o que a caixinha rendeu,
 * sem contar como aporte novo. Para rendimento, `valor` é o delta (pode ser
 * negativo).
 */
export type PocketMovement = {
  id: string;
  userId: string;
  pocketId: string;
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
  /** Só esmaece a caixinha na lista — continua contando no total guardado. */
  oculto?: boolean;
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
  /** Só esmaece o investimento na lista — continua contando no valor total. */
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

export type FeedbackTipo = "bug" | "sugestao" | "elogio" | "outro";
export type FeedbackStatus = "novo" | "lido" | "resolvido";

/**
 * Feedback enviado pelo usuário via Ajustes → Feedback. Só é criado pelo
 * usuário — a leitura e a gestão (mudar status, excluir) acontecem em
 * /admin, via SDK Admin, que ignora as regras do Firestore. O usuário nunca
 * lê o que já enviou de volta.
 */
export type Feedback = {
  id: string;
  userId: string;
  userEmail: string;
  tipo: FeedbackTipo;
  mensagem: string;
  status: FeedbackStatus;
  criadoEm: number;
};

/**
 * Progresso de uma conta no easter egg (jogo em Ajustes). Um documento por
 * conta (id do doc = uid, como em `userPreferences`) — é o que permite um
 * ranking compartilhado entre todos os perfis: qualquer usuário autenticado
 * pode ler a coleção inteira, mas só o dono do documento pode escrever
 * nele. `pontuacoesPorModo` guarda um recorde separado por modo de jogo (ver
 * lib/game-modes.ts) — cada chave só sobe (a regra do Firestore recusa
 * sozinha uma pontuação menor); `moedas` acumula partida após partida (é
 * uma "carteira" persistente) e pode ser gasta na loja —
 * `itensComprados`/`passarinhoEquipado` guardam o que foi comprado e qual
 * skin está ativo (ver lib/shop-items.ts).
 */
export type GameScore = {
  id: string;
  nickname: string;
  pontuacoesPorModo?: Partial<Record<string, number>>;
  moedas: number;
  itensComprados?: string[];
  passarinhoEquipado?: string;
  atualizadoEm: number;
};
