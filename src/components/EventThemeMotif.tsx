import { motion } from "framer-motion";
import type { TipoEvento } from "../game/types";

export function EventThemeMotif({ tipo }: { tipo: TipoEvento }) {
  switch (tipo) {
    case "celestial":
      return <CelestialMotif />;
    case "natural":
      return <NaturalMotif />;
    case "arcano":
      return <ArcanoMotif />;
    case "terrenal":
      return <TerrenalMotif />;
  }
}

/* ================= CELESTIAL: rayos, columna de luz, mandala, ondas ================= */
function CelestialMotif() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Columna de luz descendiendo del cielo, como un juicio divino */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "38%",
          height: "100%",
          background: "linear-gradient(180deg, var(--celestial-bright) 0%, transparent 75%)",
          clipPath: "polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)",
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: [0, 0.5, 0.25], scaleY: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* Rayos girando desde el centro */}
      {Array.from({ length: 10 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: 3,
            height: "75vh",
            marginTop: "-75vh",
            background: "linear-gradient(180deg, transparent, var(--celestial-bright)66, transparent)",
            rotate: `${i * 36}deg`,
          }}
          animate={{ rotate: [`${i * 36}deg`, `${i * 36 + 360}deg`], opacity: [0.25, 0.75, 0.25] }}
          transition={{ rotate: { duration: 40, repeat: Infinity, ease: "linear" }, opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 } }}
        />
      ))}

      {/* Mandala sagrada girando */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 opacity-40"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M100 20 L106 34 L100 48 L94 34 Z" fill="var(--celestial-bright)" transform={`rotate(${i * 30} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="60" fill="none" stroke="var(--celestial-bright)" strokeWidth="0.6" strokeDasharray="2 4" />
      </motion.svg>

      {/* Ondas expansivas, como un pulso divino repetido */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ring${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ borderColor: "var(--celestial-bright)" }}
          initial={{ width: 20, height: 20, opacity: 0.6 }}
          animate={{ width: "160vw", height: "160vw", opacity: 0 }}
          transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Partículas doradas ascendiendo */}
      {Array.from({ length: 24 }, (_, i) => (
        <motion.span
          key={`p${i}`}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: "-4%",
            width: 2 + Math.random() * 2.5,
            height: 2 + Math.random() * 2.5,
            background: "var(--celestial-bright)",
            boxShadow: "0 0 8px var(--celestial-bright)",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: "-110vh", opacity: [0, 1, 0] }}
          transition={{ duration: 4.5 + Math.random() * 3, delay: Math.random() * 4, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Destello inicial brillante */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 45%, #fff8e6, transparent 60%)" }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

/* ================= NATURAL: enredaderas, hojas, viento, luciérnagas ================= */
function NaturalMotif() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Enredaderas creciendo desde el suelo, repartidas por todo el ancho — cada una con
          3 hojas a lo largo de su tallo, no solo en la punta */}
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full opacity-70">
        {[
          { baseX: 4, mirror: false, delay: 0 },
          { baseX: 60, mirror: false, delay: 0.18 },
          { baseX: 170, mirror: false, delay: 0.36 },
          { baseX: 60, mirror: true, delay: 0.09 },
          { baseX: 4, mirror: true, delay: 0.27 },
        ].map((v, i) => (
          <Vine key={i} {...v} />
        ))}
      </svg>

      {/* Niebla verde a ras de suelo */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(0deg, color-mix(in srgb, var(--natural-deep) 70%, transparent), transparent)" }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hojas cayendo */}
      {Array.from({ length: 16 }, (_, i) => {
        const left = Math.random() * 100;
        const dur = 5.5 + Math.random() * 4.5;
        const delay = Math.random() * 5;
        return (
          <motion.svg
            key={i}
            width="15"
            height="15"
            viewBox="0 0 14 14"
            className="absolute"
            style={{ left: `${left}%`, top: "-5%" }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
            animate={{ y: "115vh", x: [0, 22, -16, 12, 0], rotate: [0, 200, 380], opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          >
            <path d="M7 0 C 12 3 13 9 7 14 C 1 9 2 3 7 0 Z" fill="var(--natural-bright)" opacity="0.85" />
          </motion.svg>
        );
      })}

      {/* Luciérnagas flotando */}
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={`f${i}`}
          className="absolute rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 55}%`,
            width: 3,
            height: 3,
            background: "var(--natural-glow)",
            boxShadow: "0 0 6px var(--natural-glow)",
          }}
          animate={{ y: [0, -14, 0, 10, 0], x: [0, 8, -6, 4, 0], opacity: [0.2, 1, 0.3, 1, 0.2] }}
          transition={{ duration: 4 + Math.random() * 3, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Ráfagas de viento */}
      {Array.from({ length: 4 }, (_, i) => (
        <motion.div
          key={`w${i}`}
          className="absolute h-px w-1/2"
          style={{ top: `${20 + i * 18}%`, background: "linear-gradient(90deg, transparent, var(--natural-glow)66, transparent)" }}
          initial={{ x: "-60%", opacity: 0 }}
          animate={{ x: "160%", opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.4, delay: i * 0.55, repeat: Infinity, repeatDelay: 1.2 }}
        />
      ))}
    </div>
  );
}

