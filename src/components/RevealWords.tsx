import { motion } from "framer-motion";

export function RevealWords({
  texto,
  delayStart = 0,
  stagger = 0.05,
  className,
}: {
  texto: string;
  delayStart?: number;
  stagger?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {texto.split(" ").map((palabra, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ marginRight: "0.28em", willChange: "transform, filter, opacity" }}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: delayStart + i * stagger, ease: [0.2, 0.65, 0.3, 1] }}
        >
          {palabra}
        </motion.span>
      ))}
    </span>
  );
}
