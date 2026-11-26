import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import "./victoria.css";

/**
 * El Portal del Eclipse abriéndose por completo: el disco de sombra que
 * cubría el sol (ver EclipseEmblem) se disuelve, revelando la luz total.
 * Es el clímax visual — el reverso luminoso del eclipse cerrado del inicio.
 */
export function OpenPortal() {
  return (
    <div className="relative h-64 w-64 sm:h-80 sm:w-80">
      {/* Anillos de energía girando, dorados */}
      <svg viewBox="0 0 200 200" className="vic-p vic-girar-solo inset-0" style={{ "--dur": "50s" } as CSSProperties}>
        <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-eclipse-gold)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 6" />
        {Array.from({ length: 20 }, (_, i) => (
          <line key={i} x1="100" y1="4" x2="100" y2="18" stroke="var(--color-eclipse-gold)" strokeWidth="1" opacity="0.6" transform={`rotate(${i * 18} 100 100)`} />
        ))}
      </svg>
      <svg viewBox="0 0 200 200" className="vic-p vic-girar-inverso inset-4" style={{ "--dur": "34s" } as CSSProperties}>
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--color-eclipse-gold)" strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="1 4" />
      </svg>

      {/* Halo masivo (el degradado ya es suave: sin filtro de desenfoque) */}
      <div
        className="vic-p vic-halo inset-6 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,244,214,0.9) 0%, rgba(232,196,104,0.5) 45%, rgba(232,196,104,0.12) 62%, transparent 74%)", "--dur": "3s" } as CSSProperties}
      />

      {/* Núcleo blanco-dorado radiante */}
      <motion.div
        className="absolute inset-14 rounded-full sm:inset-16"
        style={{ background: "radial-gradient(circle at 40% 35%, #ffffff 0%, #fff3d1 35%, var(--color-eclipse-gold) 70%, var(--color-eclipse-gold-soft) 100%)" }}
        initial={{ scale: 0.3 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, delay: 0.3, ease: "backOut" }}
      />

      {/* El disco de sombra retirándose — revela el portal abierto */}
      <motion.div
        className="absolute inset-14 rounded-full sm:inset-16"
        style={{ background: "radial-gradient(circle at 35% 30%, #1c2140, #05070f)" }}
        initial={{ x: "8%", opacity: 1 }}
        animate={{ x: "160%", opacity: 0 }}
        transition={{ duration: 1.6, delay: 0.6, ease: "easeIn" }}
      />
    </div>
  );
}
