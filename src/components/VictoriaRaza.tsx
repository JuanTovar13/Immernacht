import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { RazaId } from "../game/types";

/**
 * Fondo de la pantalla de victoria personalizado para cada raza, según lo
 * que cuenta su texto final. Todas comparten el destello inicial del sol
 * (el eclipse abriéndose lo dibuja OpenPortal encima); lo que cambia es el
 * ambiente, el color de las ondas y las partículas.
 *
 * Solo se animan transform y opacity, para que el móvil no repinte.
 */
export function FondoVictoria({ raza }: { raza: RazaId }) {
  const tema = TEMAS[raza];
  return (
    <>
      <div className="absolute inset-0" style={{ background: tema.fondo }} />
      <Efecto raza={raza} />
      <Destello />
      <Ondas color={tema.onda} lentas={raza === "nomuertos"} />
    </>
  );
}

const TEMAS: Record<RazaId, { fondo: string; onda: string }> = {
  humanos: {
    fondo: "radial-gradient(140% 100% at 50% 30%, #3a2f16 0%, #1c1710 45%, var(--color-void-deep) 85%)",
    onda: "var(--color-eclipse-gold)",
  },
  elfos: {
    fondo: "radial-gradient(140% 100% at 50% 30%, #1f3a22 0%, #0f1f17 45%, var(--color-void-deep) 85%)",
    onda: "#9fe0a4",
  },
  enanos: {
    fondo: "radial-gradient(140% 100% at 50% 30%, #3d2414 0%, #1e140d 45%, var(--color-void-deep) 85%)",
    onda: "#f0a45a",
  },
  nomuertos: {
    fondo: "radial-gradient(140% 100% at 50% 30%, #232a38 0%, #11151d 45%, var(--color-void-deep) 85%)",
    onda: "#a9b8cc",
  },
};

function Efecto({ raza }: { raza: RazaId }) {
  switch (raza) {
    case "humanos":
      return <SedEterna />;
    case "elfos":
      return <NaturalezaDesatada />;
    case "enanos":
      return <CodiciaMinera />;
    case "nomuertos":
      return <CementerioSilencioso />;
  }
}

/* ---------------- Común ---------------- */

/** Pseudoaleatorio fijo: las partículas no cambian entre renders. */
function azar(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Centro del portal en la pantalla (donde está el sol). */
const CENTRO = { left: "50%", top: "38%" } as const;

function Destello() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ background: "radial-gradient(circle at 50% 42%, #fff8e6 0%, var(--color-eclipse-gold) 35%, transparent 70%)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    />
  );
}

function Ondas({ color, lentas }: { color: string; lentas: boolean }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ ...CENTRO, borderColor: color }}
          initial={{ width: 20, height: 20, opacity: lentas ? 0.4 : 0.7 }}
          animate={{ width: "180vw", height: "180vw", opacity: 0 }}
          transition={{ duration: lentas ? 5 : 3.2, delay: i * (lentas ? 1.4 : 0.9), repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

/* ---------------- Humanos: la sed que nunca se apagará ---------------- */

/** Rayos de sol imperiales girando y el oro del mundo absorbido hacia el portal. */
function SedEterna() {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          ...CENTRO,
          width: "220vmax",
          height: "220vmax",
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,232,170,0.16) 0deg 5deg, transparent 5deg 18deg)",
          WebkitMaskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 25%, transparent 55%)",
          maskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.6) 25%, transparent 55%)",
        }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: 1, rotate: 360 }}
        transition={{ opacity: { duration: 2, delay: 1 }, rotate: { duration: 90, repeat: Infinity, ease: "linear" } }}
      />
      {/* Chispas de oro que vienen de todos los rincones y el portal consume */}
      {Array.from({ length: 30 }, (_, i) => {
        const ang = azar(i, 1) * Math.PI * 2;
        const dist = 55 + azar(i, 2) * 30;
        const tam = 4 + azar(i, 3) * 5;
        return (
          <motion.span
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              ...CENTRO,
              width: tam,
              height: tam,
              marginLeft: -tam / 2,
              marginTop: -tam / 2,
              background: i % 4 === 0 ? "#fff3d1" : "var(--color-eclipse-gold)",
              boxShadow: "0 0 10px var(--color-eclipse-gold), 0 0 3px #fff3d1",
            }}
            initial={{ x: `${Math.cos(ang) * dist}vmax`, y: `${Math.sin(ang) * dist}vmax`, opacity: 0, scale: 1 }}
            animate={{ x: "0vmax", y: "0vmax", opacity: [0, 1, 1, 0], scale: [1, 1, 0.3] }}
            transition={{ duration: 3.5 + azar(i, 4) * 2.5, delay: 1.2 + azar(i, 5) * 4, repeat: Infinity, ease: "easeIn" }}
          />
        );
      })}
    </>
  );
}

