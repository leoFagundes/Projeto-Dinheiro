import type { Category, TransactionType } from "./types";

/** Categorias usadas para popular a conta de um usuário novo. */
export const DEFAULT_CATEGORIES: { nome: string; tipo: TransactionType; icone: string }[] = [
  { nome: "Alimentação", tipo: "despesa", icone: "🍔" },
  { nome: "Transporte", tipo: "despesa", icone: "🚗" },
  { nome: "Lazer", tipo: "despesa", icone: "🎮" },
  { nome: "Contas", tipo: "despesa", icone: "📄" },
  { nome: "Outros", tipo: "despesa", icone: "📦" },
  { nome: "Salário", tipo: "receita", icone: "💰" },
  { nome: "Outros", tipo: "receita", icone: "📦" },
];

export const FALLBACK_CATEGORY_ICON = "🏷️";

/**
 * Chave usada pra indexar cor/ícone por categoria. Categorias de receita e
 * despesa não são únicas por nome (ex.: "Outros" existe nos dois tipos por
 * padrão), então indexar só pelo nome fazia uma roubar a cor/ícone da outra.
 */
export function categoryKey(tipo: TransactionType, nome: string): string {
  return `${tipo}:${nome}`;
}

/**
 * Paleta categórica — variáveis CSS com tons próprios no modo escuro
 * (definidas em globals.css). Escritas por extenso de propósito: o Tailwind
 * só gera as variáveis do @theme que encontra literalmente no código.
 */
export const CATEGORY_PALETTE = [
  "var(--color-cat-1)",
  "var(--color-cat-2)",
  "var(--color-cat-3)",
  "var(--color-cat-4)",
  "var(--color-cat-5)",
  "var(--color-cat-6)",
  "var(--color-cat-7)",
  "var(--color-cat-8)",
  "var(--color-cat-9)",
  "var(--color-cat-10)",
  "var(--color-cat-11)",
  "var(--color-cat-12)",
  "var(--color-cat-13)",
  "var(--color-cat-14)",
  "var(--color-cat-15)",
  "var(--color-cat-16)",
  "var(--color-cat-17)",
  "var(--color-cat-18)",
  "var(--color-cat-19)",
  "var(--color-cat-20)",
];

/**
 * Cor de uma posição da paleta. Passando das 20, gera tons extras espalhados
 * pelo ângulo áureo — ainda distintos, só menos afinados que os da paleta.
 */
export function categoryColorForSlot(slot: number): string {
  if (slot < CATEGORY_PALETTE.length) return CATEGORY_PALETTE[slot];
  const hue = Math.round((slot * 137.508) % 360);
  return `hsl(${hue} 55% 52%)`;
}

/** Posição da paleta (acompanha o tema claro/escuro) ou cor livre em hex ("#rrggbb"). */
export type CategoryColor = number | string;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isValidCategoryColor(cor: unknown): cor is CategoryColor {
  return (typeof cor === "number" && Number.isInteger(cor) && cor >= 0) || (typeof cor === "string" && HEX_COLOR.test(cor));
}

/** Valor CSS de uma cor de categoria. */
export function categoryColorValue(cor: CategoryColor): string {
  return typeof cor === "string" ? cor : categoryColorForSlot(cor);
}

/**
 * Cor de cada categoria (id -> cor). A cor escolhida pelo usuário é sempre
 * respeitada — mesmo que outra categoria use a mesma, foi escolha dele. Só as
 * categorias que ainda não têm cor salva (contas de antes das cores) recebem
 * uma posição livre da paleta, na ordem em que foram criadas.
 */
export function resolveCategoryColors(categories: Category[]): Map<string, CategoryColor> {
  const ordered = [...categories].sort((a, b) => a.criadoEm - b.criadoEm || a.id.localeCompare(b.id));
  const used = new Set<number>();
  const colorById = new Map<string, CategoryColor>();
  const pending: Category[] = [];
  for (const categoria of ordered) {
    if (isValidCategoryColor(categoria.cor)) {
      colorById.set(categoria.id, categoria.cor);
      if (typeof categoria.cor === "number") used.add(categoria.cor);
    } else {
      pending.push(categoria);
    }
  }
  let next = 0;
  for (const categoria of pending) {
    while (used.has(next)) next += 1;
    used.add(next);
    colorById.set(categoria.id, next);
  }
  return colorById;
}

/** Sugestão pra uma categoria nova: a primeira cor da paleta que nenhuma outra usa. */
export function nextFreeCategoryColor(categories: Category[]): number {
  const used = new Set(resolveCategoryColors(categories).values());
  let slot = 0;
  while (used.has(slot)) slot += 1;
  return slot;
}

/** Mapeia categoria (tipo+nome) -> cor (valor CSS). */
export function assignCategoryColors(categories: Category[]): Map<string, string> {
  const colorById = resolveCategoryColors(categories);
  const ordered = [...categories].sort((a, b) => a.criadoEm - b.criadoEm);
  const colorByKey = new Map<string, string>();
  for (const categoria of ordered) {
    const key = categoryKey(categoria.tipo, categoria.nome);
    if (colorByKey.has(key)) continue;
    colorByKey.set(key, categoryColorValue(colorById.get(categoria.id) ?? 0));
  }
  return colorByKey;
}

export const FALLBACK_CATEGORY_COLOR = "#94a3b8";

/** Fundo suave da bolinha do ícone de uma categoria (funciona com hex ou var(--...)). */
export function categoryTint(color: string): string {
  return `color-mix(in srgb, ${color} 14%, transparent)`;
}

/** Mapeia categoria (tipo+nome) -> ícone escolhido (ou o ícone padrão, se não houver). */
export function mapCategoryIcons(categories: Category[]): Map<string, string> {
  const iconByKey = new Map<string, string>();
  for (const categoria of categories) {
    const key = categoryKey(categoria.tipo, categoria.nome);
    if (iconByKey.has(key)) continue;
    iconByKey.set(key, categoria.icone ?? FALLBACK_CATEGORY_ICON);
  }
  return iconByKey;
}
