import { AnimatePresence, motion } from "framer-motion";
import { createContext, memo, useContext, useState, type CSSProperties } from "react";
import { RAZAS, type RazaId } from "../../game/types";
import { COLOR_DEBILITADO } from "./IconoDebilitado";
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
import { BONO_CAPTURA, type Derrumbe, type Fortaleza, type Ficha, type Movimiento } from "../../game/digital/engine";

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
  fortalezas: Fortaleza[];
  onFicha: (id: string) => void;
  onDestino: (m: Movimiento) => void;
  onBase: () => void;
  /** Giro de la vista en grados (múltiplo de 90): en línea, la raza de cada jugador queda abajo a la derecha. */
  giro?: number;
  /** Turnos que le quedan ralentizado a cada raza (se marca sobre sus fichas). */
  ralentizados?: Partial<Record<RazaId, number>>;
  /** Luna Sangrienta: los Refugios (no las Salidas) se ven y funcionan como casillas normales. */
  sinRefugios?: boolean;
}

/** Giro de la vista: los textos, emblemas y fichas lo deshacen para verse siempre derechos. */
const GiroVista = createContext(0);

/** Mismo sistema de coordenadas para todas las capas del tablero. */
const VISTA = `-10 -10 ${TAM + 20} ${TAM + 20}`;

/**
 * Cada capa en su propia superficie de la GPU: lo que se anima arriba (fichas,
 * brillos, casillas de destino) ya no obliga al móvil a repintar las casillas.
 */
const CAPA: CSSProperties = { transform: "translateZ(0)" };

/** Brillo de las fichas que se pueden mover: un degradado ya dibujado (desenfocar en cada fotograma es caro en el móvil). */
const ID_BRILLO_SEL = "brillo-sel";
const idBrillo = (raza: RazaId) => `brillo-${raza}`;

