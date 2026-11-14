import { motion } from "framer-motion";
import { WalkingFigures } from "./WalkingFigures";

/**
 * Escenario del Santuario Atávico en parallax (3 capas + ruinas en primer plano).
 * Todo en SVG vectorial recortado en siluetas — da profundidad "de juego"
 * sin depender de imágenes externas.
 */
export function SanctuaryScene() {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[60%] sm:h-[55%]">
      {/* Capa lejana: cordillera difusa */}
      <motion.svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[18%] h-[70%] w-full opacity-70"
        initial={{ x: 0 }}
        animate={{ x: [-6, 6, -6] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M0,120 L0,70 Q40,40 80,60 T160,50 T240,65 T320,45 T400,60 L400,120 Z"
          fill="#232a4d"
        />
      </motion.svg>

      {/* Capa media: montañas más definidas */}
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[14%] h-[55%] w-full"
      >
        <path
          d="M0,100 L0,55 L35,20 L60,45 L90,10 L120,50 L160,25 L200,55 L235,15 L270,48 L310,22 L345,52 L400,30 L400,100 Z"
          fill="#181d38"
        />
      </svg>

      {/* Siluetas de las 4 razas caminando */}
      <WalkingFigures />

      {/* Suelo del santuario */}
      <div
        className="absolute inset-x-0 bottom-0 h-[16%]"
        style={{
          background:
            "linear-gradient(180deg, #0d1024 0%, var(--color-void-deep) 100%)",
        }}
      />
      {/* Textura de losas de piedra, estilo tile de juego */}
      <div
        className="absolute inset-x-0 bottom-0 h-[16%] opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(232,196,104,0.08) 0 2px, transparent 2px 64px), repeating-linear-gradient(180deg, rgba(0,0,0,0.4) 0 1px, transparent 1px 18px)",
        }}
      />

      {/* Ruinas en primer plano: columnas partidas del Santuario Atávico */}
      <svg
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[42%] w-full"
      >
        <g fill="#05070f">
          <path d="M18,100 L18,30 L30,30 L30,55 L24,62 L30,68 L30,100 Z" />
          <path d="M355,100 L355,22 L369,22 L369,48 L361,58 L369,64 L369,100 Z" />
          <path d="M0,100 L0,86 Q10,80 22,86 L22,100 Z" />
          <path d="M378,100 L378,84 Q390,78 400,84 L400,100 Z" />
        </g>
      </svg>
    </div>
  );
}
