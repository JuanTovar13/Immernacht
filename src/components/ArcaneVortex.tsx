import { motion } from "framer-motion";

interface ArcaneVortexProps {
  size?: number;
  /** Color principal de los anillos y el núcleo. Por defecto el violeta arcano. */
  brightColor?: string;
  /** Color de los zarcillos de energía. */
  glowColor?: string;
  /** Color base (oscuro) del núcleo. */
  deepColor?: string;
  /** Color del halo difuso de fondo, en formato rgba(). */
  haloColor?: string;
  haloColorDeep?: string;
  /** Color del acento del anillo medio (normalmente dorado; en blanco y negro, gris). */
  ringAccent?: string;
  /** Punto de luz más brillante en el centro del núcleo. */
  coreHighlight?: string;
}

/**
 * El Nexo del Portal: anillos concéntricos girando en direcciones opuestas,
 * zarcillos de energía radiantes y un núcleo brillante. Es el mismo lenguaje
 * visual del portal en toda la app — los colores son personalizables para
 * poder reutilizarlo tal cual en la escena "no pasa nada" (en blanco y gris).
 */
export function ArcaneVortex({
  size = 420,
  brightColor = "var(--arcano-bright)",
  glowColor = "var(--arcano-glow)",
  deepColor = "var(--arcano-deep)",
  haloColor = "rgba(178,127,232,0.4)",
  haloColorDeep = "rgba(90,50,140,0.15)",
  ringAccent = "var(--color-eclipse-gold)",
  coreHighlight = "#e9d4ff",
}: ArcaneVortexProps) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {/* Resplandor de fondo del núcleo */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 0.55,
          height: size * 0.55,
          background: `radial-gradient(circle, ${haloColor} 0%, ${haloColorDeep} 55%, transparent 75%)`,
          filter: "blur(4px)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Anillo exterior, giro lento */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="94" fill="none" stroke={brightColor} strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="3 5" />
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 36} 100 100)`} opacity="0.7">
            <path d="M100 6 Q 108 16 100 26 Q 92 16 100 6 Z" fill={brightColor} />
          </g>
        ))}
      </motion.svg>

      {/* Anillo medio, giro opuesto */}
      <motion.svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="100" cy="100" r="90" fill="none" stroke={ringAccent} strokeOpacity="0.3" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="70" fill="none" stroke={brightColor} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="1 7" />
      </motion.svg>

      {/* Zarcillos de energía radiantes desde el núcleo */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{ duration: 110, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <motion.path
            key={i}
            d={`M100 100 Q ${100 + 40 * Math.cos((i * 60 * Math.PI) / 180)} ${100 + 40 * Math.sin((i * 60 * Math.PI) / 180)}, ${100 + 96 * Math.cos((i * 60 * Math.PI) / 180)} ${100 + 96 * Math.sin((i * 60 * Math.PI) / 180)}`}
            stroke={glowColor}
            strokeWidth="0.8"
            fill="none"
            animate={{ opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: 3, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </motion.svg>

      {/* Núcleo */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 0.16,
          height: size * 0.16,
          background: `radial-gradient(circle at 35% 30%, ${coreHighlight} 0%, ${brightColor} 50%, ${deepColor} 100%)`,
          boxShadow: `0 0 ${size * 0.1}px ${size * 0.02}px ${haloColor}`,
        }}
      />
    </div>
  );
}
