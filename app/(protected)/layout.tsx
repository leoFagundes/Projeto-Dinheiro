"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { VisibilityProvider, useValuesVisibility } from "@/lib/visibility-context";
import { BottomNav } from "@/app/_components/BottomNav";
import { AddTransactionButton } from "@/app/_components/AddTransactionButton";
import { HelpModal } from "@/app/_components/HelpModal";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, nickname, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <VisibilityProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex justify-center border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex w-full max-w-md items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
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
            </div>
            <div className="flex items-center gap-3">
              <VisibilityToggleButton />
              <HelpButton />
              <button
                onClick={() => signOut()}
                aria-label="Sair"
                className="text-ink-muted hover:text-ink"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
          {children}
        </main>

        <AddTransactionButton />
        <BottomNav />
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
