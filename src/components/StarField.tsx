import { useMemo } from "react";

export function StarField({ count = 60 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 55, // solo en el tercio/mitad superior, no detrás de las montañas
        left: Math.random() * 100,
        size: Math.random() < 0.15 ? 2.5 : 1.2,
        delay: Math.random() * 5,
        duration: 2.5 + Math.random() * 3,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-[color:var(--color-parchment)]"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
