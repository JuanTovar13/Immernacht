import { motion } from "framer-motion";

export function VictoryBurst() {
  return (
    <>
      {/* Destello inicial que cubre toda la pantalla */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 42%, #fff8e6 0%, var(--color-eclipse-gold) 35%, transparent 70%)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* Ondas expansivas doradas repetidas */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ borderColor: "var(--color-eclipse-gold)" }}
          initial={{ width: 20, height: 20, opacity: 0.7 }}
          animate={{ width: "180vw", height: "180vw", opacity: 0 }}
          transition={{ duration: 3.2, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Confeti / chispas doradas cayendo */}
      {Array.from({ length: 34 }, (_, i) => {
        const left = Math.random() * 100;
        const dur = 4 + Math.random() * 4;
        const delay = Math.random() * 4;
        const size = 3 + Math.random() * 4;
        const golden = i % 3 !== 0;
        return (
          <motion.span
            key={i}
            className="pointer-events-none absolute"
            style={{
              left: `${left}%`,
              top: "-5%",
              width: size,
              height: size * (golden ? 1 : 2.2),
              background: golden ? "var(--color-eclipse-gold)" : "var(--celestial-bright)",
              boxShadow: `0 0 6px ${golden ? "var(--color-eclipse-gold)" : "var(--celestial-bright)"}`,
            }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: "110vh", x: [0, 30, -20, 15, 0], rotate: [0, 300, 620], opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </>
  );
}
