"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CategoryPieChart, MonthlyFlowChart } from "./Charts";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { computeCategoryBreakdown } from "@/lib/derived";
import { currentMonthKey } from "@/lib/format";
import type { Transaction } from "@/lib/types";

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
  const categoryBreakdown = computeCategoryBreakdown(transactions, monthKey);

  return (
    <div className="rounded-card bg-surface p-4">
      <div className="mb-4 grid grid-cols-2 gap-1.5">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-2 py-2 text-xs font-medium transition-colors ${
              tab === id
                ? "bg-accent-soft text-accent-strong"
                : "text-ink-muted hover:bg-bg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "categorias" && (
        <div className="mb-3">
          <MonthFilter monthKey={monthKey} onChange={setMonthKey} className="bg-bg" />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab === "categorias" ? `categorias-${monthKey}` : "evolucao"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "categorias" && (
            <CategoryPieChart
              data={categoryBreakdown}
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
