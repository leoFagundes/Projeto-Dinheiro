import { addMonthsToKey, formatMonthLabel, todayIsoDate } from "./format";

export type Granularidade = "semana" | "mes" | "ano";

/** Um intervalo fechado de datas ISO (yyyy-MM-dd), com rótulo pronto pra exibir. */
export type Periodo = {
  granularidade: Granularidade;
  inicio: string;
  fim: string;
  label: string;
};

/** Uma fatia de um período (um dia da semana/mês, ou um mês do ano) — eixo X dos gráficos. */
export type Bucket = {
  label: string;
  inicio: string;
  fim: string;
};

const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso: string, amount: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + amount);
  return isoOf(date);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIso(toIso).getTime() - parseIso(fromIso).getTime()) / 86_400_000);
}

function lastDayOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

function shortDate(iso: string): string {
  const date = parseIso(iso);
  return `${date.getDate()} ${MESES_CURTOS[date.getMonth()]}`;
}

/** Período (semana começando na segunda, mês ou ano) que contém a data `refIso`. */
export function periodContaining(granularidade: Granularidade, refIso: string = todayIsoDate()): Periodo {
  if (granularidade === "semana") {
    const ref = parseIso(refIso);
    const diasDesdeSegunda = (ref.getDay() + 6) % 7;
    const inicio = addDaysIso(refIso, -diasDesdeSegunda);
    const fim = addDaysIso(inicio, 6);
    return { granularidade, inicio, fim, label: `${shortDate(inicio)} – ${shortDate(fim)}` };
  }
  if (granularidade === "mes") {
    const monthKey = refIso.slice(0, 7);
    return {
      granularidade,
      inicio: `${monthKey}-01`,
      fim: lastDayOfMonth(monthKey),
      label: formatMonthLabel(monthKey),
    };
  }
  const year = refIso.slice(0, 4);
  return { granularidade, inicio: `${year}-01-01`, fim: `${year}-12-31`, label: year };
}

/** Anda `amount` períodos pra frente (ou pra trás, se negativo) a partir de `periodo`. */
export function shiftPeriod(periodo: Periodo, amount: number): Periodo {
  if (periodo.granularidade === "semana") {
    return periodContaining("semana", addDaysIso(periodo.inicio, amount * 7));
  }
  if (periodo.granularidade === "mes") {
    return periodContaining("mes", `${addMonthsToKey(periodo.inicio.slice(0, 7), amount)}-01`);
  }
  return periodContaining("ano", `${Number(periodo.inicio.slice(0, 4)) + amount}-01-01`);
}

export function isCurrentPeriod(periodo: Periodo): boolean {
  const hoje = todayIsoDate();
  return periodo.inicio <= hoje && hoje <= periodo.fim;
}

/**
 * Período anterior pra comparação. Se `periodo` ainda está em andamento, o
 * anterior é cortado no mesmo ponto (ex: dia 1 a 3 do mês passado, se hoje é
 * dia 3) — comparar o parcial de agora com o anterior inteiro sempre parecia
 * uma queda enorme no começo do período.
 */
export function comparisonRange(periodo: Periodo): { inicio: string; fim: string } {
  const anterior = shiftPeriod(periodo, -1);
  if (!isCurrentPeriod(periodo)) return { inicio: anterior.inicio, fim: anterior.fim };
  const decorridos = daysBetween(periodo.inicio, todayIsoDate());
  const fimCortado = addDaysIso(anterior.inicio, decorridos);
  return { inicio: anterior.inicio, fim: fimCortado < anterior.fim ? fimCortado : anterior.fim };
}

/** Fatias do período: os 7 dias da semana, os dias do mês ou os 12 meses do ano. */
export function periodBuckets(periodo: Periodo): Bucket[] {
  if (periodo.granularidade === "ano") {
    const year = periodo.inicio.slice(0, 4);
    return MESES_CURTOS.map((label, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
      return { label, inicio: `${monthKey}-01`, fim: lastDayOfMonth(monthKey) };
    });
  }
  const total = daysBetween(periodo.inicio, periodo.fim) + 1;
  return Array.from({ length: total }, (_, index) => {
    const dia = addDaysIso(periodo.inicio, index);
    const label = periodo.granularidade === "semana" ? DIAS_SEMANA[index] : String(Number(dia.slice(8, 10)));
    return { label, inicio: dia, fim: dia };
  });
}

/** Rótulo curto de um período pra eixo de gráfico (ex: "29 set", "out", "2026"). */
export function periodShortLabel(periodo: Periodo): string {
  if (periodo.granularidade === "semana") return shortDate(periodo.inicio);
  if (periodo.granularidade === "mes") {
    const mes = MESES_CURTOS[Number(periodo.inicio.slice(5, 7)) - 1];
    return periodo.inicio.slice(0, 4) === todayIsoDate().slice(0, 4) ? mes : `${mes}/${periodo.inicio.slice(2, 4)}`;
  }
  return periodo.inicio.slice(0, 4);
}

/** Como chamar "o período anterior" num texto (ex: "vs semana passada"). */
export function previousPeriodName(granularidade: Granularidade): string {
  if (granularidade === "semana") return "semana passada";
  if (granularidade === "mes") return "mês passado";
  return "ano passado";
}

/** Rótulo de dia pra cabeçalho de lista ("Hoje", "Ontem", "qua, 1 de out"). */
export function formatDayHeader(iso: string): string {
  const hoje = todayIsoDate();
  if (iso === hoje) return "Hoje";
  if (iso === addDaysIso(hoje, -1)) return "Ontem";
  if (iso === addDaysIso(hoje, 1)) return "Amanhã";
  const date = parseIso(iso);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(iso.slice(0, 4) === hoje.slice(0, 4) ? {} : { year: "numeric" }),
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
