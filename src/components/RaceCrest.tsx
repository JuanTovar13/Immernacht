import type { ReactElement } from "react";
import type { RazaId } from "../game/types";

/**
 * Emblemas tallados por raza — reemplazan el emoji temporal por un ícono
 * propio del universo del juego, en el color de acento de cada raza.
 */
export function RaceCrest({ raza, color, size = 56 }: { raza: RazaId; color: string; size?: number }) {
  const paths: Record<RazaId, ReactElement> = {
    humanos: (
      <>
        <circle cx="32" cy="32" r="11" fill={color} />
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x="30.5"
            y="6"
            width="3"
            height="11"
            rx="1.5"
            fill={color}
            transform={`rotate(${i * 45} 32 32)`}
          />
        ))}
      </>
    ),
    elfos: (
      <path
        d="M32 8 C 46 16, 50 32, 32 56 C 14 32, 18 16, 32 8 Z M32 8 L32 56"
        stroke={color}
        strokeWidth="2.5"
        fill={color}
        fillOpacity="0.85"
      />
    ),
    enanos: (
      <g stroke={color} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M14 14 L50 50 M20 12 L26 18 M44 46 L50 52" />
        <path d="M50 14 L14 50 M44 12 L38 18" strokeWidth="6" />
        <path d="M48 10 L58 20 L52 26 L42 16 Z" fill={color} stroke="none" />
      </g>
    ),
    nomuertos: (
      <g fill={color}>
        <path d="M32 10 C 20 10, 12 19, 12 30 C 12 38, 16 43, 20 46 L20 52 L26 52 L26 47 L30 47 L30 52 L34 52 L34 47 L38 47 L38 52 L44 52 L44 46 C 48 43, 52 38, 52 30 C 52 19, 44 10, 32 10 Z" />
        <circle cx="23" cy="29" r="5" fill="var(--color-void-deep)" />
        <circle cx="41" cy="29" r="5" fill="var(--color-void-deep)" />
        <path d="M28 38 L36 38 L33 43 L31 43 Z" fill="var(--color-void-deep)" />
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 65%, transparent))` }}>
      {paths[raza]}
    </svg>
  );
}
