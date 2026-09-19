"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Receipt, Search, X } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { usePockets } from "@/lib/use-pockets";
import { usePocketMovements } from "@/lib/use-pocket-movements";
import { useInvestments } from "@/lib/use-investments";
import { assignCategoryColors, mapCategoryIcons } from "@/lib/categories";
import { computeMonthTotals } from "@/lib/derived";
import { currentMonthKey, formatCurrency, monthKeyOfIsoDate } from "@/lib/format";
import { downloadTransactionsCsv } from "@/lib/csv";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { EmptyState } from "@/app/_components/EmptyState";
import { TransactionListItem } from "@/app/_components/TransactionListItem";
import { PageFade } from "@/app/_components/PageFade";
import { ListSkeleton } from "@/app/_components/Skeleton";

export default function HistoricoPage() {
  const { transactions, loading, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { banks } = useBanks();
  const { pockets } = usePockets();
  const { movements: pocketMovements } = usePocketMovements();
  const { investments } = useInvestments();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [busca, setBusca] = useState("");

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="text-lg font-semibold">Histórico</h1>
        <ListSkeleton />
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();
  const buscando = termo !== "";

  const resultadosBusca = buscando
    ? transactions.filter(
        (t) =>
          t.descricao.toLowerCase().includes(termo) ||
          t.categoria.toLowerCase().includes(termo),
      )
    : [];

  const monthTransactions = transactions.filter(
    (t) => monthKeyOfIsoDate(t.data) === monthKey,
  );
  const { receitas, despesas, saldoMes } = computeMonthTotals(transactions, monthKey);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));

  const listaExibida = buscando ? resultadosBusca : monthTransactions;

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Histórico</h1>
          <button
            onClick={() =>
              downloadTransactionsCsv(transactions, banks, pockets, investments, pocketMovements)
            }
            className="flex items-center gap-1.5 text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-10 pr-9 text-sm outline-none transition-colors focus:border-accent"
          />
          {buscando && (
            <button
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!buscando && <MonthFilter monthKey={monthKey} onChange={setMonthKey} />}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={buscando ? `busca-${termo}` : monthKey}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-4"
          >
            {!buscando && (
              <div className="grid grid-cols-3 gap-2 rounded-card bg-surface p-4 text-center">
                <div>
                  <p className="text-xs text-ink-muted">Receitas</p>
                  <p className="mt-0.5 text-sm font-semibold text-accent-strong">
                    {formatCurrency(receitas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Despesas</p>
                  <p className="mt-0.5 text-sm font-semibold text-negative">
                    {formatCurrency(despesas)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Saldo</p>
                  <p
                    className={`mt-0.5 text-sm font-semibold ${
                      saldoMes < 0 ? "text-negative" : "text-accent-strong"
                    }`}
                  >
                    {formatCurrency(saldoMes)}
                  </p>
                </div>
              </div>
            )}

            {listaExibida.length === 0 ? (
              <EmptyState
                icon={buscando ? Search : Receipt}
                title={buscando ? "Nada encontrado" : "Nada por aqui"}
                description={
                  buscando
                    ? "Nenhuma transação corresponde a essa busca."
                    : "Nenhuma transação registrada neste mês."
                }
              />
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {listaExibida.map((transaction) => (
                    <TransactionListItem
                      key={transaction.id}
                      transaction={transaction}
                      onDelete={deleteTransaction}
                      colorByCategoria={colorByCategoria}
                      iconByCategoria={iconByCategoria}
                      bankNameById={bankNameById}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageFade>
  );
}
