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
 * Paleta categórica com ordem fixa validada para distinção sob daltonismo
 * (ver skill de dataviz). Como categorias agora são definidas pelo usuário,
 * a cor de cada uma é atribuída pela posição em que foi criada — nunca por
 * valor/ranking — e cicla se houver mais categorias do que cores.
 */
const CATEGORY_PALETTE = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#16a34a",
  "#4a3aa7",
  "#e34948",
];

/** Mapeia nome da categoria -> cor, na ordem em que cada categoria foi criada. */
export function assignCategoryColors(categories: Category[]): Map<string, string> {
  const ordered = [...categories].sort((a, b) => a.criadoEm - b.criadoEm);
  const colorByName = new Map<string, string>();
  let index = 0;
  for (const categoria of ordered) {
    if (colorByName.has(categoria.nome)) continue;
    colorByName.set(categoria.nome, CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]);
    index += 1;
  }
  return colorByName;
}

export const FALLBACK_CATEGORY_COLOR = "#94a3b8";

/** Mapeia nome da categoria -> ícone escolhido (ou o ícone padrão, se não houver). */
export function mapCategoryIcons(categories: Category[]): Map<string, string> {
  const iconByName = new Map<string, string>();
  for (const categoria of categories) {
    if (iconByName.has(categoria.nome)) continue;
    iconByName.set(categoria.nome, categoria.icone ?? FALLBACK_CATEGORY_ICON);
  }
  return iconByName;
}
