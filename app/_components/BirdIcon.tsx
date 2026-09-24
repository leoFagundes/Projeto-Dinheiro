"use client";

import type { BirdAccessory } from "@/lib/shop-items";

/**
 * Versão em SVG (DOM, não canvas) do passarinho do easter egg (Ajustes →
 * jogo escondido) — mesma geometria (asa, bico, olho, "$") desenhada no
 * canvas do jogo. `corpo`/`corpoForte` default pras CSS custom properties
 * do tema (`var(--color-accent)`), então continua respeitando claro/escuro
 * sozinho sempre que ninguém passar um skin específico da loja.
 * `acessorio` desenha o extra de alguns skins (óculos, coroa, tapa-olho,
 * gravata) por cima da geometria base. Usado no menu do jogo, na transição
 * de voo, na loja, no ranking e como ícone em Ajustes.
 */
export function BirdIcon({
  size,
  className,
  corpo = "var(--color-accent)",
  corpoForte = "var(--color-accent-strong)",
  acessorio,
}: {
  size: number;
  className?: string;
  corpo?: string;
  corpoForte?: string;
  acessorio?: BirdAccessory;
}) {
  return (
    <svg width={size} height={size} viewBox="-24 -24 48 48" className={className}>
      <path
        d="M0,0 C-4,-11 -17,-12 -22,-2 C-16,3 -7,4 0,0 Z"
        fill={corpoForte}
        transform="translate(-4,-1) rotate(-20)"
      />
      <circle cx="0" cy="0" r="15" fill={corpo} />
      <polygon points="12,-2 22,2 12,6" fill="#f5c542" />
      <circle cx="5.25" cy="-5.25" r="4.2" fill="#ffffff" />
      <circle cx="6.4" cy="-5.25" r="2" fill="#1f2937" />
      <text x="-2" y="7" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(255,255,255,0.9)">
        $
      </text>

      {acessorio === "oculos" && (
        <>
          <rect x="-0.5" y="-9" width="11" height="7" rx="3" fill="#111827" opacity="0.94" />
          <line x1="-0.5" y1="-6" x2="-7" y2="-7.5" stroke="#111827" strokeWidth="1.5" />
        </>
      )}

      {acessorio === "tapaOlho" && (
        <>
          <ellipse cx="5.25" cy="-5.25" rx="5" ry="5.5" fill="#111827" />
          <line x1="-8" y1="-10.5" x2="10" y2="-1.5" stroke="#111827" strokeWidth="1.8" />
        </>
      )}

      {acessorio === "coroa" && (
        <polygon
          points="-4,-15 -4,-21 -1,-17 2,-23 5,-17 8,-21 8,-15"
          fill="#f5c542"
          stroke="#c9971f"
          strokeWidth="0.6"
        />
      )}

      {acessorio === "gravata" && (
        <>
          <polygon points="-4,10 4,10 0,13" fill="#1f2937" />
          <polygon points="-1.3,13 1.3,13 1.3,20 -1.3,20" fill="#1f2937" />
        </>
      )}
    </svg>
  );
}