export function Board(props: BoardProps) {
  const { fichas, razasEnJuego, turno, movibles, seleccion, destinos, baseActiva, derrumbes, fortalezas, onFicha, onDestino, onBase, giro = 0, ralentizados = {}, sinRefugios = false } = props;
  const lugares = useLugares(fichas);
  const fichaSel = fichas.find((f) => f.id === seleccion);

  return (
    <GiroVista.Provider value={giro}>
      <div className="relative h-full w-full select-none" role="img" aria-label="Tablero de Immernacht">
        {/* Capa fija: se pinta una vez (solo cambia si cambian las razas en juego o el giro) */}
        <TableroFijo activas={razasEnJuego.join(",")} giro={giro} sinRefugios={sinRefugios} />

        {/* Anillo del portal: gira por CSS en su propia capa, sin repintar el tablero */}
        <PortalGiratorio />

        {/* Capa viva: fichas, derrumbes, fortalezas y casillas marcadas */}
        <svg viewBox={VISTA} className="absolute inset-0 h-full w-full" style={CAPA}>
          <defs>
            {RAZA_DE_CUARTO.map((r) => (
              <DegradadoBrillo key={r} id={idBrillo(r)} color={COLOR_TABLERO[r].claro} />
            ))}
            <DegradadoBrillo id={ID_BRILLO_SEL} color="#fff3c4" />
          </defs>
          <g transform={`rotate(${giro} ${TAM / 2} ${TAM / 2})`}>
            {/* Derrumbes de Rocas: casillas afectadas */}
            <AnimatePresence>
              {derrumbes.flatMap((d) =>
                d.celdas.map((idx) =>
                  d.tipo === "cadenas" ? <Cadenas key={`${d.id}-${idx}`} idx={idx} /> : <Rocas key={`${d.id}-${idx}`} idx={idx} />
                )
              )}
            </AnimatePresence>

            {/* Fortalezas: dos fichas de la misma raza que cortan el paso */}
            <AnimatePresence>
              {fortalezas.map((b) => (
                <MarcaFortaleza key={`${b.fichas.join()}-${b.idx}`} idx={b.idx} raza={b.raza} turnos={b.turnos} />
              ))}
            </AnimatePresence>

            {/* Fichas */}
            {fichas.map((f) => (
              <FichaToken
                key={f.id}
                ficha={f}
                offset={lugares.get(f.id) ?? { x: 0, y: 0 }}
                movible={movibles.has(f.id)}
                seleccionada={seleccion === f.id}
                ralentizado={f.rel !== null ? (ralentizados[f.raza] ?? 0) : 0}
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
                      transform={`rotate(${-giro} ${c.x} ${c.y})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {m.valor}
                    </text>
                  </g>
                );
              })}
          </g>
        </svg>
      </div>
    </GiroVista.Provider>
  );
}

function DegradadoBrillo({ id, color }: { id: string; color: string }) {
  return (
    <radialGradient id={id}>
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="55%" stopColor={color} stopOpacity={0.75} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
}

/** Casillas, bases, rótulos y emblemas: nada de esto se anima. */
const TableroFijo = memo(function TableroFijo({ activas, giro, sinRefugios }: { activas: string; giro: number; sinRefugios: boolean }) {
  const especiales = sinRefugios ? [5] : [0, 5, 14];
  const razasEnJuego = activas.split(",");
  return (
    <svg viewBox={VISTA} className="absolute inset-0 h-full w-full" style={CAPA} aria-hidden>
      <defs>
        <radialGradient id="portal-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5b3d8f" />
          <stop offset="60%" stopColor="#2a1d48" />
          <stop offset="100%" stopColor="#17112b" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${giro} ${TAM / 2} ${TAM / 2})`}>
        {/* Marco */}
        <rect x={-8} y={-8} width={TAM + 16} height={TAM + 16} rx={16} fill="#e8c468" />
        <rect x={0} y={0} width={TAM} height={TAM} rx={8} fill={PISTA} />

        {/* Cuatro cuartos: misma geometría rotada */}
        {[0, 1, 2, 3].map((q) => (
          <CuartoEstatico key={q} q={q} activo={razasEnJuego.includes(RAZA_DE_CUARTO[q])} especiales={especiales} />
        ))}

        {/* Etiquetas (fuera del grupo rotado para que se lean bien) */}
        {[0, 1, 2, 3].map((q) =>
          especiales.map((k) => {
            const c = rotar(CELDAS_CUARTO0[k].centro, q);
            // Ángulo en pantalla (con el giro de la vista), siempre legible; luego se descuenta el giro.
            let ang = CELDAS_CUARTO0[k].anguloTexto - 90 * q + giro;
            ang = ((ang % 360) + 360) % 360;
            if (ang > 90 && ang <= 270) ang -= 180;
            ang -= giro;
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
              >
                {k === 5 ? "Salida" : "Refugio"}
              </text>
            );
          })
        )}

        {/* Emblemas en las casillas de la base (siempre derechos) */}
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
                transform={`rotate(${-giro} ${c.x} ${c.y})`}
                opacity={razasEnJuego.includes(raza) ? 0.35 : 0.15}
              />
            );
          });
        })}

        <PortalFondo />
      </g>
    </svg>
  );
});

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

/**
 * Fortaleza: dos muros que encierran las fichas por delante y por detrás,
 * cada raza con su material. Parpadea cuando toca abandonarla.
 */
