"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { PageFade } from "@/app/_components/PageFade";

export default function LoginPage() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } =
    useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace("/");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        toast.error("Este e-mail já tem conta. Tente entrar.");
      } else if (code === "auth/weak-password") {
        toast.error("Senha muito curta (mínimo 6 caracteres).");
      } else if (mode === "signup") {
        toast.error("Não foi possível criar a conta.");
      } else {
        toast.error("Não foi possível entrar. Verifique seu e-mail e senha.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch {
      toast.error("Não foi possível entrar com o Google.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
      setMode("login");
    } catch {
      toast.error("Não foi possível enviar o e-mail de redefinição.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <PageFade>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Image
              src="/logo.svg"
              alt="Projeto Dinheiro"
              width={64}
              height={64}
              className="rounded-2xl shadow-md ring-1 ring-black/5"
              unoptimized
              priority
            />
            <h1 className="text-xl font-semibold">Projeto Dinheiro</h1>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="text-sm text-ink-muted"
              >
                {mode === "signup"
                  ? "Crie sua conta para começar"
                  : mode === "reset"
                    ? "Vamos te enviar um link para redefinir a senha"
                    : "Entre para acessar suas finanças"}
              </motion.p>
            </AnimatePresence>
          </div>

          {mode === "reset" ? (
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
              >
                Enviar link de redefinição
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="E-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98] hover:bg-accent-strong disabled:opacity-60"
              >
                {mode === "signup" ? "Criar conta" : "Entrar"}
              </button>
            </form>
          )}

          {mode === "login" && (
            <button
              onClick={() => setMode("reset")}
              className="mt-3 w-full text-center text-xs text-ink-muted hover:underline"
            >
              Esqueci minha senha
            </button>
          )}

          <button
            onClick={() => setMode(mode === "signup" ? "login" : mode === "reset" ? "login" : "signup")}
            className="mt-3 w-full text-center text-sm text-accent-strong hover:underline"
          >
            {mode === "signup"
              ? "Já tenho conta, quero entrar"
              : mode === "reset"
                ? "Voltar para o login"
                : "Ainda não tenho conta, quero criar"}
          </button>

          {mode !== "reset" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
                <div className="h-px flex-1 bg-border" />
                ou
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium transition-transform active:scale-[0.98] hover:bg-bg disabled:opacity-60"
              >
                <FcGoogle size={18} />
                Continuar com Google
              </button>
            </>
          )}
        </div>
      </PageFade>
    </main>
  );
}
