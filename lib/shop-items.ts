/**
 * Catálogo da loja do easter egg — conteúdo do app, não dado do usuário, por
 * isso fica aqui como uma constante e não numa coleção do Firestore. Cada
 * skin reaproveita a mesma geometria do passarinho (BirdIcon/drawBird), só
 * trocando cor (corpo/corpo-forte) e, em alguns, um acessório extra (óculos,
 * coroa, tapa-olho...) — dá variedade real sem precisar de asset novo.
 */

export type BirdAccessory = "oculos" | "coroa" | "tapaOlho" | "gravata";

export type BirdSkin = {
  id: string;
  nome: string;
  preco: number;
  corpo: string;
  corpoForte: string;
  acessorio?: BirdAccessory;
};

export const DEFAULT_SKIN_ID = "classico";

// O "Clássico" usa as CSS custom properties do tema (não uma cor fixa) —
// assim ele continua acompanhando claro/escuro sozinho, como sempre foi.
// Os outros skins são cores fixas de propósito (um "Dourado" cinza no modo
// escuro não faria sentido).
export const BIRD_SKINS: BirdSkin[] = [
  { id: "classico", nome: "Clássico", preco: 0, corpo: "var(--color-accent)", corpoForte: "var(--color-accent-strong)" },
  { id: "dourado", nome: "Dourado", preco: 20, corpo: "#f5c542", corpoForte: "#c9971f" },
  { id: "prata", nome: "Prata", preco: 30, corpo: "#cbd5e1", corpoForte: "#64748b" },
  { id: "esmeralda", nome: "Esmeralda", preco: 40, corpo: "#2dd4bf", corpoForte: "#0f766e" },
  { id: "safira", nome: "Safira", preco: 50, corpo: "#60a5fa", corpoForte: "#1d4ed8" },
  { id: "rubi", nome: "Rubi", preco: 60, corpo: "#f87171", corpoForte: "#b91c1c" },
  { id: "rosa", nome: "Rosa", preco: 70, corpo: "#f9a8d4", corpoForte: "#db2777" },
  { id: "pirata", nome: "Pirata", preco: 80, corpo: "#a8a29e", corpoForte: "#44403c", acessorio: "tapaOlho" },
  { id: "estrela-rock", nome: "Estrela do Rock", preco: 90, corpo: "#3f3f46", corpoForte: "#18181b", acessorio: "oculos" },
  { id: "ametista", nome: "Ametista", preco: 100, corpo: "#a78bfa", corpoForte: "#6d28d9" },
  { id: "executivo", nome: "Executivo", preco: 130, corpo: "#38bdf8", corpoForte: "#0369a1", acessorio: "gravata" },
  { id: "realeza", nome: "Realeza", preco: 160, corpo: "#c084fc", corpoForte: "#7e22ce", acessorio: "coroa" },
];

export function getSkin(id: string | undefined): BirdSkin {
  return BIRD_SKINS.find((skin) => skin.id === id) ?? BIRD_SKINS[0];
}