function MarcaFortaleza({ idx, raza, turnos }: { idx: number; raza: RazaId; turnos: number }) {
  const poly = poligonoLoop(idx);
  const c = centroLoop(idx);
  const col = COLOR_TABLERO[raza];
  // Un muro pegado por dentro a cada uno de los dos lados más largos de la casilla:
  // en las rectangulares quedan delante y detrás de las fichas; en las triangulares, en los bordes de la cuña.
  const centro = { x: poly.reduce((s, p) => s + p.x, 0) / poly.length, y: poly.reduce((s, p) => s + p.y, 0) / poly.length };
  const lados = poly
    .map((p, i) => [p, poly[(i + 1) % poly.length]] as const)
    .sort(([a1, b1], [a2, b2]) => Math.hypot(b2.x - a2.x, b2.y - a2.y) - Math.hypot(b1.x - a1.x, b1.y - a1.y))
    .slice(0, 2)
    .map(([a, b]) => {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      // El "abajo" local (+y) tras rotar; el muro mira hacia afuera de la casilla.
      const afuera = -Math.sin(ang) * (mx - centro.x) + Math.cos(ang) * (my - centro.y) > 0 ? 1 : -1;
      return { mx, my, ang: (ang * 180) / Math.PI, lado: afuera as 1 | -1 };
    });
  const Muro = MUROS[raza];
  return (
    <motion.g
      initial={{ opacity: 0, scale: 1.12 }}
      animate={{ opacity: turnos <= 0 ? [1, 0.4, 1] : 1, scale: 1 }}
      // La salida lleva su propia transición: si heredara la repetición infinita, nunca terminaría.
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={turnos <= 0 ? { duration: 1.1, repeat: Infinity } : { duration: 0.35, ease: "easeOut" }}
      style={{ pointerEvents: "none", transformOrigin: `${c.x}px ${c.y}px` }}
    >
      <defs>
        <clipPath id={`fortaleza-${idx}`}>
          <polygon points={pts(poly)} />
        </clipPath>
      </defs>
      <polygon points={pts(poly)} fill={col.base} fillOpacity={0.3} stroke={col.claro} strokeWidth={2} strokeLinejoin="round" />
      {/* Recortado a la casilla para que no se salga en las casillas triangulares */}
      <g clipPath={`url(#fortaleza-${idx})`}>
        {lados.map((l, i) => (
          <g key={i} transform={`translate(${l.mx} ${l.my}) rotate(${l.ang}) translate(0 ${-l.lado * (MURO_Y + 3.5)})`}>
            <Muro lado={l.lado} />
          </g>
        ))}
      </g>
    </motion.g>
  );
}

/** Largo del muro (a lo ancho de la casilla) y distancia al centro (en el sentido de avance). */
const MURO_X = [-48, 48] as const;
const MURO_Y = 15.5;
const LINEA = "#1d1a22";

/** Enanos: muro de piedra con hileras de bloques. */
function MuroEnanos({ lado }: { lado: 1 | -1 }) {
  // Dos hileras de bloques; la de afuera queda pegada al borde de la casilla.
  const filas = [0, 1];
  const yFila = (fila: number) => (lado > 0 ? 12 + fila * 3.6 : -15.6 - fila * 3.6);
  return (
    <g>
      {filas.flatMap((fila) =>
        Array.from({ length: 9 }, (_, i) => {
          const ancho = 12;
          const x = MURO_X[0] - (fila ? ancho / 2 : 0) + i * ancho;
          return (
            <rect
              key={`${fila}-${i}`}
              x={x}
              y={yFila(fila)}
              width={ancho - 0.8}
              height={3.6}
              rx={0.8}
              fill={(i + fila) % 2 ? "#c9874a" : "#a8682f"}
              stroke={LINEA}
              strokeWidth={0.8}
            />
          );
        })
      )}
    </g>
  );
}

/** Humanos: empalizada de troncos con la punta hacia afuera y una franja azul. */
function MuroHumanos({ lado }: { lado: 1 | -1 }) {
  const base = lado * (MURO_Y - 4.5);
  const punta = lado * (MURO_Y + 3);
  return (
    <g>
      {Array.from({ length: 14 }, (_, i) => {
        const x = MURO_X[0] + 3 + i * 7;
        return (
          <path
            key={i}
            d={`M ${x - 3} ${base} L ${x - 3} ${punta - lado * 2.5} L ${x} ${punta} L ${x + 3} ${punta - lado * 2.5} L ${x + 3} ${base} Z`}
            fill={i % 2 ? "#9a6a3c" : "#b07c48"}
            stroke={LINEA}
            strokeWidth={0.8}
          />
        );
      })}
      <rect x={MURO_X[0]} y={lado * (MURO_Y - 2) - 1.3} width={MURO_X[1] - MURO_X[0]} height={2.6} fill={COLOR_TABLERO.humanos.base} stroke={LINEA} strokeWidth={0.6} />
    </g>
  );
}

