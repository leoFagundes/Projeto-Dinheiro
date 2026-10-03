"use client";

import { useId } from "react";
import { motion } from "motion/react";
import type { TransactionType } from "@/lib/types";

/** Alterna entre ver despesas ou receitas num gráfico de categorias. */
export function TipoToggle({ value, onChange }: { value: TransactionType; onChange: (next: TransactionType) => void }) {
  // layoutId único por instância — o dashboard e a página de Análises podem
  // ter um cada, e o mesmo id faria a "pílula" pular de um pro outro.
  const layoutId = useId();
  return (
    <div className="mb-3 grid grid-cols-2 gap-1.5">
      <button
        onClick={() => onChange("despesa")}
        className={`relative rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
          value === "despesa" ? "text-negative" : "text-ink-muted hover:bg-bg"
        }`}
      >
        {value === "despesa" && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-xl bg-negative-soft"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative">Despesas</span>
      </button>
      <button
        onClick={() => onChange("receita")}
        className={`relative rounded-xl px-2 py-1.5 text-xs font-medium transition-colors ${
          value === "receita" ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
        }`}
      >
        {value === "receita" && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-xl bg-accent-soft"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative">Receitas</span>
      </button>
    </div>
  );
}
