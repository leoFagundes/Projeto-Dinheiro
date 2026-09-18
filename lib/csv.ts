import type { Bank, Pocket, Transaction } from "./types";

function escapeCsvField(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvBlock(header: string[], rows: string[][]): string {
  return [header, ...rows].map((row) => row.join(",")).join("\n");
}

export function transactionsToCsv(
  transactions: Transaction[],
  banks: Bank[] = [],
  pockets: Pocket[] = [],
): string {
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));

  const transacoesCsv = toCsvBlock(
    ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Recorrente", "Banco"],
    transactions.map((t) => [
      t.data,
      t.tipo,
      escapeCsvField(t.categoria),
      escapeCsvField(t.descricao),
      t.valor.toFixed(2),
      t.recorrente ? "sim" : "não",
      t.bancoId ? escapeCsvField(bankNameById.get(t.bancoId) ?? "") : "",
    ]),
  );

  const bancosCsv = toCsvBlock(
    ["Banco", "Saldo devedor"],
    banks.map((b) => [escapeCsvField(b.nome), b.saldoDevedor.toFixed(2)]),
  );

  const caixinhasCsv = toCsvBlock(
    ["Caixinha", "Saldo guardado"],
    pockets.map((p) => [escapeCsvField(p.nome), p.saldo.toFixed(2)]),
  );

  return [transacoesCsv, bancosCsv, caixinhasCsv].join("\n\n");
}

export function downloadTransactionsCsv(
  transactions: Transaction[],
  banks: Bank[] = [],
  pockets: Pocket[] = [],
): void {
  const csv = transactionsToCsv(transactions, banks, pockets);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
