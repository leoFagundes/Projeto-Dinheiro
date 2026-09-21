"use client";

import { formatCurrency } from "@/lib/format";
import { useValuesVisibility } from "@/lib/visibility-context";

export function Money({
  value,
  showSign = false,
  className = "",
}: {
  value: number;
  showSign?: boolean;
  className?: string;
}) {
  const { hidden } = useValuesVisibility();
  const isNegative = value < 0;
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span
      className={`${isNegative ? "text-negative" : "text-accent-strong"} ${className}`}
    >
      {hidden ? "••••" : `${sign}${formatCurrency(value)}`}
    </span>
  );
}

/** Como Money, mas sem colorir por sinal — pra valores neutros (ex: "Contas: R$X"). */
export function MaskedCurrency({ value, className = "" }: { value: number; className?: string }) {
  const { hidden } = useValuesVisibility();
  return <span className={className}>{hidden ? "••••" : formatCurrency(value)}</span>;
}
