/**
 * Reconstrói a arte de public/logo.svg para uso em ícones gerados via ImageResponse.
 * O satori (motor do ImageResponse) não suporta <text> dentro de <svg> bruto,
 * então o "$" é desenhado como texto normal sobreposto às formas do SVG.
 */
export function AppIconMark({ size }: { size: number }) {
  const scale = size / 200;

  return (
    <div style={{ width: size, height: size, display: "flex", position: "relative" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <rect width={size} height={size} rx={45 * scale} fill="#e8f5ec" />
        <defs>
          <linearGradient
            id="gCoin"
            x1={40 * scale}
            y1={40 * scale}
            x2={160 * scale}
            y2={160 * scale}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={62 * scale} fill="url(#gCoin)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={52 * scale}
          fill="none"
          stroke="#15803d"
          strokeWidth={2.5 * scale}
          opacity={0.3}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 72 * scale,
          fontWeight: 800,
          fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif",
          color: "#ffffff",
        }}
      >
        $
      </div>
    </div>
  );
}
