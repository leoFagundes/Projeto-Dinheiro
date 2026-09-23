"use client";

import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

/** Classes reaproveitadas pelos formulários de adicionar/editar entidades (banco, caixinha, investimento, categoria...) em todo o app. */
export const INPUT_CLASS =
  "rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-accent";
export const INPUT_CLASS_COMPACT =
  "rounded-2xl border border-border bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent";
export const SAVE_BUTTON_CLASS =
  "rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60";

/** Card com título e ícone, usado como moldura de cada seção de gerenciamento de entidade. */
export function SectionCard({
  icon: Icon,
  title,
  id,
  action,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  id?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Icon size={16} />
          {title}
        </h2>
        {action}
      </div>
      <div className="rounded-card bg-surface shadow-card p-4">{children}</div>
    </section>
  );
}

/** Trio de ações (mostrar/ocultar, editar, excluir) repetido em toda lista de entidade do app. */
export function RowActionButtons({
  hiddenState,
  onEdit,
  onRemove,
  editLabel,
  removeLabel,
}: {
  hiddenState?: { hidden: boolean; onToggle: () => void; showLabel: string; hideLabel: string };
  onEdit: () => void;
  onRemove: () => void;
  editLabel: string;
  removeLabel: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      {hiddenState && (
        <button
          onClick={hiddenState.onToggle}
          className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
          aria-label={hiddenState.hidden ? hiddenState.showLabel : hiddenState.hideLabel}
        >
          {hiddenState.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
      <button
        onClick={onEdit}
        className="text-ink-muted transition-transform active:scale-90 hover:text-accent-strong"
        aria-label={editLabel}
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onRemove}
        className="text-ink-muted transition-transform active:scale-90 hover:text-negative"
        aria-label={removeLabel}
      >
        <Trash2 size={14} />
      </button>
    </span>
  );
}
