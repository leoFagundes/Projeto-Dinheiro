"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { setUserDisabled } from "../actions";

export type AdminUser = {
  uid: string;
  email: string;
  displayName: string | null;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  providers: string[];
  totalTransacoes: number;
  ultimaAtividade: number | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  password: "E-mail/senha",
};

function formatProvider(providerId: string): string {
  return PROVIDER_LABELS[providerId] ?? providerId;
}

function formatUltimaAtividade(timestamp: number | null): string {
  if (timestamp === null) return "nenhuma transação lançada";
  const dias = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (dias <= 0) return "última atividade hoje";
  if (dias === 1) return "última atividade ontem";
  return `última atividade há ${dias} dias`;
}

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = termo ? users.filter((u) => u.email.toLowerCase().includes(termo)) : users;

  return (
    <div className="flex flex-col gap-3">
      {users.length > 5 && (
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder="Buscar por e-mail"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            className="w-full rounded-2xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-accent"
          />
        </div>
      )}

      {filtrados.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {users.length === 0 ? "Nenhum usuário cadastrado ainda." : "Nenhum usuário encontrado."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((user) => (
            <UserRow key={user.uid} user={user} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [pending, startTransition] = useTransition();
  const [confirmingDisable, setConfirmingDisable] = useState(false);

  function applyToggle(nextDisabled: boolean) {
    startTransition(async () => {
      try {
        await setUserDisabled(user.uid, nextDisabled);
        toast.success(nextDisabled ? "Usuário desativado." : "Usuário reativado.");
      } catch {
        toast.error("Não foi possível atualizar o usuário.");
      }
    });
  }

  function handleToggleClick() {
    if (user.disabled) {
      applyToggle(false);
    } else {
      setConfirmingDisable(true);
    }
  }

  return (
    <li className="rounded-card bg-surface shadow-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.email}</p>
          {user.displayName && (
            <p className="truncate text-xs text-ink-muted">{user.displayName}</p>
          )}
          <p className="text-xs text-ink-muted">
            criado em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
            {user.lastSignInAt &&
              ` · último login ${new Date(user.lastSignInAt).toLocaleDateString("pt-BR")}`}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            {user.providers.map((providerId) => (
              <span key={providerId} className="rounded-full bg-bg px-1.5 py-0.5 text-[11px]">
                {formatProvider(providerId)}
              </span>
            ))}
            <span>
              · {user.totalTransacoes} transações · {formatUltimaAtividade(user.ultimaAtividade)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              user.disabled ? "bg-negative-soft text-negative" : "bg-accent-soft text-accent-strong"
            }`}
          >
            {user.disabled ? "Desativado" : "Ativo"}
          </span>
          <button
            onClick={handleToggleClick}
            disabled={pending}
            className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-transform active:scale-95 hover:bg-bg disabled:opacity-60"
          >
            {user.disabled ? "Reativar" : "Desativar"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDisable}
        title="Desativar usuário?"
        description={`"${user.email}" vai perder o acesso ao app imediatamente. Os dados continuam guardados e dá pra reativar quando quiser.`}
        confirmLabel="Desativar"
        danger
        onConfirm={() => {
          setConfirmingDisable(false);
          applyToggle(true);
        }}
        onCancel={() => setConfirmingDisable(false)}
      />
    </li>
  );
}
