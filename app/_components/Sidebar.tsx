"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import Image from "next/image";
import { NAV_ITEMS } from "./nav-items";

/** Sidebar fixa (≥ md), substitui o hambúrguer/drawer em telas largas — mesma lista de destinos. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <Image
          src="/logo.svg"
          alt=""
          width={26}
          height={26}
          className="rounded-lg shadow-sm ring-1 ring-black/5"
          unoptimized
        />
        <p className="font-semibold leading-tight">Projeto Dinheiro</p>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-bg hover:text-ink"
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-2xl bg-accent-soft"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className={`relative flex items-center gap-3 ${active ? "text-accent-strong" : ""}`}>
                <Icon size={18} />
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
