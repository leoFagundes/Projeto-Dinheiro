import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonthsToKey, formatMonthLabel } from "@/lib/format";

export function MonthFilter({
  monthKey,
  onChange,
}: {
  monthKey: string;
  onChange: (nextMonthKey: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-card bg-surface px-4 py-3">
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