/** Elfos: raíces vivas trenzadas con hojas. */
function MuroElfos({ lado }: { lado: 1 | -1 }) {
  const y = lado * (MURO_Y - 0.5);
  const onda = (fase: number) => {
    let d = `M ${MURO_X[0]} ${y}`;
    for (let x = MURO_X[0]; x < MURO_X[1]; x += 12) {
      d += ` Q ${x + 6} ${y + (fase ? 3.2 : -3.2)} ${x + 12} ${y}`;
    }
    return d;
  };
  return (
    <g>
      <path d={onda(0)} fill="none" stroke="#5a3b22" strokeWidth={3.4} strokeLinecap="round" />
      <path d={onda(1)} fill="none" stroke="#7a5230" strokeWidth={2.4} strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => {
        const x = MURO_X[0] + 6 + i * 12;
        const dy = (i % 2 ? 1 : -1) * 3.5;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y + dy}
            rx={3.6}
            ry={1.9}
            transform={`rotate(${i % 2 ? 35 : -35} ${x} ${y + dy})`}
            fill={i % 3 ? COLOR_TABLERO.elfos.claro : "#9fe0a8"}
            stroke={LINEA}
            strokeWidth={0.6}
          />
        );
      })}
    </g>
  );
}

/** No-Muertos: cerca de huesos con un cráneo en el centro. */
function MuroNoMuertos({ lado }: { lado: 1 | -1 }) {
  const y = lado * MURO_Y;
  const hueso = (x: number, key: number) => (
    <g key={key}>
      <line x1={x - 4.5} y1={y} x2={x + 4.5} y2={y} stroke="#efe4cf" strokeWidth={2.2} />
      {[-4.5, 4.5].flatMap((dx) =>
        [-1.4, 1.4].map((dy) => <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r={1.5} fill="#efe4cf" stroke={LINEA} strokeWidth={0.4} />)
      )}
    </g>
  );
  return (
    <g>
      {[-40, -29, -18, 18, 29, 40].map((x, i) => hueso(x, i))}
      {/* Cráneo */}
      <g transform={`translate(0 ${y - lado * 1.5})`}>
        <path d="M -5 1.5 Q -5.5 -5 0 -5.2 Q 5.5 -5 5 1.5 L 3 2 L 3 4 L -3 4 L -3 2 Z" fill="#efe4cf" stroke={LINEA} strokeWidth={0.7} />
        <circle cx={-2} cy={-1} r={1.4} fill={COLOR_TABLERO.nomuertos.oscuro} />
        <circle cx={2} cy={-1} r={1.4} fill={COLOR_TABLERO.nomuertos.oscuro} />
      </g>
    </g>
  );
}

const MUROS: Record<RazaId, (p: { lado: 1 | -1 }) => React.ReactElement> = {
  enanos: MuroEnanos,
  humanos: MuroHumanos,
  elfos: MuroElfos,
  nomuertos: MuroNoMuertos,
};

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
      <Prohibido x={c.x + 14} y={c.y - 14} />
    </motion.g>
  );
}

/** Señal de prohibido el paso (compartida por rocas y cadenas). */
function Prohibido({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={8} fill="#b3261e" stroke="#fff" strokeWidth={1.6} />
      <rect x={-4.5} y={-1.4} width={9} height={2.8} rx={1} fill="#fff" />
    </g>
  );
}

