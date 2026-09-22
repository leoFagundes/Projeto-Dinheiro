"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { UpcomingEvents } from "./UpcomingEvents";
import { RecentTransactions } from "./RecentTransactions";
import type { CalendarEvent } from "@/lib/derived";
import type { Transaction } from "@/lib/types";

type Tab = "proximos" | "recentes";

/** "Próximos 7 dias" e "Últimas transações" compartilham a mesma seção, trocando por aba, com "Próximos 7 dias" como padrão. */
export function ActivitySection({
  upcomingEvents,
  transactions,
  onDeleteTransaction,
  colorByCategoria,
  iconByCategoria,
  bankNameById,
  originDateById,
}: {
  upcomingEvents: CalendarEvent[];
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => Promise<void>;
  colorByCategoria: Map<string, string>;
  iconByCategoria: Map<string, string>;
  bankNameById: Map<string, string>;
  originDateById?: Map<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("proximos");

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => setTab("proximos")}
            className={`relative rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "proximos" ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
            }`}
          >
            {tab === "proximos" && (
              <motion.span
                layoutId="activity-tab-pill"
                className="absolute inset-0 rounded-xl bg-accent-soft"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">Próximos 7 dias</span>
          </button>
          <button
            onClick={() => setTab("recentes")}
            className={`relative rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "recentes" ? "text-accent-strong" : "text-ink-muted hover:bg-bg"
            }`}
          >
            {tab === "recentes" && (
              <motion.span
                layoutId="activity-tab-pill"
                className="absolute inset-0 rounded-xl bg-accent-soft"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative">Últimas transações</span>
          </button>
        </div>
        <Link
          href={tab === "proximos" ? "/calendario" : "/historico"}
          className="shrink-0 text-xs text-accent-strong hover:underline"
        >
          {tab === "proximos" ? "Ver agenda" : "Ver tudo"}
        </Link>
      </div>

      {tab === "proximos" ? (
        <UpcomingEvents
          events={upcomingEvents}
          colorByCategoria={colorByCategoria}
          iconByCategoria={iconByCategoria}
          bankNameById={bankNameById}
        />
      ) : (
        <RecentTransactions
          transactions={transactions}
          onDelete={onDeleteTransaction}
          colorByCategoria={colorByCategoria}
          iconByCategoria={iconByCategoria}
          bankNameById={bankNameById}
          originDateById={originDateById}
        />
      )}
    </section>
  );
}