/** Una enredadera individual: crece desde el suelo con 3 curvas y 3 hojas a lo
 *  largo del tallo (no solo en la punta). `mirror` refleja todo horizontalmente
 *  para poder reutilizar la misma forma en el lado derecho. */
function Vine({ baseX, mirror, delay }: { baseX: number; mirror: boolean; delay: number }) {
  const mx = (x: number) => (mirror ? 400 - x : x);
  const anclas = [
    { x: mx(baseX + 38), y: 195, angle: mirror ? 145 : -35 },
    { x: mx(baseX + 68), y: 125, angle: mirror ? 195 : 15 },
    { x: mx(baseX + 92), y: 55, angle: mirror ? 160 : -20 },
  ];
  const d = `M${mx(baseX)} 300 C ${mx(baseX + 22)} 260, ${mx(baseX + 8)} 225, ${anclas[0].x} ${anclas[0].y} C ${mx(baseX + 55)} 172, ${mx(baseX + 48)} 145, ${anclas[1].x} ${anclas[1].y} C ${mx(baseX + 82)} 95, ${mx(baseX + 74)} 65, ${anclas[2].x} ${anclas[2].y}`;

  return (
    <>
      <motion.path
        d={d}
        stroke="var(--natural-bright)"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.85 }}
        transition={{ duration: 1.8, delay, ease: "easeOut" }}
      />
      {anclas.map((a, i) => (
        <g key={i} transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}>
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.95, scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.5 + i * 0.15, ease: "backOut" }}
            style={{ transformOrigin: "0px 0px" }}
          >
            <path d="M0 0 C 7 -9, 18 -8, 22 0 C 18 8, 7 9, 0 0 Z" fill="var(--natural-glow)" stroke="var(--natural-deep)" strokeWidth="0.6" />
            <path d="M1 0 L20 0" stroke="var(--natural-deep)" strokeWidth="0.5" opacity="0.7" />
          </motion.g>
        </g>
      ))}
    </>
  );
}

