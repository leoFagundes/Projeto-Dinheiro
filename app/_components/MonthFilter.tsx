import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonthsToKey, currentMonthKey, formatMonthLabel } from "@/lib/format";

export function MonthFilter({
  monthKey,
  onChange,
  className = "bg-surface",
}: {
  monthKey: string;
  onChange: (nextMonthKey: string) => void;
  /** Cor de fundo do card — troque pra "bg-bg" quando já estiver dentro de um card bg-surface. */
  className?: string;
}) {
  const mesAtual = currentMonthKey();
  return (
    <div className={`flex items-center justify-between rounded-card px-4 py-3 ${className}`}>
      <button
        onClick={() => onChange(addMonthsToKey(monthKey, -1))}
        aria-label="Mês anterior"
        className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{formatMonthLabel(monthKey)}</span>
        {monthKey !== mesAtual && (
          <button onClick={() => onChange(mesAtual)} className="text-[11px] text-accent-strong hover:underline">
            voltar para este mês
          </button>
        )}
      </div>
      <button
        onClick={() => onChange(addMonthsToKey(monthKey, 1))}
        aria-label="Mês seguinte"
        className="text-ink-muted transition-transform active:scale-90 hover:text-ink"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
