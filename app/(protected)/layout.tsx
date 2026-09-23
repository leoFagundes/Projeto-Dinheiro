"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, HelpCircle, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { VisibilityProvider, useValuesVisibility } from "@/lib/visibility-context";
import { isAppLockEnabled } from "@/lib/app-lock";
import { NavDrawer } from "@/app/_components/NavDrawer";
import { Sidebar } from "@/app/_components/Sidebar";
import { AddTransactionButton } from "@/app/_components/AddTransactionButton";
import { HelpModal } from "@/app/_components/HelpModal";
import { AppLockScreen } from "@/app/_components/AppLockScreen";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, nickname, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // O bloqueio é por conta (uid), não global — então só dá pra decidir se
  // está travado depois que `user` resolve. Recalcula direto no corpo do
  // render (não num efeito) sempre que o uid muda: é o padrão do próprio
  // React pra "ajustar estado quando algo muda" sem flash — o React refaz
  // esse render antes de pintar a tela, então nunca chega a mostrar o
  // conteúdo (ou o cadeado da conta errada) por um instante sequer.
  const [unlockState, setUnlockState] = useState<{ uid: string; unlocked: boolean } | null>(null);
  if (user && unlockState?.uid !== user.uid) {
    setUnlockState({ uid: user.uid, unlocked: !isAppLockEnabled(user.uid) });
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user || !unlockState || unlockState.uid !== user.uid) {
    return null;
  }

  // Enquanto travado, nem monta o resto da árvore (Dashboard, hooks do
  // Firestore, etc.) — além de simples, evita buscar dados financeiros antes
  // do PIN/biometria confirmar.
  if (!unlockState.unlocked) {
    return (
      <AppLockScreen
        uid={user.uid}
        onUnlock={() => setUnlockState({ uid: user.uid, unlocked: true })}
      />
    );
  }

  return (
    <VisibilityProvider>
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header
            className="sticky top-0 z-20 flex justify-center border-b border-border bg-surface/95 backdrop-blur"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex w-full max-w-md items-center justify-between px-5 py-4 md:max-w-2xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Abrir menu"
                  className="text-ink-muted transition-transform active:scale-90 hover:text-ink md:hidden"
                >
                  <Menu size={20} />
                </button>
                <Link href="/" className="flex items-center gap-2 md:hidden">
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-lg shadow-sm ring-1 ring-black/5"
                    unoptimized
                  />
                  <span>
                    <p className="font-semibold leading-tight">Projeto Dinheiro</p>
                    {nickname && <p className="text-xs leading-tight text-ink-muted">{nickname}</p>}
                  </span>
                </Link>
                {nickname && <p className="hidden text-sm text-ink-muted md:block">Olá, {nickname}</p>}
              </div>
              <div className="flex items-center gap-3">
                <VisibilityToggleButton />
                <HelpButton />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full min-w-0 max-w-md flex-1 px-5 py-6 md:max-w-2xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          <AddTransactionButton />
          <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
      </div>
    </VisibilityProvider>
  );
}

function VisibilityToggleButton() {
  const { hidden, toggle } = useValuesVisibility();
  return (
    <button
      onClick={toggle}
      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
      className="text-ink-muted hover:text-ink"
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Como funciona o app"
        className="text-ink-muted hover:text-ink"
      >
        <HelpCircle size={18} />
      </button>
      <HelpModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
