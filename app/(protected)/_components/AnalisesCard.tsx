"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CategoryPieChart, FlowTrendChart } from "./Charts";
import { CategoryDetailSheet } from "./CategoryDetailSheet";
import { TipoToggle } from "./TipoToggle";
import { MonthFilter } from "@/app/_components/MonthFilter";
import { computeCategoryBreakdown } from "@/lib/derived";
import { computeFlowTrend } from "@/lib/analytics";
import { periodContaining } from "@/lib/periods";
import { addMonthsToKey, currentMonthKey } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";

type Tab = "categorias" | "evolucao";

const TABS: { id: Tab; label: string }[] = [
  { id: "categorias", label: "Categorias" },
  { id: "evolucao", label: "Evolução" },
];

/** Versão compacta das análises no Dashboard — a completa (semana/mês/ano) fica em /analises. */
export function AnalisesCard({
  transactions,
  colorByCategoria,
  iconByCategoria,
  originDateById,
}: {
  transactions: Transaction[];
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  originDateById: Map<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("categorias");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [categoriaTipo, setCategoriaTipo] = useState<TransactionType>("despesa");
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);

  const categoryBreakdown = computeCategoryBreakdown(transactions, monthKey, categoriaTipo);
  const categoryBreakdownAnterior = computeCategoryBreakdown(transactions, addMonthsToKey(monthKey, -1), categoriaTipo);
  const periodoMes = periodContaining("mes", `${monthKey}-01`);

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
          <TipoToggle value={categoriaTipo} onChange={setCategoriaTipo} />
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
              onSelectCategoria={setCategoriaAberta}
            />
          )}
          {tab === "evolucao" && (
            <FlowTrendChart data={computeFlowTrend(transactions, periodContaining("mes"), 6)} />
          )}
        </motion.div>
      </AnimatePresence>

      <Link
        href="/analises"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-bg px-4 py-2.5 text-sm font-medium text-accent-strong transition-transform active:scale-[0.98]"
      >
        Ver análises por semana, mês e ano
        <ArrowRight size={15} />
      </Link>

      <CategoryDetailSheet
        categoria={categoriaAberta}
        tipo={categoriaTipo}
        periodo={periodoMes}
        transactions={transactions}
        colorByCategoria={colorByCategoria}
        iconByCategoria={iconByCategoria}
        originDateById={originDateById}
        onClose={() => setCategoriaAberta(null)}
      />
    </div>
  );
}
