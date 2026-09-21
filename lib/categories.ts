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
 * (ver skill de dataviz). Como categorias agora são definidas pelo usuário,
 * a cor de cada uma é atribuída pela posição em que foi criada — nunca por
 * valor/ranking — e cicla se houver mais categorias do que cores.
 */
export const CATEGORY_PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#16a34a",
  "#4a3aa7",
  "#e34948",
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
