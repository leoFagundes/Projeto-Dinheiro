import {
  CalendarClock,
  Gamepad2,
  History,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Repeat,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Lista de destinos usada tanto no menu lateral (mobile, via vaul) quanto na sidebar fixa (telas largas). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/investimentos", label: "Investir", icon: TrendingUp },
  { href: "/caixinhas", label: "Caixinhas", icon: PiggyBank },
  { href: "/calendario", label: "Agenda", icon: CalendarClock },
  { href: "/bancos", label: "Bancos", icon: Landmark },
  { href: "/assinaturas", label: "Assinaturas", icon: Repeat },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

/**
 * Item extra opcional (easter egg) — só entra na navegação se a conta
 * ativar "Atalho no menu lateral" em Ajustes (ver EasterEggSection).
 */
export const GAME_NAV_ITEM: NavItem = { href: "/jogo", label: "Jogo", icon: Gamepad2 };
