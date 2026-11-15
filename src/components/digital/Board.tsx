import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";
import { RAZAS, type RazaId } from "../../game/types";
import {
  BASE_CUARTO0,
  BASE_RECT0,
  CELDAS_CUARTO0,
  CENTRO,
  centroLoop,
  claveCasilla,
  COLOR_TABLERO,
  CUARTO,
  ejeCasilla,
  META_CUARTO0,
  poligonoCasilla,
  poligonoLoop,
  PORTAL,
  PUERTA0,
  puntoFicha,
  RAZA_DE_CUARTO,
  REL_ENTRADA,
  REL_META_INI,
  rotar,
  TAM,
  type Punto,
} from "../../game/digital/board";
import type { Derrumbe, Ficha, Movimiento } from "../../game/digital/engine";

const pts = (ps: Punto[]) => ps.map((p) => `${p.x},${p.y}`).join(" ");

const PISTA = "#8283a8";
const PISTA_LINEA = "#5f6086";
const PIEDRA = "#3b3c49";
const PIEDRA_OSCURA = "#2c2d38";

interface BoardProps {
  fichas: Ficha[];
  razasEnJuego: RazaId[];
  turno: RazaId;
  movibles: Set<string>;
  seleccion: string | null;
  destinos: Movimiento[];
  baseActiva: boolean;
  derrumbes: Derrumbe[];
  onFicha: (id: string) => void;
  onDestino: (m: Movimiento) => void;
  onBase: () => void;
}

