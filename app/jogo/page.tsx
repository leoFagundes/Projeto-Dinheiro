"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAccountPreferences } from "@/lib/use-account-preferences";
import { FlappyGame } from "./_components/FlappyGame";
import { Leaderboard } from "./_components/Leaderboard";

// Rota escondida de propósito: fora de app/(protected), não herda o
// header/sidebar (tela cheia) — só entra em NAV_ITEMS se a conta ativar o
// atalho em Ajustes. Chega-se aqui pelo "?" escondido (1ª vez), pelo card
// que aparece depois em Ajustes, ou digitando a URL direto.
export default function JogoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { markJogoDesbloqueado } = useAccountPreferences();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void markJogoDesbloqueado();
    // Só precisa rodar quando o uid muda (login/logout), não a cada
    // re-render — a função em si troca de identidade toda hora sem isso
    // mudar de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) return null;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-bg">
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => router.push("/configuracoes")}
          className="flex items-center gap-1.5 text-sm text-ink-muted transition-transform active:scale-95 hover:text-ink"
        >
          <ArrowLeft size={16} />
          Ajustes
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-accent-strong transition-transform active:scale-95"
        >
          <Trophy size={16} />
          Ranking
        </button>
      </div>

      <div className="relative mx-auto min-h-0 w-full max-w-[480px] flex-1 px-2 pb-2">
        <FlappyGame onExit={() => router.push("/configuracoes")} />
      </div>

      <Leaderboard open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </main>
  );
}
