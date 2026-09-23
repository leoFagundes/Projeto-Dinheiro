"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "vaul";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NAV_ITEMS } from "./nav-items";

export function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { nickname, signOut } = useAuth();

  return (
    <Drawer.Root direction="left" open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[82%] max-w-xs flex-col overflow-y-auto bg-surface pb-[env(safe-area-inset-bottom)] outline-none"
          // vaul exige um título acessível (Radix Dialog por baixo dos panos);
          // reaproveitamos o próprio nome do app em vez de duplicar um <h2> oculto.
          aria-describedby={undefined}
        >
          <div
            className="flex shrink-0 items-center gap-2 px-5 py-4"
            style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <LayoutDashboard size={16} />
            </span>
            <Drawer.Title className="font-semibold">Projeto Dinheiro</Drawer.Title>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent-soft text-accent-strong"
                      : "text-ink-muted hover:bg-bg hover:text-ink"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border px-3 py-3">
            <button
              onClick={() => {
                onClose();
                void signOut();
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-negative-soft hover:text-negative"
            >
              <LogOut size={18} />
              {nickname ? `Sair (${nickname})` : "Sair"}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
