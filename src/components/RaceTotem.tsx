import { motion } from "framer-motion";
import type { Raza } from "../game/types";

export function RaceTotem({ raza, index, onClick }: { raza: Raza; index: number; onClick?: () => void }) {
  const color = `var(${raza.colorVar})`;

  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center"
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4 + index * 0.18, ease: "easeOut" }}
      whileTap={{ scale: 0.94 }}
    >
      {/* Aura de color */}
      <motion.div
        className="absolute top-3 rounded-full"
        style={{ width: 80, height: 80, background: `radial-gradient(circle, color-mix(in srgb, ${color} 35%, transparent) 0%, transparent 70%)` }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
      />

      {/* Pedestal tallado */}
      <div
        className="relative flex h-24 w-24 items-center justify-center border sm:h-28 sm:w-28"
        style={{
          borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
          background: "linear-gradient(180deg, rgba(21,26,46,0.9), rgba(10,13,24,0.9))",
          clipPath: "polygon(15% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%, 0% 15%)",
        }}
      >
        <img
          src={raza.logo}
          alt={`Emblema de ${raza.nombre}`}
          className="h-14 w-14 object-contain sm:h-16 sm:w-16"
          style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 65%, transparent))` }}
        />
      </div>

      <span
        className="mt-3 font-display text-xs tracking-wide sm:text-sm"
        style={{ color }}
      >
        {raza.nombre}
      </span>
    </motion.button>
  );
}
