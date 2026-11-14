import { motion } from "framer-motion";

export function Brazier({ flip = false }: { flip?: boolean }) {
  return (
    <div className={`absolute bottom-[13%] scale-[1.9] sm:scale-[2.3] ${flip ? "right-8 sm:right-16" : "left-8 sm:left-16"}`}>
      <svg width="34" height="70" viewBox="0 0 34 70">
        <path d="M12 60 L22 60 L20 68 L14 68 Z" fill="#05070f" />
        <path d="M8 46 L26 46 L22 60 L12 60 Z" fill="#0d1024" stroke="var(--color-eclipse-gold)" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M8 46 L26 46 L24 40 L10 40 Z" fill="#181d38" stroke="var(--color-eclipse-gold)" strokeOpacity="0.25" strokeWidth="1" />
      </svg>
      <motion.div
        className="absolute left-1/2 top-[-4px] -translate-x-1/2 rounded-full"
        style={{
          width: 60,
          height: 60,
          background: "radial-gradient(circle, rgba(232,196,104,0.55), transparent 70%)",
          filter: "blur(2px)",
        }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full"
        style={{
          width: 18,
          height: 26,
          background: "radial-gradient(circle at 50% 70%, #fff3d1 0%, var(--color-eclipse-gold) 45%, transparent 78%)",
        }}
        animate={{
          scaleY: [1, 1.3, 0.85, 1.2, 1],
          scaleX: [1, 0.85, 1.15, 0.9, 1],
          x: [0, -1.5, 1.5, -1, 0],
          opacity: [0.9, 1, 0.8, 1, 0.9],
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
