/**
 * Modos de jogo do easter egg — assim como os skins (lib/shop-items.ts), são
 * comprados com a mesma "carteira" (itensComprados) e a mesma regra do
 * Firestore, então não precisou de nada novo lá. Escolhido no menu, antes
 * de jogar — a escolha em si não é salva (sempre volta pro Clássico ao
 * reabrir o jogo), só a posse de cada modo é persistente.
 */

export type GameModeId = "classico" | "oscilante" | "caotico";

export type GameModeDef = {
  id: GameModeId;
  nome: string;
  descricao: string;
  preco: number;
};

export const DEFAULT_MODE_ID: GameModeId = "classico";

export const GAME_MODES: GameModeDef[] = [
  { id: "classico", nome: "Clássico", descricao: "O jeito de sempre.", preco: 0 },
  { id: "oscilante", nome: "Vaivém", descricao: "As pilastras sobem e descem sem parar.", preco: 50 },
  { id: "caotico", nome: "Caos", descricao: "Blocos avulsos em qualquer altura da tela.", preco: 90 },
];

export function getGameMode(id: string | undefined): GameModeDef {
  return GAME_MODES.find((mode) => mode.id === id) ?? GAME_MODES[0];
}
