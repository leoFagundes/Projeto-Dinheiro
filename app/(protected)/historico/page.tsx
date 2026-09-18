"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Receipt } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { useCategories } from "@/lib/use-categories";
import { useBanks } from "@/lib/use-banks";
import { usePockets } from "@/lib/use-pockets";
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
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="text-lg font-semibold">Histórico</h1>
        <ListSkeleton />
      </div>
    );
  }

  const monthTransactions = transactions.filter(
    (t) => monthKeyOfIsoDate(t.data) === monthKey,
  );
  const { receitas, despesas, saldoMes } = computeMonthTotals(transactions, monthKey);
  const colorByCategoria = assignCategoryColors(categories);
  const iconByCategoria = mapCategoryIcons(categories);
  const bankNameById = new Map(banks.map((b) => [b.id, b.nome]));

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Histórico</h1>
          <button
            onClick={() => downloadTransactionsCsv(transactions, banks, pockets)}
            className="flex items-center gap-1.5 text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>

        <MonthFilter monthKey={monthKey} onChange={setMonthKey} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={monthKey}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col gap-4"
          >
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

            {monthTransactions.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nada por aqui"
                description="Nenhuma transação registrada neste mês."
              />
            ) : (
              <div className="flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {monthTransactions.map((transaction) => (
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
