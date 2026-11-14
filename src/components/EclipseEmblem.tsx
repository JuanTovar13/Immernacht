import { motion } from "framer-motion";

export function EclipseEmblem() {
  return (
    <div className="relative h-44 w-44 sm:h-56 sm:w-56">
      {/* Corona: rayos radiantes detrás del disco */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1, rotate: 360 }}
        transition={{
          opacity: { duration: 1.2 },
          scale: { duration: 1.2 },
          rotate: { duration: 90, repeat: Infinity, ease: "linear" },
        }}
      >
        <g stroke="var(--color-eclipse-gold)" strokeWidth="1.4" opacity="0.55">
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i * 360) / 16;
            const long = i % 2 === 0;
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2="100"
                y2={long ? 6 : 22}
                transform={`rotate(${angle} 100 100)`}
              />
            );
          })}
        </g>
      </motion.svg>

      {/* Halo de luz suave */}
      <div
        className="absolute inset-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(232,196,104,0.55) 0%, rgba(232,196,104,0.12) 55%, transparent 75%)",
          filter: "blur(6px)",
        }}
      />

      {/* Disco solar dorado */}
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #fff3d1 0%, var(--color-eclipse-gold) 45%, var(--color-eclipse-gold-soft) 100%)",
          boxShadow: "0 0 40px 6px rgba(232,196,104,0.5)",
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.3, ease: "easeOut" }}
      />

      {/* Disco de sombra (luna) cubriendo, con textura de cráteres sutil */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-6"
        initial={{ x: "42%" }}
        animate={{ x: "8%" }}
        transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id="moonShade" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1c2140" />
            <stop offset="100%" stopColor="#05070f" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="94" fill="url(#moonShade)" />
        <circle cx="100" cy="100" r="94" fill="none" stroke="#3a3f66" strokeWidth="1" opacity="0.5" />
        <circle cx="72" cy="70" r="10" fill="#0a0d1c" opacity="0.5" />
        <circle cx="120" cy="130" r="16" fill="#0a0d1c" opacity="0.4" />
        <circle cx="135" cy="60" r="7" fill="#0a0d1c" opacity="0.5" />
      </motion.svg>

      {/* Anillo exterior grabado */}
      <motion.div
        className="absolute -inset-3 rounded-full"
        style={{ border: "1px solid rgba(232,196,104,0.3)" }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: 1.6 }}
      />
    </div>
  );
}