/* ---------------- Elfos: la naturaleza que ya nadie detiene ---------------- */

const VERDE = ["#7fbf8f", "#5fa56f", "#a6d98a", "#3f8a55"];

/** Enredaderas que trepan desde los bordes, hojas que se elevan y polen de energía vital. */
function NaturalezaDesatada() {
  const lianas = Array.from({ length: 9 }, (_, i) => {
    // Repartidas por abajo y subiendo por los lados.
    const lado = i < 5 ? "abajo" : i % 2 ? "izq" : "der";
    const x0 = lado === "abajo" ? 6 + i * 22 + azar(i, 1) * 8 : lado === "izq" ? 0 : 100;
    const y0 = lado === "abajo" ? 100 : 70 + azar(i, 2) * 25;
    const alto = 35 + azar(i, 3) * 35;
    const x1 = lado === "abajo" ? x0 + (azar(i, 4) - 0.5) * 30 : lado === "izq" ? 18 + azar(i, 4) * 12 : 82 - azar(i, 4) * 12;
    const y1 = y0 - alto;
    const cx = (x0 + x1) / 2 + (azar(i, 5) - 0.5) * 40;
    const cy = (y0 + y1) / 2;
    return { x0, y0, x1, y1, cx, cy, retraso: 1 + azar(i, 6) * 1.5, dur: 3 + azar(i, 7) * 2 };
  });
  return (
    <>
      {/* Resplandor verde en el suelo */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: "radial-gradient(80% 70% at 50% 100%, rgba(95,165,111,0.35), transparent 70%)" }}
      />
      <Lianas lianas={lianas} />
      {/* Hojas que brotan a lo largo de cada liana mientras crece */}
      {lianas.flatMap((l, i) =>
        [0.3, 0.55, 0.8, 1].map((t, k) => {
          const x = (1 - t) * (1 - t) * l.x0 + 2 * (1 - t) * t * l.cx + t * t * l.x1;
          const y = (1 - t) * (1 - t) * l.y0 + 2 * (1 - t) * t * l.cy + t * t * l.y1;
          const tam = 9 + azar(i * 4 + k, 8) * 8;
          return (
            <motion.span
              key={`${i}-${k}`}
              className="pointer-events-none absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: tam,
                height: tam,
                marginLeft: -tam / 2,
                marginTop: -tam / 2,
                background: VERDE[(i + k) % VERDE.length],
                borderRadius: "0 70% 0 70%",
              }}
              initial={{ scale: 0, rotate: azar(i, k) * 180 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: l.retraso + l.dur * Math.min(1, t * 0.9), ease: "backOut" }}
            />
          );
        })
      )}
      {/* Hojas sueltas que se elevan */}
      {Array.from({ length: 14 }, (_, i) => {
        const tam = 8 + azar(i, 9) * 7;
        return (
          <motion.span
            key={`h${i}`}
            className="pointer-events-none absolute"
            style={{
              left: `${azar(i, 10) * 100}%`,
              bottom: "-4%",
              width: tam,
              height: tam,
              background: VERDE[i % VERDE.length],
              borderRadius: "0 70% 0 70%",
              opacity: 0.85,
            }}
            initial={{ y: "0vh", x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: "-110vh", x: [0, 25, -15, 20], rotate: [0, 160, 340], opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: 7 + azar(i, 11) * 5, delay: 1.5 + azar(i, 12) * 5, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
      {/* Polen: energía vital que late */}
      {Array.from({ length: 22 }, (_, i) => (
        <motion.span
          key={`p${i}`}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${azar(i, 13) * 100}%`,
            top: `${20 + azar(i, 14) * 75}%`,
            background: i % 2 ? "#e8f5a0" : "#b6f2b8",
            boxShadow: "0 0 8px #c8f5a0",
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4], y: [0, -18, -30] }}
          transition={{ duration: 2.6 + azar(i, 15) * 2, delay: 1 + azar(i, 16) * 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

/** Las lianas en píxeles reales (en un svg estirado, pathLength no se dibuja bien). */
function Lianas({ lianas }: { lianas: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; retraso: number; dur: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const X = (v: number) => ((tam?.w ?? 0) * v) / 100;
  const Y = (v: number) => ((tam?.h ?? 0) * v) / 100;
  return (
    <svg ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {tam &&
        lianas.map((l, i) => (
          <motion.path
            key={i}
            d={`M ${X(l.x0)} ${Y(l.y0)} Q ${X(l.cx)} ${Y(l.cy)} ${X(l.x1)} ${Y(l.y1)}`}
            fill="none"
            stroke={VERDE[i % VERDE.length]}
            strokeWidth={i % 3 === 0 ? 4 : 2.5}
            strokeLinecap="round"
            opacity={0.75}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: l.dur, delay: l.retraso, ease: "easeOut" }}
          />
        ))}
    </svg>
  );
}

/* ---------------- Enanos: la codicia que no conoce límites ---------------- */

const GEMAS = ["#e0475b", "#4fa3e0", "#4fd18b", "#b86ae0"];

/** Un golpe de martillo que sacude la pantalla, lluvia de monedas y gemas, y chispas de forja. */
function CodiciaMinera() {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ x: 0, y: 0 }}
      animate={{ x: [0, -7, 6, -4, 3, 0], y: [0, 4, -3, 2, 0, 0] }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {/* Brasa del tesoro amontonado en el suelo */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
        style={{ background: "radial-gradient(70% 80% at 50% 100%, rgba(240,164,90,0.45), rgba(201,123,74,0.15) 45%, transparent 75%)" }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Monedas que caen girando */}
      {Array.from({ length: 24 }, (_, i) => {
        const tam = 12 + azar(i, 1) * 10;
        return (
          <motion.span
            key={`m${i}`}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${azar(i, 2) * 100}%`,
              top: "-6%",
              width: tam,
              height: tam,
              background: "radial-gradient(circle at 35% 30%, #fff1b8, #e8c468 45%, #a8782a 100%)",
              border: "1px solid #7a5418",
              boxShadow: "0 0 6px rgba(232,196,104,0.6)",
            }}
            initial={{ y: "0vh", scaleX: 1, opacity: 0 }}
            animate={{ y: "112vh", scaleX: [1, 0.15, 1, 0.15, 1], opacity: [0, 1, 1, 1] }}
            transition={{ duration: 3 + azar(i, 3) * 2.5, delay: 0.8 + azar(i, 4) * 4, repeat: Infinity, ease: "easeIn" }}
          />
        );
      })}
      {/* Gemas */}
      {Array.from({ length: 10 }, (_, i) => {
        const tam = 9 + azar(i, 5) * 6;
        const color = GEMAS[i % GEMAS.length];
        return (
          <motion.span
            key={`g${i}`}
            className="pointer-events-none absolute"
            style={{
              left: `${azar(i, 6) * 100}%`,
              top: "-6%",
              width: tam,
              height: tam,
              background: `linear-gradient(135deg, #ffffff 0%, ${color} 40%, ${color} 70%, #000 140%)`,
              boxShadow: `0 0 8px ${color}`,
            }}
            initial={{ y: "0vh", rotate: 45, opacity: 0 }}
            animate={{ y: "112vh", rotate: [45, 225, 405], opacity: [0, 1, 1, 1] }}
            transition={{ duration: 3.5 + azar(i, 7) * 2, delay: 1.2 + azar(i, 8) * 4, repeat: Infinity, ease: "easeIn" }}
          />
        );
      })}
      {/* Chispas de forja que suben */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.span
          key={`c${i}`}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${10 + azar(i, 9) * 80}%`,
            bottom: "0%",
            width: 3,
            height: 3,
            background: i % 3 ? "#ffb15a" : "#fff0c0",
            boxShadow: "0 0 6px #ff9a3c",
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: "-45vh", x: (azar(i, 10) - 0.5) * 80, opacity: [0, 1, 0] }}
          transition={{ duration: 1.8 + azar(i, 11) * 1.6, delay: 0.6 + azar(i, 12) * 3, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

/* ---------------- No-Muertos: un cementerio silencioso ---------------- */

/** Lápida de remate redondo, apoyada en el suelo (y = 20). */
function lapida(x: number, ancho: number, alto: number) {
  const r = ancho / 2;
  return `M ${x - r} 20 V ${20 - alto + r} A ${r} ${r} 0 0 1 ${x + r} ${20 - alto + r} V 20 Z`;
}

/** Cruz con la punta en `arriba`, apoyada en el suelo (y = 20). */
function cruz(x: number, arriba: number) {
  const a = 0.6; // medio grosor del palo
  const b = 2; // medio largo del travesaño
  const t = arriba + 2.5; // altura del travesaño
  return `M ${x - a} 20 V ${t + 1.1} H ${x - b} V ${t} H ${x - a} V ${arriba} H ${x + a} V ${t} H ${x + b} V ${t + 1.1} H ${x + a} V 20 Z`;
}

/** Lápidas que emergen del suelo, niebla que se arrastra, ceniza que cae y almas que se elevan. */
function CementerioSilencioso() {
  const lapidas = Array.from({ length: 9 }, (_, i) => ({
    x: 4 + i * 11.5 + (azar(i, 1) - 0.5) * 5,
    alto: 7 + azar(i, 2) * 6,
    ancho: 3.2 + azar(i, 3) * 2,
    cruz: i % 3 === 1,
    inclina: (azar(i, 4) - 0.5) * 14,
  }));
  return (
    <>
      {/* Ceniza que cae lenta */}
      {Array.from({ length: 30 }, (_, i) => {
        const tam = 2 + azar(i, 5) * 3;
        return (
          <motion.span
            key={`a${i}`}
            className="pointer-events-none absolute rounded-full"
            style={{ left: `${azar(i, 6) * 100}%`, top: "-4%", width: tam, height: tam, background: i % 3 ? "#8d96a6" : "#c4ccd8" }}
            initial={{ y: "0vh", x: 0, opacity: 0 }}
            animate={{ y: "108vh", x: [0, 18, -12, 10], opacity: [0, 0.8, 0.8, 0] }}
            transition={{ duration: 9 + azar(i, 7) * 6, delay: azar(i, 8) * 7, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
      {/* Almas pálidas que se elevan y se desvanecen */}
      {Array.from({ length: 7 }, (_, i) => (
        <motion.span
          key={`s${i}`}
          className="pointer-events-none absolute"
          style={{
            left: `${8 + azar(i, 9) * 84}%`,
            bottom: "8%",
            width: 26,
            height: 48,
            borderRadius: "50% 50% 45% 45%",
            background: "radial-gradient(ellipse at 50% 35%, rgba(200,215,235,0.45), rgba(150,170,200,0.12) 55%, transparent 72%)",
          }}
          initial={{ y: 0, opacity: 0, scaleX: 1 }}
          animate={{ y: "-55vh", opacity: [0, 0.8, 0], scaleX: [1, 0.7, 1.1] }}
          transition={{ duration: 6 + azar(i, 10) * 3, delay: 2 + azar(i, 11) * 6, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      {/* Lápidas emergiendo del suelo */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] w-full" viewBox="0 0 100 20" preserveAspectRatio="xMidYMax meet" aria-hidden>
        {lapidas.map((l, i) => (
          <motion.g
            key={i}
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            transition={{ duration: 1.6, delay: 1.4 + i * 0.22, ease: "easeOut" }}
          >
            <g transform={`rotate(${l.inclina} ${l.x} 20)`}>
              <path
                d={l.cruz ? cruz(l.x, 20 - l.alto - 2) : lapida(l.x, l.ancho, l.alto)}
                fill="#1a2030"
                stroke="#55637c"
                strokeWidth={0.3}
                strokeLinejoin="round"
              />
            </g>
          </motion.g>
        ))}
        <rect x={0} y={18.5} width={100} height={1.5} fill="#07090f" />
      </svg>
      {/* Niebla que se arrastra por el suelo */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`n${i}`}
          className="pointer-events-none absolute bottom-[-6%] h-[34%] w-[160%]"
          style={{
            left: "-30%",
            background: "radial-gradient(50% 50% at 50% 60%, rgba(160,175,200,0.22), transparent 70%)",
          }}
          initial={{ x: i % 2 ? "8%" : "-8%", opacity: 0 }}
          animate={{ x: i % 2 ? ["8%", "-8%", "8%"] : ["-8%", "8%", "-8%"], opacity: 1 }}
          transition={{ x: { duration: 16 + i * 5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 3, delay: 1 + i * 0.6 } }}
        />
      ))}
    </>
  );
}
