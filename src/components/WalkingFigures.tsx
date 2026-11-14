import { motion } from "framer-motion";
import { RAZAS, type RazaId } from "../game/types";

const ORDEN: RazaId[] = ["humanos", "elfos", "enanos", "nomuertos"];
const DURACION = 16; // segundos para cruzar la pantalla

/**
 * Los 4 héroes caminando JUNTOS, como un mismo grupo cruzando el santuario
 * (no cada uno por su cuenta) — anclados a la línea del suelo.
 */
export function WalkingFigures() {
  return (
    <div className="pointer-events-none absolute inset-x-0" style={{ bottom: "15%", height: 0 }}>
      <motion.div
        className="absolute bottom-0 flex items-end"
        initial={{ x: "-16vw" }}
        animate={{ x: "116vw" }}
        transition={{ duration: DURACION, repeat: Infinity, ease: "linear" }}
      >
        {ORDEN.map((raza, i) => (
          <WalkingFigure key={raza} raza={raza} faseCaminata={i * 0.12} />
        ))}
      </motion.div>
    </div>
  );
}

function WalkingFigure({ raza, faseCaminata }: { raza: RazaId; faseCaminata: number }) {
  const color = `var(${RAZAS[raza].colorVar})`;

  return (
    <div className="relative -ml-1.5 first:ml-0">
      {/* sombra de contacto con el suelo */}
      <div
        className="absolute -bottom-0.5 left-1/2 h-1.5 w-6 -translate-x-1/2 rounded-full"
        style={{ background: "rgba(0,0,0,0.55)", filter: "blur(1.5px)" }}
      />
      <svg
        width="26"
        height="46"
        viewBox="0 0 20 40"
        style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 40%, transparent))` }}
      >
        {/* cabeza con capucha */}
        <circle cx="10" cy="6" r="4" fill="#03040a" />
        {/* torso/capa */}
        <path d="M6.5 9.5 L13.5 9.5 L15.5 25 L4.5 25 Z" fill="#03040a" />
        {/* pierna trasera */}
        <motion.rect
          x="5.4"
          y="24.5"
          width="2.8"
          height="12"
          rx="1.3"
          fill="#03040a"
          style={{ transformOrigin: "6.8px 25px" }}
          animate={{ rotate: [-22, 22, -22] }}
          transition={{ duration: 0.65, delay: faseCaminata, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* pierna delantera */}
        <motion.rect
          x="11.8"
          y="24.5"
          width="2.8"
          height="12"
          rx="1.3"
          fill="#03040a"
          style={{ transformOrigin: "13.2px 25px" }}
          animate={{ rotate: [22, -22, 22] }}
          transition={{ duration: 0.65, delay: faseCaminata, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* acento de color de raza en el pecho */}
        <circle cx="10" cy="16" r="1.5" fill={color} opacity="0.9" />
      </svg>
    </div>
  );
}