/* ================= ARCANO: glifos, rayos mágicos, ondas de distorsión ================= */
function ArcanoMotif() {
  const glifos = ["M0 -10 L9 8 L-9 8 Z", "M-8 0 A8 8 0 1 1 8 0 A8 8 0 1 1 -8 0", "M0 -9 L9 0 L0 9 L-9 0 Z"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Círculo mágico central expandiéndose al inicio */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
        animate={{ opacity: 0.55, scale: 1, rotate: 360 }}
        transition={{ opacity: { duration: 0.8 }, scale: { duration: 0.9, ease: "backOut" }, rotate: { duration: 45, repeat: Infinity, ease: "linear" } }}
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="var(--arcano-bright)" strokeWidth="0.7" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="var(--arcano-glow)" strokeWidth="0.5" strokeDasharray="1 5" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="100" y1="4" x2="100" y2="20" stroke="var(--arcano-bright)" strokeWidth="0.8" transform={`rotate(${i * 45} 100 100)`} />
        ))}
        <path d="M100 20 L180 100 L100 180 L20 100 Z" fill="none" stroke="var(--arcano-glow)" strokeWidth="0.5" opacity="0.6" />
      </motion.svg>

      {/* Rayos/relámpagos arcanos cruzando ocasionalmente */}
      {[0, 1].map((i) => (
        <motion.svg key={i} viewBox="0 0 200 300" className="absolute inset-0 h-full w-full">
          <motion.path
            d={i === 0 ? "M40 0 L60 60 L30 90 L70 150 L40 220 L80 300" : "M170 0 L150 70 L180 110 L140 170 L165 240 L130 300"}
            stroke="var(--arcano-glow)"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 0.5, delay: 1.6 + i * 0.9, repeat: Infinity, repeatDelay: 2.6, ease: "easeOut" }}
          />
        </motion.svg>
      ))}

      {/* Glifos orbitando */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 360) / 12;
        const radius = 30 + (i % 3) * 9;
        return (
          <motion.svg
            key={i}
            width="20"
            height="20"
            viewBox="-10 -10 20 20"
            className="absolute left-1/2 top-1/2"
            style={{ marginLeft: -10, marginTop: -10 }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 0.9, 0],
              scale: [0.4, 1.1, 0.4],
              x: `${radius * Math.cos((angle * Math.PI) / 180)}vw`,
              y: `${(radius * Math.sin((angle * Math.PI) / 180)) / 2}vh`,
              rotate: 360,
            }}
            transition={{ duration: 3.5 + (i % 3), delay: i * 0.25, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d={glifos[i % glifos.length]} fill="none" stroke="var(--arcano-bright)" strokeWidth="1" />
          </motion.svg>
        );
      })}

      {/* Ondas de distorsión repetidas */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`ripple${i}`}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 10, height: 10, border: "1px solid var(--arcano-glow)" }}
          animate={{ scale: [1, 22], opacity: [0.6, 0] }}
          transition={{ duration: 2.8, delay: i * 0.9, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Chispas violetas erráticas */}
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={`s${i}`}
          className="absolute rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: 2, height: 2, background: "var(--arcano-glow)", boxShadow: "0 0 6px var(--arcano-glow)" }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.6, 0.5] }}
          transition={{ duration: 0.9 + Math.random(), delay: Math.random() * 3, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

/* ================= TERRENAL: rocas, grietas, polvo, impacto ================= */
function TerrenalMotif() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Flash de impacto inicial */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 60%, #e8d9c0, transparent 55%)" }}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />

      {/* Nube de polvo elevándose */}
      {Array.from({ length: 3 }, (_, i) => (
        <motion.div
          key={`dust${i}`}
          className="absolute rounded-full"
          style={{
            left: `${30 + i * 20}%`,
            bottom: "8%",
            width: 90,
            height: 90,
            background: "radial-gradient(circle, color-mix(in srgb, var(--terrenal-bright) 55%, transparent) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
          initial={{ opacity: 0, scale: 0.4, y: 0 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.4, 1.4, 1.8], y: -60 }}
          transition={{ duration: 2, delay: i * 0.15, ease: "easeOut" }}
        />
      ))}

      {/* Grietas incandescentes ramificadas */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-60">
        <motion.path
          d="M100 0 L92 40 L106 70 L88 110 L100 200"
          stroke="var(--terrenal-glow)"
          strokeWidth="0.8"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 1, 0.5] }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        <motion.path
          d="M92 40 L60 60 M106 70 L140 85 M88 110 L50 130"
          stroke="var(--terrenal-glow)"
          strokeWidth="0.6"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: [0, 0.8, 0.3] }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        />
      </svg>

      {/* Rocas tumbando */}
      {Array.from({ length: 12 }, (_, i) => {
        const left = Math.random() * 100;
        const dur = 1.5 + Math.random() * 1.3;
        const delay = Math.random() * 1.6;
        const size = 5 + Math.random() * 7;
        return (
          <motion.svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 10 10"
            className="absolute"
            style={{ left: `${left}%`, top: "-6%" }}
            initial={{ y: 0, rotate: 0, opacity: 0 }}
            animate={{ y: "78vh", rotate: 280, opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeIn" }}
          >
            <polygon points="5,0 10,4 8,10 2,10 0,4" fill="var(--terrenal-bright)" />
          </motion.svg>
        );
      })}
    </div>
  );
}
