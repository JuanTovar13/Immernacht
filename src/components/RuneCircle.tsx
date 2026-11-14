import { motion } from "framer-motion";

export function RuneCircle({ size = 340, color = "var(--color-eclipse-gold)" }: { size?: number; color?: string }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 0.35, scale: 1, rotate: 360 }}
        transition={{
          opacity: { duration: 1.5 },
          scale: { duration: 1.5 },
          rotate: { duration: 120, repeat: Infinity, ease: "linear" },
        }}
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke={color} strokeWidth="0.6" />
        <circle cx="100" cy="100" r="80" fill="none" stroke={color} strokeWidth="0.4" strokeDasharray="2 6" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="100" y1="8" x2="100" y2="20" stroke={color} strokeWidth="0.6" transform={`rotate(${i * 30} 100 100)`} />
        ))}
      </motion.svg>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="absolute inset-0"
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 0.25, rotate: -360 }}
        transition={{
          opacity: { duration: 1.8, delay: 0.3 },
          rotate: { duration: 90, repeat: Infinity, ease: "linear" },
        }}
      >
        <circle cx="100" cy="100" r="60" fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="1 4" />
      </motion.svg>
    </div>
  );
}
