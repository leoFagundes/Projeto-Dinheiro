"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CategoryPieChart, BalanceTrendChart } from "./Charts";

type Tab = "categorias" | "evolucao";

const TABS: { id: Tab; label: string }[] = [
  { id: "categorias", label: "Categorias" },
  { id: "evolucao", label: "Evolução" },
];

export function AnalisesCard({
  categoryBreakdown,
  colorByCategoria,
  iconByCategoria,
  balanceTrend,
}: {
  categoryBreakdown: { categoria: string; total: number }[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  balanceTrend: { monthKey: string; saldo: number }[];
}) {
  const [tab, setTab] = useState<Tab>("categorias");

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

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
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
          {tab === "evolucao" && <BalanceTrendChart data={balanceTrend} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
