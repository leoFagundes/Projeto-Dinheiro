import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Setinha + variação percentual entre dois valores. `invert` inverte a cor
 * de "bom/ruim" (ex: despesa subindo é ruim, então invert=true deixa vermelho).
 */
export function TrendIndicator({
  current,
  previous,
  invert = false,
  className = "",
}: {
  current: number;
  previous: number | null;
  invert?: boolean;
  className?: string;
}) {
  if (previous === null || previous === 0) return null;
  const variacao = ((current - previous) / Math.abs(previous)) * 100;
  if (variacao === 0) return null;

  const isUp = variacao > 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${isGood ? "text-accent-strong" : "text-negative"} ${className}`}
    >
      <Icon size={12} />
      {Math.abs(variacao).toFixed(0)}%
    </span>
  );
}
