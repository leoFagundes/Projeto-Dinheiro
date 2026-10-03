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
 * Paleta categórica com ordem fixa validada para distinção sob daltonismo
 * (ver skill de dataviz) — variáveis CSS, com tons próprios no modo escuro
 * (definidos em globals.css). Como categorias são definidas pelo usuário, a
 * cor de cada uma é atribuída pela posição em que foi criada — nunca por
 * valor/ranking — e cicla se houver mais categorias do que cores (por isso o
 * donut agrupa a cauda em "Demais", ver CategoryPieChart).
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
];

/** Mapeia categoria (tipo+nome) -> cor, na ordem em que cada categoria foi criada. */
export function assignCategoryColors(categories: Category[]): Map<string, string> {
  const ordered = [...categories].sort((a, b) => a.criadoEm - b.criadoEm);
  const colorByKey = new Map<string, string>();
  let index = 0;
  for (const categoria of ordered) {
    const key = categoryKey(categoria.tipo, categoria.nome);
    if (colorByKey.has(key)) continue;
    colorByKey.set(key, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]);
    index += 1;
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
