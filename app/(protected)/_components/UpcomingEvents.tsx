import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/app/_components/EmptyState";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/derived";

export function UpcomingEvents({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nada previsto pros próximos dias"
        description="Assinaturas, salário e outras recorrências aparecem aqui quando estiverem próximas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {events.map((event) => {
          const signedValue = event.tipo === "receita" ? event.valor : -event.valor;
          return (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-bg px-4 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{event.descricao}</span>
                <span className="text-xs text-ink-muted">
                  {formatDate(event.data)}
                  {event.origem === "recorrencia" ? " · previsto" : ""}
                </span>
              </span>
              <span
                className={`shrink-0 font-medium ${signedValue < 0 ? "text-negative" : "text-accent-strong"}`}
              >
                {formatCurrency(signedValue)}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        href="/calendario"
        className="self-start text-sm text-accent-strong transition-transform active:scale-95 hover:underline"
      >
        Ver calendário completo
      </Link>
    </div>
  );
}
