"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Monitor, Moon, Plus, Sun, Tags } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCategories } from "@/lib/use-categories";
import { useCategoryGoals } from "@/lib/use-category-goals";
import { useTheme, type ThemePreference } from "@/lib/use-theme";
import { FALLBACK_CATEGORY_ICON } from "@/lib/categories";
import { PageFade } from "@/app/_components/PageFade";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { EmojiPickerSheet } from "@/app/_components/EmojiPickerSheet";
import { BottomSheet } from "@/app/_components/BottomSheet";
import {
  INPUT_CLASS,
  INPUT_CLASS_COMPACT,
  SAVE_BUTTON_CLASS,
  SectionCard,
  RowActionButtons,
} from "@/app/_components/SettingsFormKit";
import type { Category, TransactionType } from "@/lib/types";

export default function ConfiguracoesPage() {
  return (
    <PageFade>
      <div className="flex flex-col gap-8 pb-8">
        <h1 className="text-lg font-semibold">Ajustes</h1>
        <CategoriasSection />
        <AparenciaSection />
        <ContaSection />
      </div>
    </PageFade>
  );
}

function CategoriasSection() {
  const { categories, addCategory, removeCategory, updateCategory } = useCategories();
  const { goals, overrides, removeGoal, removeGoalOverride, renameGoalCategoria } =
    useCategoryGoals();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TransactionType>("despesa");
  const [icone, setIcone] = useState(FALLBACK_CATEGORY_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; nome: string } | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  async function handleAdd(event: React.FormEvent) {
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
    await addCategory(nomeNormalizado, tipo, icone);
    toast.success("Categoria criada.");
    setNome("");
    setIcone(FALLBACK_CATEGORY_ICON);
  }

  async function handleUpdateCategory(id: string, input: { nome: string; icone: string }) {
    const original = categories.find((c) => c.id === id);
    if (!original) return;
    const duplicada = categories.some(
      (c) =>
        c.id !== id &&
        c.tipo === original.tipo &&
        c.nome.toLowerCase() === input.nome.trim().toLowerCase(),
    );
    if (duplicada) {
      throw new Error(`Já existe uma categoria de ${original.tipo} com esse nome.`);
    }
    await updateCategory(id, input);
    // Metas de gasto valem só pra despesas, então renomear uma categoria de
    // receita nunca deve mexer numa meta — mesmo que exista uma despesa com
    // o mesmo nome (ex.: "Outros" existe nos dois tipos por padrão).
    if (original.tipo === "despesa" && original.nome !== input.nome) {
      await renameGoalCategoria(original.nome, input.nome);
    }
  }

  const despesas = categories.filter((c) => c.tipo === "despesa");
  const receitas = categories.filter((c) => c.tipo === "receita");

  return (
    <SectionCard icon={Tags} title="Categorias">
      <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPickingIcon(true)}
            aria-label="Escolher ícone"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg text-lg transition-transform active:scale-95"
          >
            {icone}
          </button>
          <input
            type="text"
            placeholder="Nova categoria"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT}`}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value as TransactionType)}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center rounded-2xl bg-accent px-4 text-white transition-transform active:scale-95 hover:bg-accent-strong"
            aria-label="Adicionar categoria"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      <EmojiPickerSheet open={pickingIcon} onClose={() => setPickingIcon(false)} onSelect={setIcone} />

      <div className="flex flex-col gap-4 text-sm">
        <div>
          <p className="mb-2 text-xs text-ink-muted">Despesas</p>
          <ul className="flex flex-col gap-1.5">
            {despesas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <RowActionButtons
                  onEdit={() => setEditing(c)}
                  onRemove={() => setRemoving({ id: c.id, nome: c.nome })}
                  editLabel="Editar categoria"
                  removeLabel="Remover categoria"
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs text-ink-muted">Receitas</p>
          <ul className="flex flex-col gap-1.5">
            {receitas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0">{c.icone ?? FALLBACK_CATEGORY_ICON}</span>
                  <span className="truncate">{c.nome}</span>
                </span>
                <RowActionButtons
                  onEdit={() => setEditing(c)}
                  onRemove={() => setRemoving({ id: c.id, nome: c.nome })}
                  editLabel="Editar categoria"
                  removeLabel="Remover categoria"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remover categoria?"
        description={`"${removing?.nome}" será removida. Transações já lançadas mantêm o nome antigo.`}
        confirmLabel="Remover"
        danger
        onConfirm={async () => {
          if (!removing) return;
          await removeCategory(removing.id);
          const orphanGoal = goals.find((g) => g.categoria === removing.nome);
          if (orphanGoal) await removeGoal(orphanGoal.id);
          await Promise.all(
            overrides.filter((o) => o.categoria === removing.nome).map((o) => removeGoalOverride(o.id)),
          );
          toast.success("Categoria removida.");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <EditCategorySheet categoria={editing} onSave={handleUpdateCategory} onClose={() => setEditing(null)} />
    </SectionCard>
  );
}

function EditCategorySheet({
  categoria,
  onSave,
  onClose,
}: {
  categoria: Category | null;
  onSave: (id: string, input: { nome: string; icone: string }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={categoria !== null} onClose={onClose}>
      {categoria && (
        <EditCategoryFields key={categoria.id} categoria={categoria} onSave={onSave} onClose={onClose} />
      )}
    </BottomSheet>
  );
}

function EditCategoryFields({
  categoria,
  onSave,
  onClose,
}: {
  categoria: Category;
  onSave: (id: string, input: { nome: string; icone: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState(categoria.nome);
  const [icone, setIcone] = useState(categoria.icone ?? FALLBACK_CATEGORY_ICON);
  const [pickingIcon, setPickingIcon] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nome.trim()) {
      toast.error("Dê um nome para a categoria.");
      return;
    }
    setSaving(true);
    try {
      await onSave(categoria.id, { nome: nome.trim(), icone });
      toast.success("Categoria atualizada.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a categoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <p className="mb-4 font-medium">Editar categoria</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickingIcon(true)}
          aria-label="Escolher ícone"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-bg text-lg transition-transform active:scale-95"
        >
          {icone}
        </button>
        <input
          type="text"
          placeholder="Nome da categoria"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className={`min-w-0 flex-1 ${INPUT_CLASS}`}
        />
      </div>
      <button onClick={handleSave} disabled={saving} className={`mt-3 w-full ${SAVE_BUTTON_CLASS}`}>
        Salvar
      </button>

      <EmojiPickerSheet open={pickingIcon} onClose={() => setPickingIcon(false)} onSelect={setIcone} />
    </>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function AparenciaSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Aparência</h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="mb-3 text-xs text-ink-muted">
          Vale pra essa conta em qualquer aparelho que você entrar, não só neste.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-xs font-medium transition-colors ${
                theme === value
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border text-ink-muted"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContaSection() {
  const { user, nickname, signOut, updateNickname } = useAuth();
  const [apelido, setApelido] = useState(nickname ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveApelido() {
    setSaving(true);
    try {
      await updateNickname(apelido);
      toast.success("Apelido atualizado.");
    } catch {
      toast.error("Não foi possível salvar o apelido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-ink-muted">Conta</h2>
      <div className="rounded-card bg-surface shadow-card p-4">
        <p className="mb-3 truncate text-sm text-ink-muted">{user?.email}</p>

        <label className="mb-3 flex flex-col gap-1 text-xs text-ink-muted">
          Apelido (aparece no topo da tela)
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Como quer ser chamado"
              value={apelido}
              onChange={(event) => setApelido(event.target.value)}
              className={`min-w-0 flex-1 ${INPUT_CLASS_COMPACT} text-ink`}
            />
            <button
              onClick={handleSaveApelido}
              disabled={saving || apelido.trim() === (nickname ?? "")}
              className="shrink-0 rounded-2xl bg-accent px-4 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </label>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm font-medium text-negative transition-transform active:scale-95"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </section>
  );
}
