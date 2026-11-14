import { useMemo } from "react";

interface ParticleFieldProps {
  color?: string;
  count?: number;
}

/**
 * Motas de luz flotantes en CSS puro (sin canvas ni librería de partículas).
 * Suficiente para dar profundidad ambiental sin costo de rendimiento en celular.
 */
export function ParticleField({ color = "var(--color-eclipse-gold)", count = 24 }: ParticleFieldProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 6 + Math.random() * 6,
        size: 1 + Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 40,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            left: `${p.left}%`,
            bottom: "-5%",
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 3}px ${color}`,
            animation: `float-up ${p.duration}s ease-in ${p.delay}s infinite`,
            // @ts-expect-error variable custom para el keyframe
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-110vh) translateX(var(--drift)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
