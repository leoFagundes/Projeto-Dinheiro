"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, History, LayoutDashboard, Settings } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/calendario", label: "Agenda", icon: CalendarClock },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 flex justify-center border-t border-border bg-surface/95 px-4 backdrop-blur">
      <div className="flex w-full max-w-md justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-accent-strong" : "text-ink-muted"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
