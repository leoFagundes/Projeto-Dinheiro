"use client";

import { useActionState } from "react";
import { adminLogin } from "../../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        type="password"
        name="password"
        placeholder="Senha"
        required
        autoFocus
        className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />
      {state?.error && <p className="text-sm text-negative">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
