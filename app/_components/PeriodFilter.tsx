"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayIsoDate } from "@/lib/format";
import {
  isCurrentPeriod,
  periodContaining,
  shiftPeriod,
  type Granularidade,
  type Periodo,
} from "@/lib/periods";

const OPCOES: { id: Granularidade; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

const NOME_ATUAL: Record<Granularidade, string> = {
  semana: "esta semana",
  mes: "este mês",
  ano: "este ano",
};

/** Escolhe a granularidade (semana/mês/ano) e navega entre períodos — fica acima de tudo que ele filtra. */
export function PeriodFilter({ periodo, onChange }: { periodo: Periodo; onChange: (next: Periodo) => void }) {
  const atual = isCurrentPeriod(periodo);

  function changeGranularidade(granularidade: Granularidade) {
    if (granularidade === periodo.granularidade) return;
    // Trocar de "Mês" pra "Ano" mantém o contexto: o ano do mês que estava
    // aberto (ou a semana de hoje, se o período era o atual).
    onChange(periodContaining(granularidade, atual ? todayIsoDate() : periodo.inicio));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1 shadow-card">
        {OPCOES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => changeGranularidade(id)}
            className={`relative rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
              periodo.granularidade === id ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
            }`}
          >
            {periodo.granularidade === id && (
              <motion.span
                layoutId="period-filter-pill"
                className="absolute inset-0 rounded-xl bg-accent-soft"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-card bg-surface px-4 py-3 shadow-card">
        <button
          onClick={() => onChange(shiftPeriod(periodo, -1))}
          aria-label="Período anterior"
          className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium">{periodo.label}</span>
          {!atual && (
            <button
              onClick={() => onChange(periodContaining(periodo.granularidade))}
              className="text-[11px] text-accent-strong hover:underline"
            >
              voltar para {NOME_ATUAL[periodo.granularidade]}
            </button>
          )}
        </div>
        <button
          onClick={() => onChange(shiftPeriod(periodo, 1))}
          aria-label="Próximo período"
          className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