/** Cadenas de luz sobre una casilla afectada por Cadenas Sagradas. */
function Cadenas({ idx }: { idx: number }) {
  const poly = poligonoLoop(idx);
  const c = centroLoop(idx);
  // La cadena cruza la casilla a lo largo de su lado más largo.
  const l1 = Math.hypot(poly[1].x - poly[0].x, poly[1].y - poly[0].y);
  const l2 = Math.hypot(poly[2].x - poly[1].x, poly[2].y - poly[1].y);
  const [a, b] = l1 >= l2 ? [poly[0], poly[1]] : [poly[1], poly[2]];
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const eslabones = [-30, -18, -6, 6, 18, 30];
  return (
    <motion.g
      initial={{ opacity: 0, scale: 1.15 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{ pointerEvents: "none", transformOrigin: `${c.x}px ${c.y}px` }}
    >
      <defs>
        <clipPath id={`cadenas-${idx}`}>
          <polygon points={pts(poly)} />
        </clipPath>
      </defs>
      <polygon points={pts(poly)} fill="#f4d58d" fillOpacity={0.28} stroke="#fff3c4" strokeWidth={2} strokeDasharray="6 4" />
      {/* Recortada a la casilla para que no se salga en las casillas triangulares */}
      <g clipPath={`url(#cadenas-${idx})`}>
        <g transform={`translate(${c.x} ${c.y}) rotate(${ang})`}>
          {[10, -10].map((dy) => (
            <g key={dy} transform={`translate(0 ${dy})`}>
              {eslabones.map((dx, i) => (
                <ellipse
                  key={i}
                  cx={dx}
                  cy={0}
                  rx={i % 2 ? 6.5 : 7}
                  ry={i % 2 ? 2.2 : 4}
                  fill="none"
                  stroke="#e8c468"
                  strokeWidth={2.4}
                />
              ))}
            </g>
          ))}
        </g>
      </g>
      <Prohibido x={c.x + 14} y={c.y - 14} />
    </motion.g>
  );
}

/* ---------------- Partes fijas del tablero ---------------- */

const CuartoEstatico = memo(function CuartoEstatico({ q, activo, especiales }: { q: number; activo: boolean; especiales: number[] }) {
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
        const especial = especiales.includes(k);
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
      {especiales.map((k) => (
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

/** Fondo del portal (fijo): el cuadro morado y el ojo central. */
function PortalFondo() {
  const { x, y, w } = PORTAL;
  const c = CENTRO;
  return (
    <g>
      <rect x={x} y={y} width={w} height={w} fill="url(#portal-g)" />
      <circle cx={c.x} cy={c.y} r={16} fill="#0b0816" stroke="#e8c468" strokeWidth={1.5} />
    </g>
  );
}

/** Radio del anillo giratorio del portal, en unidades del tablero. */
const R_ANILLO = 40;

/**
 * Anillo del portal que gira despacio. Es un elemento HTML aparte con una
 * animación CSS de giro: el móvil la resuelve en la GPU sin repintar nada.
 * Es simétrico, así que no le afecta el giro de la vista.
 */
function PortalGiratorio() {
  const lado = (2 * R_ANILLO) / (TAM + 20);
  const centro = (CENTRO.x + 10) / (TAM + 20);
  return (
    <div
      className="pointer-events-none absolute animate-[spin_40s_linear_infinite]"
      style={{
        width: `${lado * 100}%`,
        height: `${lado * 100}%`,
        left: `${(centro - lado / 2) * 100}%`,
        top: `${(centro - lado / 2) * 100}%`,
        willChange: "transform",
      }}
    >
      <svg viewBox={`${-R_ANILLO} ${-R_ANILLO} ${2 * R_ANILLO} ${2 * R_ANILLO}`} className="h-full w-full" aria-hidden>
        <circle r={38} fill="none" stroke="#b27fe8" strokeWidth={1.2} strokeDasharray="4 5" opacity={0.8} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI) / 3;
          return (
            <line key={i} x1={Math.cos(a) * 18} y1={Math.sin(a) * 18} x2={Math.cos(a) * 36} y2={Math.sin(a) * 36} stroke="#d9b8ff" strokeWidth={1} opacity={0.6} />
          );
        })}
      </svg>
    </div>
  );
}

function BaseActiva({ raza, onClick }: { raza: RazaId; onClick: () => void }) {
  const giro = useContext(GiroVista);
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
        transform={`rotate(${-giro} ${x + BASE_RECT0.w / 2} ${y + BASE_RECT0.h / 2})`}
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
/** Color del aura según el evento que dio la protección. */
const COLOR_AURA = {
  luz: "#f4d58d", // Escudo de Luz
  arena: "#d39a55", // Tormenta de Arena (color arena)
  enredaderas: "#a6d67a", // Simbiosis de Enredaderas
  runa: "#b98cf0", // Runa Guardiana (violeta)
} as const;

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
  // Hacia adelante se recorre hasta el premio por comer (20); los saltos más largos o
  // muy hacia atrás (intercambios lejanos) van directos.
  if (diff > BONO_CAPTURA || diff < -14) return [fin];
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
  ralentizado,
  onClick,
}: {
  ficha: Ficha;
  offset: Punto;
  movible: boolean;
  seleccionada: boolean;
  /** Turnos que le quedan ralentizada a su raza (0 = no lo está). */
  ralentizado: number;
  onClick: () => void;
}) {
  const giro = useContext(GiroVista);
  // Recuerda la casilla anterior para animar el recorrido paso a paso.
  const [mov, setMov] = useState(() => ({ rel: ficha.rel, camino: [puntoFicha(ficha.raza, ficha.rel, ficha.n)] }));
  if (mov.rel !== ficha.rel) {
    setMov({ rel: ficha.rel, camino: caminoDe(ficha.raza, mov.rel, ficha.rel, ficha.n) });
  }
  const camino = mov.camino;

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
      transition={{ duration: pasos > 1 ? Math.min(0.13 * pasos, 2.2) : 0.45, ease: pasos > 1 ? "linear" : "easeInOut" }}
      onClick={onClick}
      className={movible ? "ficha-movible cursor-pointer" : undefined}
    >
     <motion.g initial={false} animate={{ x: offset.x, y: offset.y }} transition={{ duration: 0.3, ease: "easeOut" }}>
      {/* Zona de toque más grande que la ficha */}
      <circle r={movible ? 24 : 20} fill="transparent" />
      {(movible || seleccionada) && (
        <motion.circle
          r={32}
          fill={`url(#${seleccionada ? ID_BRILLO_SEL : idBrillo(ficha.raza)})`}
          animate={{ opacity: seleccionada ? [0.7, 1, 0.7] : [0.35, 0.8, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      )}
      {/* El dibujo de la ficha (y su sombra) siempre derecho, aunque la vista esté girada */}
      <g transform={`rotate(${-giro})`}>
      <motion.g animate={{ scale: seleccionada ? 1.18 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
        {/* Escudo de Luz (dorado) y Simbiosis de Enredaderas (verde) usan la misma aura,
            detrás del ícono; si la ficha tiene las dos, la verde va un poco más afuera. */}
        {ficha.proteccion && <AuraProteccion color={COLOR_AURA[ficha.proteccion]} r={ficha.escudo ? 28.5 : 24} />}
        {ficha.escudo && <AuraProteccion color={COLOR_AURA[ficha.escudo]} r={24} />}
        <ellipse cx={0} cy={15} rx={14} ry={4.5} fill="#000" opacity={0.4} />
        <image
          href={ICONO_FICHA[ficha.raza].src}
          x={-(ICONO_FICHA[ficha.raza].centro.x / ICONO_TAM) * FICHA_W}
          y={-(ICONO_FICHA[ficha.raza].centro.y / ICONO_TAM) * FICHA_W}
          width={FICHA_W}
          height={FICHA_W}
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
        {ralentizado > 0 && <MarcaRalentizado turnos={ralentizado} />}
        {enMeta && <circle r={19} fill="none" stroke="#ffe9a8" strokeWidth={1.5} opacity={0.8} />}
      </motion.g>
      </g>
     </motion.g>
    </motion.g>
  );
}

/** Ficha ralentizada: la flecha hacia el suelo y los turnos que le quedan (arriba a la izquierda). */
function MarcaRalentizado({ turnos }: { turnos: number }) {
  return (
    <g transform="translate(-21 -20)">
      <title>{`ralentizado (${turnos})`}</title>
      <rect x={0} y={0} width={20} height={14} rx={7} fill="#3a2320" stroke={COLOR_DEBILITADO} strokeWidth={1.4} />
      <g transform="translate(2.2 1.6) scale(0.68)" fill="none" stroke={COLOR_DEBILITADO} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3.6 V9.6 M5.2 7 L8 9.8 L10.8 7" strokeWidth={2.2} />
        <path d="M4.8 12.2 H11.2" strokeWidth={2.2} />
      </g>
      <text x={14.6} y={7.4} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="#fff">
        {turnos}
      </text>
    </g>
  );
}
