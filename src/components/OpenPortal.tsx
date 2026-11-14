import { motion } from "framer-motion";

/**
 * El Portal del Eclipse abriéndose por completo: el disco de sombra que
 * cubría el sol (ver EclipseEmblem) se disuelve, revelando la luz total.
 * Es el clímax visual — el reverso luminoso del eclipse cerrado del inicio.
 */
export function OpenPortal() {
  return (
    <div className="relative h-64 w-64 sm:h-80 sm:w-80">
      {/* Anillos de energía girando, dorados */}
      <motion.svg viewBox="0 0 200 200" className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}>
        <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-eclipse-gold)" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="2 6" />
        {Array.from({ length: 20 }, (_, i) => (
          <line key={i} x1="100" y1="4" x2="100" y2="18" stroke="var(--color-eclipse-gold)" strokeWidth="1" opacity="0.6" transform={`rotate(${i * 18} 100 100)`} />
        ))}
      </motion.svg>
      <motion.svg viewBox="0 0 200 200" className="absolute inset-4" animate={{ rotate: -360 }} transition={{ duration: 34, repeat: Infinity, ease: "linear" }}>
        <circle cx="100" cy="100" r="88" fill="none" stroke="var(--color-eclipse-gold)" strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="1 4" />
      </motion.svg>

      {/* Halo masivo */}
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,244,214,0.9) 0%, rgba(232,196,104,0.5) 45%, transparent 72%)", filter: "blur(4px)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
