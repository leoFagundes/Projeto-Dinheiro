"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CategoryPieChart, MonthlyFlowChart } from "./Charts";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { computeCategoryBreakdown } from "@/lib/derived";
import { addMonthsToKey, currentMonthKey } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";

type Tab = "categorias" | "evolucao";

const TABS: { id: Tab; label: string }[] = [
  { id: "categorias", label: "Categorias" },
  { id: "evolucao", label: "Evolução" },
];

export function AnalisesCard({
  transactions,
  colorByCategoria,
  iconByCategoria,
  monthlyFlow,
}: {
  transactions: Transaction[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  monthlyFlow: { monthKey: string; receitas: number; despesas: number; saldoMes: number }[];
}) {
  const [tab, setTab] = useState<Tab>("categorias");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [categoriaTipo, setCategoriaTipo] = useState<TransactionType>("despesa");

  const previousMonthKey = addMonthsToKey(monthKey, -1);
  const categoryBreakdown = computeCategoryBreakdown(transactions, monthKey, categoriaTipo);
  const categoryBreakdownAnterior = computeCategoryBreakdown(transactions, previousMonthKey, categoriaTipo);

  return (
    <div className="rounded-card bg-surface shadow-card p-4">
      <div className="mb-4 -mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              tab === id ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
            }`}
          >
            {tab === id && (
              <motion.span
                layoutId="analises-tab-pill"
                className="absolute inset-0 rounded-xl bg-accent-soft"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {tab === "categorias" && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setCategoriaTipo("despesa")}
              className={`relative rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
                categoriaTipo === "despesa" ? "text-negative" : "text-ink-muted hover:bg-bg"
              }`}
            >
              {categoriaTipo === "despesa" && (
                <motion.span
                  layoutId="analises-categoria-tipo-pill"
                  className="absolute inset-0 rounded-xl bg-negative-soft"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative">Despesas</span>
            </button>
            <button
              onClick={() => setCategoriaTipo("receita")}
              className={`relative rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
                categoriaTipo === "receita" ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
              }`}
            >
              {categoriaTipo === "receita" && (
                <motion.span
                  layoutId="analises-categoria-tipo-pill"
                  className="absolute inset-0 rounded-xl bg-accent-soft"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative">Receitas</span>
            </button>
          </div>
          <div className="mb-3">
            <MonthFilter monthKey={monthKey} onChange={setMonthKey} className="bg-bg" />
          </div>
        </>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab === "categorias" ? `categorias-${categoriaTipo}-${monthKey}` : tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "categorias" && (
            <CategoryPieChart
              data={categoryBreakdown}
              previousData={categoryBreakdownAnterior}
              tipo={categoriaTipo}
              colorByCategoria={colorByCategoria}
              iconByCategoria={iconByCategoria}
            />
          )}
          {tab === "evolucao" && <MonthlyFlowChart data={monthlyFlow} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
