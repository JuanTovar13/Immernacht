import type { ReactNode } from "react";

/**
 * Marco decorativo reutilizable: esquinas grabadas + borde doble,
 * inspirado en códices/tomos de fantasía. Reemplaza el "card" genérico.
 */
export function OrnateFrame({ children, glowColor }: { children: ReactNode; glowColor?: string }) {
  return (
    <div className="relative">
      <div
        className="absolute -inset-px rounded-[2px] opacity-60"
        style={{
          background: glowColor
            ? `radial-gradient(120% 140% at 50% 0%, ${glowColor}33, transparent 60%)`
            : undefined,
        }}
      />
      <div className="relative border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/80 backdrop-blur-sm px-8 py-10">
        <Corner className="top-0 left-0 rotate-0" />
        <Corner className="top-0 right-0 rotate-90" />
        <Corner className="bottom-0 right-0 rotate-180" />
        <Corner className="bottom-0 left-0 -rotate-90" />
        {children}
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`pointer-events-none absolute h-6 w-6 text-[color:var(--color-eclipse-gold)]/70 ${className}`}
    >
      <path
        d="M2 2 L2 16 M2 2 L16 2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="2" cy="2" r="2.5" fill="currentColor" />
    </svg>
  );
}
