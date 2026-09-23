"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { deleteFeedback, setFeedbackStatus } from "../actions";
import type { FeedbackStatus, FeedbackTipo } from "@/lib/types";

export type AdminFeedback = {
  id: string;
  userEmail: string;
  tipo: FeedbackTipo;
  mensagem: string;
  status: FeedbackStatus;
  criadoEm: number;
};

const TIPO_LABELS: Record<FeedbackTipo, string> = {
  bug: "Bug",
  sugestao: "Sugestão",
  elogio: "Elogio",
  outro: "Outro",
};

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "lido", label: "Lido" },
  { value: "resolvido", label: "Resolvido" },
];

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  novo: "bg-negative-soft text-negative",
  lido: "bg-bg text-ink-muted",
  resolvido: "bg-accent-soft text-accent-strong",
};

export function FeedbackTable({ items }: { items: AdminFeedback[] }) {
  const [filtro, setFiltro] = useState<FeedbackStatus | "todos">("todos");
  const filtrados = filtro === "todos" ? items : items.filter((f) => f.status === filtro);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {(["todos", ...STATUS_OPTIONS.map((o) => o.value)] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtro === value
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border text-ink-muted"
            }`}
          >
            {value === "todos" ? "Todos" : STATUS_OPTIONS.find((o) => o.value === value)?.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {items.length === 0 ? "Nenhum feedback recebido ainda." : "Nenhum feedback nesse status."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((item) => (
            <FeedbackRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackRow({ item }: { item: AdminFeedback }) {
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);

  function applyStatus(status: FeedbackStatus) {
    if (status === item.status) return;
    startTransition(async () => {
      try {
        await setFeedbackStatus(item.id, status);
      } catch {
        toast.error("Não foi possível atualizar o status.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteFeedback(item.id);
        toast.success("Feedback excluído.");
      } catch {
        toast.error("Não foi possível excluir.");
      } finally {
        setRemoving(false);
      }
    });
  }

  return (
    <li className="rounded-card bg-surface shadow-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-bg px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
              {TIPO_LABELS[item.tipo]}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[item.status]}`}>
              {STATUS_OPTIONS.find((o) => o.value === item.status)?.label}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm">{item.mensagem}</p>
          <p className="mt-1.5 text-xs text-ink-muted">
            {item.userEmail || "(sem e-mail)"} · {new Date(item.criadoEm).toLocaleString("pt-BR")}
          </p>
        </div>
        <button
          onClick={() => setRemoving(true)}
          disabled={pending}
          aria-label="Excluir feedback"
          className="shrink-0 text-ink-muted transition-transform active:scale-90 hover:text-negative"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => applyStatus(value)}
            disabled={pending}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              item.status === value
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border text-ink-muted hover:bg-bg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ConfirmDialog
        open={removing}
        title="Excluir feedback?"
        description="Essa mensagem some pra sempre da lista."
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setRemoving(false)}
      />
    </li>
  );
}
