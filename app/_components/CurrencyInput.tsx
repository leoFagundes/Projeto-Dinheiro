"use client";

import { formatCurrency } from "@/lib/format";

/** Campo de valor que formata como moeda enquanto o usuário digita (estilo calculadora/maquininha). */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  className = "",
  autoFocus,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const cents = Math.round(value * 100);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    onChange(Number(digits || "0") / 100);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoFocus={autoFocus}
      value={cents === 0 ? "" : formatCurrency(cents / 100)}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
