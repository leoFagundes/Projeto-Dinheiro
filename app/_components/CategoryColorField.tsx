"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  CATEGORY_PALETTE,
  categoryColorForSlot,
  categoryColorValue,
  FALLBACK_CATEGORY_ICON,
  resolveCategoryColors,
  type CategoryColor,
} from "@/lib/categories";
import { BottomSheet } from "./BottomSheet";
import type { Category } from "@/lib/types";

const DEFAULT_CUSTOM_COLOR = "#2a78d6";

/**
 * Botão que mostra a cor da categoria e abre a escolha de cor. Qualquer cor
 * vale — inclusive uma que outra categoria já usa (o emoji de quem usa
 * aparece na bolinha, só pra informar) ou uma cor livre, pelo seletor do
 * próprio sistema.
 */
export function CategoryColorField({
  value,
  categories,
  excludeId,
  onChange,
}: {
  value: CategoryColor;
  categories: Category[];
  /** Categoria sendo editada — a cor dela não conta como "em uso por outra". */
  excludeId?: string;
  onChange: (cor: CategoryColor) => void;
}) {
  const [open, setOpen] = useState(false);

  const donosPorCor = new Map<CategoryColor, Category[]>();
  const colorById = resolveCategoryColors(categories);
  for (const categoria of categories) {
    const cor = colorById.get(categoria.id);
    if (categoria.id === excludeId || cor === undefined) continue;
    donosPorCor.set(cor, [...(donosPorCor.get(cor) ?? []), categoria]);
  }

  // Tons extras (além das 20) só aparecem se alguma categoria já usa um.
  const maiorPosicao = Math.max(
    typeof value === "number" ? value : -1,
    ...[...donosPorCor.keys()].filter((cor): cor is number => typeof cor === "number"),
  );
  const total = Math.max(CATEGORY_PALETTE.length, maiorPosicao + 1);
  const slots = Array.from({ length: total }, (_, index) => index);

  const personalizada = typeof value === "string";
  const corPersonalizada = personalizada ? value : DEFAULT_CUSTOM_COLOR;
  const donosDaPersonalizada = personalizada ? (donosPorCor.get(value) ?? []) : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Escolher cor"
        className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg transition-transform active:scale-95"
      >
        <span className="size-5 rounded-full" style={{ backgroundColor: categoryColorValue(value) }} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <p className="font-medium">Escolher cor</p>
        <p className="mb-4 mt-1 text-sm text-ink-muted">
          Escolha qualquer cor. As que têm um emoji já são usadas por outra categoria — dá pra repetir
          se quiser.
        </p>

        <div className="grid grid-cols-5 gap-3">
          {slots.map((index) => {
            const donos = donosPorCor.get(index) ?? [];
            const selected = value === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  onChange(index);
                  setOpen(false);
                }}
                aria-label={
                  donos.length > 0 ? `Cor ${index + 1}, usada por ${donos.map((d) => d.nome).join(", ")}` : `Cor ${index + 1}`
                }
                aria-pressed={selected}
                className={`relative mx-auto flex size-11 items-center justify-center rounded-full transition-transform active:scale-90 ${
                  selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
                }`}
                style={{ backgroundColor: categoryColorForSlot(index) }}
              >
                {selected ? (
                  <Check size={18} className="text-white drop-shadow" strokeWidth={3} />
                ) : donos.length > 0 ? (
                  <span className="text-base">{donos[0].icone ?? FALLBACK_CATEGORY_ICON}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <label className="relative mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-3 py-2.5 text-sm transition-colors hover:bg-bg">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
              personalizada ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
            }`}
            style={{
              background: personalizada
                ? corPersonalizada
                : "conic-gradient(#e34948, #eda100, #26c526, #47b8c2, #2a78d6, #8954d4, #ca31d8, #e34948)",
            }}
          >
            {personalizada && <Check size={16} className="text-white drop-shadow" strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Cor personalizada</span>
            <span className="block text-xs text-ink-muted">
              {donosDaPersonalizada.length > 0
                ? `Também usada por ${donosDaPersonalizada.map((d) => d.nome).join(", ")}`
                : "Qualquer cor, pelo seletor do aparelho"}
            </span>
          </span>
          <input
            type="color"
            value={corPersonalizada}
            onChange={(event) => onChange(event.target.value.toLowerCase())}
            aria-label="Cor personalizada"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 w-full rounded-2xl bg-bg py-2.5 text-sm font-medium transition-transform active:scale-95"
        >
          Pronto
        </button>
      </BottomSheet>
    </>
  );
}
