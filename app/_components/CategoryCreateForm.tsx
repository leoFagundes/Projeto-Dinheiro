"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  categoryColorValue,
  categoryTint,
  FALLBACK_CATEGORY_ICON,
  nextFreeCategoryColor,
  type CategoryColor,
} from "@/lib/categories";
import { EmojiPickerSheet } from "./EmojiPickerSheet";
import { BottomSheet } from "./BottomSheet";
import { CategoryColorField } from "./CategoryColorField";
import { INPUT_CLASS_COMPACT, SAVE_BUTTON_CLASS } from "./SettingsFormKit";
import type { Category, TransactionType } from "@/lib/types";

type CreateCategory = (nome: string, tipo: TransactionType, icone: string, cor?: CategoryColor) => Promise<void>;

/**
 * Formulário de nova categoria (emoji + nome), usado em Ajustes e dentro do
 * modal de transação. Recebe a lista e o `onCreate` de quem chama em vez de
 * usar useCategories() por conta própria — cada instância daquele hook abre
 * mais um listener e tem sua própria lógica de "popular categorias padrão",
 * que não deve rodar em duplicidade. Com `tipoFixo`, o seletor de tipo some
 * (no modal de transação o tipo já é o da transação).
 */
export function CategoryCreateForm({
  categories,
  onCreate,
  tipoFixo,
  onCreated,
}: {
  categories: Category[];
  onCreate: CreateCategory;
  tipoFixo?: TransactionType;
  onCreated?: (nome: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [tipoEscolhido, setTipoEscolhido] = useState<TransactionType>("despesa");
  const [icone, setIcone] = useState(FALLBACK_CATEGORY_ICON);
  // null = a sugestão padrão (próxima cor livre), que acompanha as categorias.
  const [corEscolhida, setCorEscolhida] = useState<CategoryColor | null>(null);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const tipo = tipoFixo ?? tipoEscolhido;
  const cor = corEscolhida ?? nextFreeCategoryColor(categories);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nomeNormalizado = nome.trim();
    if (!nomeNormalizado) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    const duplicada = categories.some(
      (c) => c.tipo === tipo && c.nome.toLowerCase() === nomeNormalizado.toLowerCase(),
    );
    if (duplicada) {
      toast.error(`Já existe uma categoria de ${tipo} com esse nome.`);
      return;
    }
    setSaving(true);
    try {
      await onCreate(nomeNormalizado, tipo, icone, cor);
      toast.success("Categoria criada.");
      setNome("");
      setIcone(FALLBACK_CATEGORY_ICON);
      setCorEscolhida(null);
      onCreated?.(nomeNormalizado);
    } catch {
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPickingIcon(true)}
            aria-label="Escolher ícone"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border text-lg transition-transform active:scale-95"
            style={{ backgroundColor: categoryTint(categoryColorValue(cor)) }}
          >
            {icone}
          </button>
          <CategoryColorField value={cor} categories={categories} onChange={setCorEscolhida} />
          <input
            type="text"
            placeholder="Nova categoria"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            autoFocus={tipoFixo !== undefined}
            className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
          />
        </div>
        {tipoFixo ? (
          <button type="submit" disabled={saving} className={SAVE_BUTTON_CLASS}>
            Criar categoria
          </button>
        ) : (
          <div className="flex gap-2">
            <select
              value={tipoEscolhido}
              onChange={(event) => setTipoEscolhido(event.target.value as TransactionType)}
              className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="flex shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-60"
              aria-label="Adicionar categoria"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </form>

      <EmojiPickerSheet open={pickingIcon} onClose={() => setPickingIcon(false)} onSelect={setIcone} />
    </>
  );
}

/** O mesmo formulário num modal próprio — aberto por cima do modal de transação. */
export function CategoryCreateSheet({
  open,
  onClose,
  categories,
  onCreate,
  tipo,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onCreate: CreateCategory;
  tipo: TransactionType;
  onCreated: (nome: string) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <p className="mb-4 font-medium">Nova categoria de {tipo}</p>
      <CategoryCreateForm
        categories={categories}
        onCreate={onCreate}
        tipoFixo={tipo}
        onCreated={(nome) => {
          onCreated(nome);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