export function Board(props: BoardProps) {
  const { fichas, razasEnJuego, turno, movibles, seleccion, destinos, baseActiva, derrumbes, onFicha, onDestino, onBase } = props;
  const lugares = useLugares(fichas);
  const fichaSel = fichas.find((f) => f.id === seleccion);

  return (
    <svg viewBox={`-10 -10 ${TAM + 20} ${TAM + 20}`} className="h-full w-full select-none" role="img" aria-label="Tablero de Immernacht">
      <defs>
        <radialGradient id="portal-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5b3d8f" />
          <stop offset="60%" stopColor="#2a1d48" />
          <stop offset="100%" stopColor="#17112b" />
        </radialGradient>
        <filter id="sombra" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <filter id="brillo" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Marco */}
      <rect x={-8} y={-8} width={TAM + 16} height={TAM + 16} rx={16} fill="#e8c468" />
      <rect x={0} y={0} width={TAM} height={TAM} rx={8} fill={PISTA} />

      {/* Cuatro cuartos: misma geometría rotada */}
      {[0, 1, 2, 3].map((q) => (
        <CuartoEstatico key={q} q={q} activo={razasEnJuego.includes(RAZA_DE_CUARTO[q])} />
      ))}

      {/* Etiquetas (fuera del grupo rotado para que se lean bien) */}
      {[0, 1, 2, 3].map((q) =>
        [0, 5, 14].map((k) => {
          const c = rotar(CELDAS_CUARTO0[k].centro, q);
          let ang = CELDAS_CUARTO0[k].anguloTexto - 90 * q;
          ang = ((ang % 360) + 360) % 360;
          if (ang > 90 && ang <= 270) ang -= 180;
          return (
            <text
              key={`${q}-${k}`}
              x={c.x}
              y={c.y}
              transform={`rotate(${ang} ${c.x} ${c.y})`}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Cinzel, serif"
              fontWeight={600}
              fontSize={k === 0 ? 15 : 16}
              fill="#fff6e6"
              style={{ pointerEvents: "none" }}
            >
              {k === 5 ? "Salida" : "Refugio"}
            </text>
          );
        })
      )}

      {/* Emblemas en las casillas de la base (sin rotar) */}
      {[0, 1, 2, 3].map((q) => {
        const raza = RAZA_DE_CUARTO[q];
        return BASE_CUARTO0.map((p, i) => {
          const c = rotar(p, q);
          return (
            <image
              key={`${q}-${i}`}
              href={RAZAS[raza].logo}
              x={c.x - 17}
              y={c.y - 17}
              width={34}
              height={34}
              opacity={razasEnJuego.includes(raza) ? 0.35 : 0.15}
              style={{ pointerEvents: "none" }}
            />
          );
        });
      })}

      <Portal />

      {/* Derrumbes de Rocas: casillas afectadas */}
      <AnimatePresence>
        {derrumbes.flatMap((d) => d.celdas.map((idx) => <Rocas key={`${d.id}-${idx}`} idx={idx} />))}
      </AnimatePresence>

      {/* Fichas */}
      {fichas.map((f) => (
        <FichaToken
          key={f.id}
          ficha={f}
          offset={lugares.get(f.id) ?? { x: 0, y: 0 }}
          movible={movibles.has(f.id)}
          seleccionada={seleccion === f.id}
          onClick={() => onFicha(f.id)}
        />
      ))}

      {/* Base clicable para sacar ficha (encima de las fichas para que sea fácil de tocar) */}
      {baseActiva && <BaseActiva raza={turno} onClick={onBase} />}

      {/* Casillas a las que puede ir la ficha seleccionada: se ilumina la casilla entera */}
      {fichaSel &&
        destinos.map((m) => {
          const poly = poligonoCasilla(fichaSel.raza, m.destino);
          const c = puntoFicha(fichaSel.raza, m.destino, fichaSel.n);
          return (
            <g key={`${m.opcion}`} onClick={() => onDestino(m)} style={{ cursor: "pointer" }}>
              <motion.polygon
                points={pts(poly)}
                fill="#ffe9a8"
                stroke="#fff3c4"
                strokeWidth={3}
                strokeLinejoin="round"
                initial={{ fillOpacity: 0.25 }}
                animate={{ fillOpacity: [0.22, 0.5, 0.22] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="Cinzel, serif"
                fontWeight={700}
                fontSize={18}
                fill="#fff"
                stroke="#1a1426"
                strokeWidth={3.5}
                paintOrder="stroke"
                style={{ pointerEvents: "none" }}
              >
                {m.valor}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

/**
 * Lugar de cada ficha dentro de su casilla. Si dos fichas comparten casilla,
 * se ubican una al lado de la otra; cada ficha conserva su lado mientras siga
 * ahí, para que la que ya estaba no salte de un lado a otro.
 */
function useLugares(fichas: Ficha[]): Map<string, Punto> {
  const [mem, setMem] = useState(() => ({ fichas, lados: calcularLados(fichas, new Map()) }));
  let lados = mem.lados;
  if (mem.fichas !== fichas) {
    lados = calcularLados(fichas, mem.lados);
    setMem({ fichas, lados });
  }
  const res = new Map<string, Punto>();
  for (const f of fichas) {
    const l = lados.get(f.id);
    if (!l || l.total <= 1) {
      res.set(f.id, { x: 0, y: 0 });
      continue;
    }
    const eje = ejeCasilla(f.raza, f.rel);
    const k = l.total === 2 ? (l.lado === 0 ? -1 : 1) : (l.lado - (l.total - 1) / 2) * 0.9;
    res.set(f.id, { x: eje.x * k, y: eje.y * k });
  }
  return res;
}

type Lado = { clave: string; lado: number; total: number };

function calcularLados(fichas: Ficha[], previos: Map<string, Lado>): Map<string, Lado> {
  const grupos = new Map<string, Ficha[]>();
  for (const f of fichas) {
    const k = claveCasilla(f.raza, f.rel, f.n);
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const res = new Map<string, Lado>();
  for (const [clave, grupo] of grupos) {
    const usados = new Set<number>();
    const pendientes: Ficha[] = [];
    for (const f of grupo) {
      const prev = previos.get(f.id);
      if (prev && prev.clave === clave && !usados.has(prev.lado) && prev.lado < grupo.length) {
        usados.add(prev.lado);
        res.set(f.id, { clave, lado: prev.lado, total: grupo.length });
      } else pendientes.push(f);
    }
    for (const f of pendientes) {
      let lado = 0;
      while (usados.has(lado)) lado++;
      usados.add(lado);
      res.set(f.id, { clave, lado, total: grupo.length });
    }
  }
  return res;
}

/** Rocas y señal de prohibido sobre una casilla afectada por un Derrumbe. */
function Rocas({ idx }: { idx: number }) {
  const poly = poligonoLoop(idx);
  const c = centroLoop(idx);
  // piedras alrededor del centro de la casilla (rotan con la casilla para no tapar la ficha)
  const piedras = [
    { dx: -26, dy: -11, r: 8 },
    { dx: 25, dy: -10, r: 7 },
    { dx: -22, dy: 12, r: 6.5 },
    { dx: 27, dy: 11, r: 8.5 },
  ];
  return (
    <motion.g
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{ pointerEvents: "none" }}
    >
      <polygon points={pts(poly)} fill="#4a3826" fillOpacity={0.6} stroke="#d9a066" strokeWidth={2} strokeDasharray="6 4" />
      {piedras.map((s, i) => {
        const k = s.r;
        const x = c.x + s.dx * 0.55;
        const y = c.y + s.dy * 0.9;
        return (
          <path
            key={i}
            d={`M ${x - k} ${y + k * 0.5} L ${x - k * 0.6} ${y - k * 0.7} L ${x + k * 0.3} ${y - k} L ${x + k} ${y - k * 0.2} L ${x + k * 0.7} ${y + k * 0.7} Z`}
            fill={i % 2 ? "#8a7560" : "#6f5c49"}
            stroke="#2b2118"
            strokeWidth={1.4}
          />
        );
      })}
      <g transform={`translate(${c.x + 14} ${c.y - 14})`}>
        <circle r={8} fill="#b3261e" stroke="#fff" strokeWidth={1.6} />
        <rect x={-4.5} y={-1.4} width={9} height={2.8} rx={1} fill="#fff" />
      </g>
    </motion.g>
  );
}

/* ---------------- Partes fijas del tablero ---------------- */

const CuartoEstatico = memo(function CuartoEstatico({ q, activo }: { q: number; activo: boolean }) {
  const raza = RAZA_DE_CUARTO[q];
  const col = COLOR_TABLERO[raza];
  const B = BASE_RECT0;
  const inset = 30;

  return (
    <g transform={`rotate(${-90 * q} ${TAM / 2} ${TAM / 2})`}>
      {/* Base de la facción */}
      <rect x={B.x} y={B.y} width={B.w} height={B.h} fill={PIEDRA} />
      <g stroke={PIEDRA_OSCURA} strokeWidth={1.2} opacity={0.9}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1={inset} x2={B.w - inset} y1={inset + (i * (B.h - 2 * inset)) / 8} y2={inset + (i * (B.h - 2 * inset)) / 8} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} y1={inset} y2={B.h - inset} x1={inset + (i * (B.w - 2 * inset)) / 8} x2={inset + (i * (B.w - 2 * inset)) / 8} />
        ))}
      </g>
      <g stroke="#26272f" strokeWidth={1.5}>
        <line x1={0} y1={0} x2={inset} y2={inset} />
        <line x1={B.w} y1={0} x2={B.w - inset} y2={inset} />
        <line x1={0} y1={B.h} x2={inset} y2={B.h - inset} />
        <line x1={B.w} y1={B.h} x2={B.w - inset} y2={B.h - inset} />
      </g>
      <rect x={inset} y={inset} width={B.w - 2 * inset} height={B.h - 2 * inset} fill="none" stroke="#26272f" strokeWidth={1.5} />
      <rect x={B.x + 3} y={B.y + 3} width={B.w - 6} height={B.h - 6} fill="none" stroke={col.base} strokeWidth={6} opacity={activo ? 1 : 0.35} />
      {BASE_CUARTO0.map((p, i) => (
        <g key={i}>
          <rect x={p.x - 24} y={p.y - 24} width={48} height={48} rx={3} fill={col.base} opacity={activo ? 0.85 : 0.3} />
          <rect x={p.x - 24} y={p.y - 24} width={48} height={48} rx={3} fill="none" stroke={col.oscuro} strokeWidth={2} />
        </g>
      ))}
      {/* Puerta hacia la Salida */}
      <path
        d={`M ${PUERTA0.x + 10} ${PUERTA0.y - 18} L ${PUERTA0.x - 4} ${PUERTA0.y - 18} Q ${PUERTA0.x - 14} ${PUERTA0.y} ${PUERTA0.x - 4} ${PUERTA0.y + 18} L ${PUERTA0.x + 10} ${PUERTA0.y + 18} Z`}
        fill="#24252d"
      />

      {/* Casillas del recorrido */}
      {CELDAS_CUARTO0.map((c, k) => {
        const especial = k === 0 || k === 5 || k === 14;
        return (
          <polygon
            key={k}
            points={pts(c.puntos)}
            fill={especial ? col.oscuro : PISTA}
            stroke={PISTA_LINEA}
            strokeWidth={1}
          />
        );
      })}
      {/* Franja de color en las casillas especiales */}
      {[0, 5, 14].map((k) => (
        <polygon key={k} points={pts(CELDAS_CUARTO0[k].puntos)} fill={col.base} opacity={0.85} />
      ))}

      {/* Grietas decorativas */}
      <g stroke="#3f3f5e" strokeWidth={1.1} fill="none" opacity={0.7}>
        <path d="M 290 40 l 8 6 l -3 9 l 10 5 l 4 9" />
        <path d="M 335 210 l -6 8 l 5 7 l -9 10" />
        <path d="M 40 300 l 9 -4 l 5 8 l 11 -3" />
        <path d="M 200 345 l 7 -6 l 9 4 l 6 -8" />
      </g>

      {/* Carril final */}
      <rect x={META_CUARTO0[0].puntos[0].x} y={META_CUARTO0[0].puntos[0].y} width={90} height={META_CUARTO0[3].puntos[2].y - META_CUARTO0[0].puntos[0].y} fill={PIEDRA} />
      {META_CUARTO0.map((m, j) => {
        const { x, y } = m.centro;
        return (
          <g key={j}>
            <rect x={m.puntos[0].x + 2} y={m.puntos[0].y + 2} width={86} height={m.puntos[2].y - m.puntos[0].y - 4} rx={8} fill="#43444f" />
            {Array.from({ length: 8 }, (_, t) => {
              const a = (t * Math.PI) / 4;
              return (
                <line
                  key={t}
                  x1={x + Math.cos(a) * 25}
                  y1={y + Math.sin(a) * 25}
                  x2={x + Math.cos(a) * 33}
                  y2={y + Math.sin(a) * 33}
                  stroke={col.claro}
                  strokeWidth={1.5}
                  opacity={0.8}
                />
              );
            })}
            <circle cx={x} cy={y} r={25} fill="none" stroke={col.claro} strokeWidth={1.5} opacity={0.8} />
            <circle cx={x} cy={y} r={21} fill={col.base} opacity={activo ? 1 : 0.4} />
            <circle cx={x - 5} cy={y - 6} r={8} fill="#fff" opacity={0.12} />
          </g>
        );
      })}
    </g>
  );
});

function Portal() {
  const { x, y, w } = PORTAL;
  const c = CENTRO;
  return (
    <g>
      <rect x={x} y={y} width={w} height={w} fill="url(#portal-g)" />
      {/* Giro nativo de SVG alrededor del centro exacto del portal */}
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${c.x} ${c.y}`}
          to={`360 ${c.x} ${c.y}`}
          dur="40s"
          repeatCount="indefinite"
        />
        <circle cx={c.x} cy={c.y} r={38} fill="none" stroke="#b27fe8" strokeWidth={1.2} strokeDasharray="4 5" opacity={0.8} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3;
          return (
            <line
              key={i}
              x1={c.x + Math.cos(a) * 18}
              y1={c.y + Math.sin(a) * 18}
              x2={c.x + Math.cos(a) * 36}
              y2={c.y + Math.sin(a) * 36}
              stroke="#d9b8ff"
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}
      </g>
      <motion.circle
        cx={c.x}
        cy={c.y}
        r={16}
        fill="#0b0816"
        stroke="#e8c468"
        strokeWidth={1.5}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </g>
  );
}

function BaseActiva({ raza, onClick }: { raza: RazaId; onClick: () => void }) {
  const q = CUARTO[raza];
  const a = rotar({ x: 0, y: 0 }, q);
  const b = rotar({ x: BASE_RECT0.w, y: BASE_RECT0.h }, q);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <motion.rect
        x={x + 4}
        y={y + 4}
        width={BASE_RECT0.w - 8}
        height={BASE_RECT0.h - 8}
        rx={6}
        fill="#ffe9a8"
        stroke="#fff3c4"
        strokeWidth={5}
        initial={{ fillOpacity: 0.2 }}
        animate={{ fillOpacity: [0.14, 0.38, 0.14] }}
        transition={{ duration: 1.3, repeat: Infinity }}
      />
      <text
        x={x + BASE_RECT0.w / 2}
        y={y + BASE_RECT0.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Cinzel, serif"
        fontWeight={700}
        fontSize={22}
        fill="#fff"
        stroke="#1a1426"
        strokeWidth={4}
        paintOrder="stroke"
        style={{ pointerEvents: "none" }}
      >
        Sacar ficha
      </text>
    </g>
  );
}

/* ---------------- Fichas ---------------- */

/**
 * Íconos de las fichas (public/fichas, 1341×1341 con fondo transparente).
 * `centro` es el centro del dibujo dentro de la imagen, para que todas
 * queden centradas en su casilla aunque el dibujo no ocupe toda la imagen.
 */
const ICONO_TAM = 1341;
const ICONO_FICHA: Record<RazaId, { src: string; centro: Punto }> = {
  elfos: { src: "/fichas/elfos.png", centro: { x: 666, y: 670 } },
  enanos: { src: "/fichas/enanos.png", centro: { x: 669, y: 733 } },
  humanos: { src: "/fichas/humanos.png", centro: { x: 670, y: 670 } },
  nomuertos: { src: "/fichas/nomuertos.png", centro: { x: 673, y: 673 } },
};
/** Tamaño de la imagen completa en el tablero (el dibujo mide ~32 unidades). */
const FICHA_W = 41;

/** Aura de una ficha protegida: halo suave + anillo punteado que gira, por fuera del ícono. */
function AuraProteccion({ color, r }: { color: string; r: number }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      <motion.circle
        r={r}
        fill={color}
        initial={{ fillOpacity: 0.12 }}
        animate={{ fillOpacity: [0.08, 0.2, 0.08] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
        <circle r={r} fill="none" stroke="#1b1c24" strokeWidth={4.5} strokeOpacity={0.55} strokeDasharray="5 3.5" />
        <circle r={r} fill="none" stroke={color} strokeWidth={2.6} strokeDasharray="5 3.5" />
      </g>
    </g>
  );
}

function caminoDe(raza: RazaId, desde: number | null, hasta: number | null, n: number): Punto[] {
  const fin = puntoFicha(raza, hasta, n);
  if (desde === null || hasta === null || desde === hasta) return [fin];
  const diff = hasta - desde;
  if (Math.abs(diff) > 14) return [fin];
  // un salto del recorrido al carril sólo es válido en orden
  if (desde > REL_ENTRADA && hasta <= REL_ENTRADA) return [fin];
  const paso = diff > 0 ? 1 : -1;
  const puntos: Punto[] = [];
  for (let r = desde + paso; r !== hasta; r += paso) puntos.push(puntoFicha(raza, r, n));
  puntos.push(fin);
  return puntos;
}

function FichaToken({
  ficha,
  offset,
  movible,
  seleccionada,
  onClick,
}: {
  ficha: Ficha;
  offset: Punto;
  movible: boolean;
  seleccionada: boolean;
  onClick: () => void;
}) {
  // Recuerda la casilla anterior para animar el recorrido paso a paso.
  const [mov, setMov] = useState(() => ({ rel: ficha.rel, camino: [puntoFicha(ficha.raza, ficha.rel, ficha.n)] }));
  if (mov.rel !== ficha.rel) {
    setMov({ rel: ficha.rel, camino: caminoDe(ficha.raza, mov.rel, ficha.rel, ficha.n) });
  }
  const camino = mov.camino;

  const col = COLOR_TABLERO[ficha.raza];
  // El recorrido (casilla a casilla) y el lado dentro de la casilla se animan por
  // separado: si cambia el lado, la ficha solo se corre un poco, sin repetir su camino.
  const xs = camino.map((p) => p.x);
  const ys = camino.map((p) => p.y);
  const pasos = camino.length;
  const enMeta = ficha.rel !== null && ficha.rel >= REL_META_INI;

  return (
    <motion.g
      initial={false}
      animate={{ x: pasos > 1 ? xs : xs[0], y: pasos > 1 ? ys : ys[0] }}
      transition={{ duration: pasos > 1 ? Math.min(0.13 * pasos, 1.6) : 0.45, ease: pasos > 1 ? "linear" : "easeInOut" }}
      onClick={onClick}
      className={movible ? "ficha-movible cursor-pointer" : undefined}
    >
     <motion.g initial={false} animate={{ x: offset.x, y: offset.y }} transition={{ duration: 0.3, ease: "easeOut" }}>
      {/* Zona de toque más grande que la ficha */}
      <circle r={movible ? 24 : 20} fill="transparent" />
      {(movible || seleccionada) && (
        <motion.circle
          r={22}
          fill={seleccionada ? "#fff3c4" : col.claro}
          filter="url(#brillo)"
          animate={{ opacity: seleccionada ? [0.7, 1, 0.7] : [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      )}
      <motion.g animate={{ scale: seleccionada ? 1.18 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
        {/* Escudo de Luz (dorado) y Simbiosis de Enredaderas (verde) usan la misma aura,
            detrás del ícono; si la ficha tiene las dos, la verde va un poco más afuera. */}
        {ficha.proteccion && <AuraProteccion color="#8fbf6a" r={ficha.escudo ? 28.5 : 24} />}
        {ficha.escudo && <AuraProteccion color="#f4d58d" r={24} />}
        <ellipse cx={0} cy={15} rx={14} ry={4.5} fill="#000" opacity={0.4} />
        <image
          href={ICONO_FICHA[ficha.raza].src}
          x={-(ICONO_FICHA[ficha.raza].centro.x / ICONO_TAM) * FICHA_W}
          y={-(ICONO_FICHA[ficha.raza].centro.y / ICONO_TAM) * FICHA_W}
          width={FICHA_W}
          height={FICHA_W}
          filter="url(#sombra)"
          style={{ pointerEvents: "none" }}
        />
        {ficha.bloqueo > 0 && (
          <g>
            <circle cx={12} cy={-13} r={8} fill="#6b5a48" stroke="#1b1c24" strokeWidth={1.5} />
            <text x={12} y={-13} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#fff">
              {ficha.bloqueo}
            </text>
          </g>
        )}
        {enMeta && <circle r={19} fill="none" stroke="#ffe9a8" strokeWidth={1.5} opacity={0.8} />}
      </motion.g>
     </motion.g>
    </motion.g>
  );
}
