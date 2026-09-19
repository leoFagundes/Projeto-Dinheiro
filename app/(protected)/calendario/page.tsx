"use client";

import { useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { CalendarClock } from "lucide-react";
import { useTransactions } from "@/lib/use-transactions";
import { computeMonthEvents, type CalendarEvent } from "@/lib/derived";
import { formatCurrency, monthKeyOf } from "@/lib/format";
import { PageFade } from "@/app/_components/PageFade";
import { BottomSheet } from "@/app/_components/BottomSheet";
import { EmptyState } from "@/app/_components/EmptyState";
import { Skeleton } from "@/app/_components/Skeleton";

export default function CalendarioPage() {
  const { transactions, loading } = useTransactions();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="text-lg font-semibold">Calendário</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const monthKey = monthKeyOf(month);
  const events = computeMonthEvents(transactions, monthKey);

  const eventsByDate = new Map<string, { receita: boolean; despesa: boolean }>();
  for (const event of events) {
    const flags = eventsByDate.get(event.data) ?? { receita: false, despesa: false };
    if (event.tipo === "receita") flags.receita = true;
    else flags.despesa = true;
    eventsByDate.set(event.data, flags);
  }

  const selectedIso = selectedDay ? isoOf(selectedDay) : null;
  const selectedEvents = selectedIso ? events.filter((e) => e.data === selectedIso) : [];

  function EventDayButton({ day, modifiers, ...rest }: DayButtonProps) {
    const flags = eventsByDate.get(day.isoDate);
    const base = "flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors";
    const state = modifiers.selected
      ? "bg-accent text-white"
      : modifiers.today
        ? "font-semibold text-accent-strong hover:bg-bg"
        : modifiers.outside
          ? "text-ink-muted/30 hover:bg-bg"
          : "hover:bg-bg";
    return (
      <button {...rest} className={`${base} ${state}`}>
        <span>{day.date.getDate()}</span>
        {flags && (
          <span className="flex gap-0.5">
            {flags.receita && <span className="size-1 rounded-full bg-accent" />}
            {flags.despesa && (
              <span
                className={`size-1 rounded-full ${modifiers.selected ? "bg-white" : "bg-negative"}`}
              />
            )}
          </span>
        )}
      </button>
    );
  }

  return (
    <PageFade>
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarClock size={20} className="text-accent-strong" />
          Calendário
        </h1>

        <div className="rounded-card bg-surface p-4">
          <DayPicker
            mode="single"
            locale={ptBR}
            month={month}
            onMonthChange={setMonth}
            selected={selectedDay}
            onSelect={setSelectedDay}
            showOutsideDays
            components={{ DayButton: EventDayButton }}
            classNames={{
              months: "flex flex-col",
              month: "w-full",
              month_caption: "relative flex h-9 items-center justify-center",
              caption_label: "text-sm font-medium",
              nav: "absolute inset-x-0 flex items-center justify-between",
              button_previous:
                "flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-bg hover:text-ink disabled:opacity-30",
              button_next:
                "flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-bg hover:text-ink disabled:opacity-30",
              month_grid: "mt-2 w-full border-collapse",
              weekdays: "flex",
              weekday: "flex-1 pb-1 text-center text-[11px] font-medium text-ink-muted",
              week: "mt-0.5 flex w-full",
              day: "flex-1 p-0.5 text-center",
            }}
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Receita
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-negative" /> Despesa
          </span>
        </div>

        {events.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Nada previsto neste mês"
            description="Assinaturas, salário e outras recorrências aparecem aqui automaticamente."
          />
        )}
      </div>

      <BottomSheet open={selectedDay !== undefined} onClose={() => setSelectedDay(undefined)}>
        <p className="mb-4 font-medium">
          {selectedDay?.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-ink-muted">Nada previsto para este dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </BottomSheet>
    </PageFade>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const signedValue = event.tipo === "receita" ? event.valor : -event.valor;
  return (
    <li className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5 text-sm">
      <span>
        {event.descricao}
        {event.origem === "recorrencia" && (
          <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[11px] text-ink-muted">
            previsto
          </span>
        )}
      </span>
      <span className={signedValue < 0 ? "text-negative" : "text-accent-strong"}>
        {formatCurrency(signedValue)}
      </span>
    </li>
  );
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
