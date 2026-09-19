import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonthsToKey, formatMonthLabel } from "@/lib/format";

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
  return (
    <div className={`flex items-center justify-between rounded-card px-4 py-3 ${className}`}>
      <button
        onClick={() => onChange(addMonthsToKey(monthKey, -1))}
        aria-label="Mês anterior"
        className="text-ink-muted hover:text-ink"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="text-sm font-medium">{formatMonthLabel(monthKey)}</span>
      <button
        onClick={() => onChange(addMonthsToKey(monthKey, 1))}
        aria-label="Mês seguinte"
        className="text-ink-muted hover:text-ink"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
