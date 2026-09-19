import {
  computeBankBreakdown,
  computeBankSaldoConta,
  computeCategoryBreakdown,
  computeMonthTotals,
  computePocketRendimento,
} from "./derived";
import { formatMonthLabel, monthKeyOfIsoDate } from "./format";
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

function escapeCsvField(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Números em formato BR (vírgula decimal), pra abrir certinho no Excel/Sheets em pt-BR. */
function formatNumberBr(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function toCsvBlock(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.join(";")).join("\n");
}

export type MonthlyReportInput = {
  transactions: Transaction[];
  monthKey: string;
  banks: Bank[];
  pockets: Pocket[];
  investments: Investment[];
  pocketMovements: PocketMovement[];
  bankPayments: BankPayment[];
  investmentMovements: InvestmentMovement[];
  bankTransfers: BankTransfer[];
};

/**
 * Monta um relatório financeiro completo de um mês: resumo, transações
 * detalhadas, gastos por categoria, situação de cada banco e o retrato atual
 * de caixinhas/investimentos (que não são mensais, mas ajudam a fechar o
 * panorama). Separador ";" e decimal com vírgula pra abrir bem no Excel BR.
 */
export function buildMonthlyReportCsv(input: MonthlyReportInput): string {
  const {
    transactions,
    monthKey,
    banks,
    pockets,
    investments,
    pocketMovements,
    bankPayments,
    investmentMovements,
    bankTransfers,
  } = input;

  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));
  const monthTransactions = transactions
    .filter((t) => monthKeyOfIsoDate(t.data) === monthKey)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));

  const cabecalho = [
    "Relatório financeiro",
    formatMonthLabel(monthKey),
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
  ].join("\n");

  const { receitas, despesas, saldoMes } = computeMonthTotals(transactions, monthKey);
  const resumoCsv = toCsvBlock(
    ["Resumo do mês", "Valor"],
    [
      ["Receitas", formatNumberBr(receitas)],
      ["Despesas", formatNumberBr(despesas)],
      ["Saldo do mês", formatNumberBr(saldoMes)],
    ],
  );

  const transacoesCsv = toCsvBlock(
    [
      "Data",
      "Tipo",
      "Categoria",
      "Descrição",
      "Valor",
      "Forma de pagamento",
      "Banco",
      "Recorrente",
      "Parcela",
    ],
    monthTransactions.map((t) => [
      t.data,
      t.tipo === "receita" ? "Receita" : "Despesa",
      escapeCsvField(t.categoria),
      escapeCsvField(t.descricao),
      formatNumberBr(t.valor),
      t.tipo === "despesa" ? (t.formaPagamento === "debito" ? "Débito" : "Crédito") : "",
      t.bancoId ? escapeCsvField(bankNameById.get(t.bancoId) ?? "Banco removido") : "",
      t.recorrente ? "Sim" : "Não",
      t.parcelaTotal ? `${t.parcelaAtual}/${t.parcelaTotal}` : "",
    ]),
  );

  const blocks = [cabecalho, resumoCsv, transacoesCsv];

  const categoryBreakdown = computeCategoryBreakdown(transactions, monthKey);
  if (categoryBreakdown.length > 0) {
    blocks.push(
      toCsvBlock(
        ["Gastos por categoria", "Total", "% das despesas do mês"],
        categoryBreakdown.map((item) => [
          escapeCsvField(item.categoria),
          formatNumberBr(item.total),
          despesas > 0 ? `${((item.total / despesas) * 100).toFixed(1)}%` : "0%",
        ]),
      ),
    );
  }

  if (banks.length > 0) {
    const bankBreakdown = computeBankBreakdown(transactions, monthKey, banks);
    blocks.push(
      toCsvBlock(
        ["Banco", "Fatura do mês", "Saldo em conta", "Saldo anterior"],
        banks.map((b) => {
          const fatura = bankBreakdown.find((item) => item.bancoId === b.id)?.total ?? 0;
          const saldoConta = computeBankSaldoConta(
            b,
            transactions,
            pocketMovements,
            bankPayments,
            investmentMovements,
            bankTransfers,
          );
          return [
            escapeCsvField(b.nome),
            formatNumberBr(fatura),
            formatNumberBr(saldoConta),
            formatNumberBr(b.saldoDevedor),
          ];
        }),
      ),
    );
  }

  if (pockets.length > 0) {
    blocks.push(
      toCsvBlock(
        ["Caixinha (saldo atual)", "Saldo guardado", "Rendimento acumulado"],
        pockets.map((p) => [
          escapeCsvField(p.nome),
          formatNumberBr(p.saldo),
          formatNumberBr(computePocketRendimento(p, pocketMovements)),
        ]),
      ),
    );
  }

  if (investments.length > 0) {
    blocks.push(
      toCsvBlock(
        ["Investimento (saldo atual)", "Tipo", "Valor investido", "Valor atual", "Rendimento", "Cotas"],
        investments.map((i) => {
          const valorAtual = i.saldoAtual ?? i.valorInvestido;
          return [
            escapeCsvField(i.nome),
            i.tipo === "rendaVariavel" ? "Renda variável" : "Renda fixa",
            formatNumberBr(i.valorInvestido),
            formatNumberBr(valorAtual),
            formatNumberBr(valorAtual - i.valorInvestido),
            i.totalCotas ? String(i.totalCotas) : "",
          ];
        }),
      ),
    );
  }

  return blocks.join("\n\n");
}

export function downloadMonthlyReportCsv(input: MonthlyReportInput): void {
  const csv = buildMonthlyReportCsv(input);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-${input.monthKey}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
