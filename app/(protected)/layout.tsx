"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BottomNav } from "@/app/_components/BottomNav";
import { AddTransactionButton } from "@/app/_components/AddTransactionButton";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
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
            <p className="font-semibold">Projeto Dinheiro</p>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sair"
            className="text-ink-muted hover:text-ink"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 py-6">
        {children}
      </main>

      <AddTransactionButton />
      <BottomNav />
    </div>
  );
}
