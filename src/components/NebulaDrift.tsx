import { motion } from "framer-motion";

/**
 * Nubes de energía arcana difusas moviéndose lentamente por el fondo,
 * con blend mode "screen" para un efecto de niebla mágica luminosa.
 */
export function NebulaDrift() {
  const blobs = [
    { color: "#5a2f8a", top: "8%", left: "-10%", size: 260, duration: 26 },
    { color: "#8a3f6f", top: "55%", left: "70%", size: 300, duration: 32 },
    { color: "#3f4f9a", top: "70%", left: "-5%", size: 220, duration: 22 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ mixBlendMode: "screen" }}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, ${b.color}55 0%, transparent 70%)`,
            filter: "blur(30px)",
          }}
          animate={{ x: [0, 40, -20, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: b.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
