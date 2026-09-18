import { formatCurrency } from "@/lib/format";

export function Money({
  value,
  showSign = false,
  className = "",
}: {
  value: number;
  showSign?: boolean;
  className?: string;
}) {
  const isNegative = value < 0;
  const sign = showSign && value > 0 ? "+" : "";
  return (
    <span
      className={`${isNegative ? "text-negative" : "text-accent-strong"} ${className}`}
    >
      {sign}
      {formatCurrency(value)}
    </span>
  );
}
