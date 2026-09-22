export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Formata porcentagem sem casas fixas: inteiro fica sem decimal, fracionário mostra até `maxDecimals` — sem isso, valores pequenos (ex: 0,2%) apareciam arredondados pra "0%". */
export function formatPercent(value: number, maxDecimals = 2): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })}%`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

/** Chave yyyy-MM do mês atual, usada para filtrar/agrupar transações. */
export function currentMonthKey(): string {
  return monthKeyOf(new Date());
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyOfIsoDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function yearOfIsoDate(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function addMonthsToKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return monthKeyOf(date);
}

/** Garante que o dia exista no mês de destino (ex: dia 31 num mês de 30 dias). */
export function clampDayToMonth(monthKey: string, day: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return String(Math.min(day, lastDay)).padStart(2, "0");
}

/** Divide um valor total em N parcelas cujo somatório bate exatamente com o total (em centavos). */
export function splitInstallments(total: number, count: number): number[] {
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

export function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
