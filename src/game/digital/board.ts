import type { RazaId } from "../types";

/* ============================================================
   Geometría del tablero digital — replica el tablero físico.

   El tablero mide TAM×TAM unidades (SVG). Cada uno de los 4 brazos
   tiene dos columnas de recorrido de 7 casillas, y en el centro del
   brazo el carril final de su color (4 casillas) con un "Refugio"
   en la punta. En cada esquina interior hay un abanico de 4 cuñas.

   Recorrido compartido (LOOP = 76 casillas), en sentido antihorario.
   Cada "cuarto" q (0 = arriba, 1 = izquierda, 2 = abajo, 3 = derecha)
   aporta 19 casillas, empezando por el Refugio de la punta de su brazo:
     +0        Refugio de la punta (entrada al carril final del color q)
     +1..+7    columna de salida del brazo q, de afuera hacia el centro
               (+5 = "Salida" del color q)
     +8..+11   abanico de la esquina entre el brazo q y el brazo q+1
     +12..+18  columna de llegada del brazo q+1, del centro hacia afuera
               (+14 = "Refugio" junto a la base del color q)
   ============================================================ */

export const TAM = 820;
const C = TAM / 2;
const ARM = 270; // largo de cada brazo (y lado de cada base)
const S = ARM / 7; // alto de una casilla del recorrido
const COL_A = 270; // x de la columna de salida (cuarto 0)
const LANE_X = 365; // x del carril final
const LANE_W = 90;
const COL_W = 95;
const LANE_CELL = (LANE_X - S) / 4;

export const LOOP = 76;
export const POR_CUARTO = 19;
/** Progreso relativo (desde la Salida de cada color) */
export const REL_ENTRADA = 71; // la punta de su propio brazo: última casilla compartida
export const REL_META_INI = 72; // 72..75 = las 4 casillas del carril final
export const REL_MAX = 75;
export const REL_MIN = -4; // casillas detrás de la Salida (solo se llega por eventos)

/** Cuarto del tablero que ocupa cada raza (coincide con el tablero de referencia). */
export const CUARTO: Record<RazaId, number> = { elfos: 0, nomuertos: 1, humanos: 2, enanos: 3 };
export const RAZA_DE_CUARTO: RazaId[] = ["elfos", "nomuertos", "humanos", "enanos"];

/** Colores del tablero (los del arte del tablero físico, no los acentos de la UI). */
export const COLOR_TABLERO: Record<RazaId, { base: string; claro: string; oscuro: string }> = {
  elfos: { base: "#2e9a78", claro: "#4fc39b", oscuro: "#17604a" },
  nomuertos: { base: "#d9566e", claro: "#f07d91", oscuro: "#8a2a3d" },
  humanos: { base: "#3f97d6", claro: "#6cb9ee", oscuro: "#1f5d8c" },
  enanos: { base: "#e99a4c", claro: "#ffbf7a", oscuro: "#9a5a1e" },
};

export type Punto = { x: number; y: number };

/** Rota un punto del cuarto 0 al cuarto q (90° antihorario por cuarto). */
export function rotar(p: Punto, q: number): Punto {
  let { x, y } = p;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
    const nx = y;
    const ny = TAM - x;
    x = nx;
    y = ny;
  }
  return { x, y };
}

export interface CeldaGeo {
  /** polígono en coordenadas del cuarto 0 (se dibuja dentro de un <g rotate>) */
  puntos: Punto[];
  /** centro en coordenadas del cuarto 0 */
  centro: Punto;
  /** ángulo del texto en coordenadas del cuarto 0 */
  anguloTexto: number;
}

function rect(x: number, y: number, w: number, h: number): Punto[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function centroide(pts: Punto[]): Punto {
  const x = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const y = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  return { x, y };
}

/** Las 19 casillas de un cuarto, en coordenadas del cuarto 0. */
function celdasCuarto0(): CeldaGeo[] {
  const celdas: CeldaGeo[] = [];
  // +0 Refugio de la punta
  const r0 = rect(LANE_X, 0, LANE_W, S);
  celdas.push({ puntos: r0, centro: centroide(r0), anguloTexto: 0 });
  // +1..+7 columna de salida, de afuera hacia el centro
  for (let i = 0; i < 7; i++) {
    const r = rect(COL_A, i * S, COL_W, S);
    celdas.push({ puntos: r, centro: centroide(r), anguloTexto: 0 });
  }
  // +8..+11 abanico (vértice en la esquina exterior del cuadrante)
  const A = { x: COL_A, y: ARM };
  const F = LANE_X; // borde interior del cuadrante
  const m = (COL_A + F) / 2 + 2;
  const bordes = [
    { x: F, y: ARM },
    { x: F, y: m },
    { x: F, y: F },
    { x: m, y: F },
    { x: COL_A, y: F },
  ];
  for (let k = 0; k < 4; k++) {
    const pts = [A, bordes[k], bordes[k + 1]];
    const c = centroide(pts);
    // empuja el centro hacia afuera del vértice para que las fichas respiren
    const cx = A.x + (c.x - A.x) * 1.25;
    const cy = A.y + (c.y - A.y) * 1.25;
    celdas.push({ puntos: pts, centro: { x: cx, y: cy }, anguloTexto: 0 });
  }
  // +12..+18 fila de llegada del brazo izquierdo, del centro hacia afuera
  for (let k = 0; k < 7; k++) {
    const col = 6 - k;
    const r = rect(col * S, ARM, S, COL_W);
    celdas.push({ puntos: r, centro: centroide(r), anguloTexto: -90 });
  }
  return celdas;
}

export const CELDAS_CUARTO0 = celdasCuarto0();

/** Las 4 casillas del carril final (cuarto 0), de afuera hacia el portal. */
export const META_CUARTO0: CeldaGeo[] = Array.from({ length: 4 }, (_, j) => {
  const r = rect(LANE_X, S + j * LANE_CELL, LANE_W, LANE_CELL);
  return { puntos: r, centro: centroide(r), anguloTexto: 0 };
});

/** Posiciones de las 4 fichas en la base (cuarto 0 = esquina superior izquierda). */
export const BASE_CUARTO0: Punto[] = [
  { x: 86, y: 86 },
  { x: 184, y: 86 },
  { x: 86, y: 184 },
  { x: 184, y: 184 },
];

export const BASE_RECT0 = { x: 0, y: 0, w: ARM, h: ARM };
/** Puerta de la base: mira hacia la casilla de Salida. */
export const PUERTA0: Punto = { x: ARM - 13, y: 4.5 * S };
export const CENTRO: Punto = { x: C, y: C };
export const PORTAL = { x: LANE_X, y: LANE_X, w: LANE_W };

/* ---------------- Índices del recorrido ---------------- */

export function idxSalida(raza: RazaId): number {
  return CUARTO[raza] * POR_CUARTO + 5;
}

/** Progreso relativo de una raza → índice absoluto del recorrido. */
export function loopIndex(raza: RazaId, rel: number): number {
  return (((idxSalida(raza) + rel) % LOOP) + LOOP) % LOOP;
}

/** Índice absoluto → progreso relativo para esa raza (en el rango -4..71). */
export function relDesdeLoop(raza: RazaId, idx: number): number {
  let rel = (((idx - idxSalida(raza)) % LOOP) + LOOP) % LOOP;
  if (rel > REL_ENTRADA) rel -= LOOP;
  return rel;
}

export type TipoCasilla = "normal" | "salida" | "refugio-base" | "refugio-punta";

export function tipoCasilla(idx: number): { tipo: TipoCasilla; raza: RazaId | null } {
  const q = Math.floor(idx / POR_CUARTO);
  const k = idx % POR_CUARTO;
  const raza = RAZA_DE_CUARTO[q];
  if (k === 0) return { tipo: "refugio-punta", raza };
  if (k === 5) return { tipo: "salida", raza };
  if (k === 14) return { tipo: "refugio-base", raza };
  return { tipo: "normal", raza: null };
}

/** Salidas y Refugios: nadie puede ser atacado al caer ahí (salvo al sacar ficha en una Salida). */
export function esRefugio(idx: number): boolean {
  return tipoCasilla(idx).tipo !== "normal";
}

export function distanciaCircular(a: number, b: number): number {
  const d = Math.abs(a - b) % LOOP;
  return Math.min(d, LOOP - d);
}

/* ---------------- Coordenadas en pantalla ---------------- */

export function centroLoop(idx: number): Punto {
  const q = Math.floor(idx / POR_CUARTO);
  return rotar(CELDAS_CUARTO0[idx % POR_CUARTO].centro, q);
}

export function centroMeta(raza: RazaId, j: number): Punto {
  return rotar(META_CUARTO0[j].centro, CUARTO[raza]);
}

export function centroBase(raza: RazaId, n: number): Punto {
  return rotar(BASE_CUARTO0[n], CUARTO[raza]);
}

/** Centro de la casilla en la que está una ficha (rel null = base). */
export function puntoFicha(raza: RazaId, rel: number | null, n: number): Punto {
  if (rel === null) return centroBase(raza, n);
  if (rel >= REL_META_INI) return centroMeta(raza, rel - REL_META_INI);
  return centroLoop(loopIndex(raza, rel));
}

/** Polígono (en coordenadas absolutas) de una casilla del recorrido. */
export function poligonoLoop(idx: number): Punto[] {
  const q = Math.floor(idx / POR_CUARTO);
  return CELDAS_CUARTO0[idx % POR_CUARTO].puntos.map((p) => rotar(p, q));
}

/** Polígono de la casilla en la que quedaría una ficha (recorrido o carril final). */
export function poligonoCasilla(raza: RazaId, rel: number): Punto[] {
  if (rel >= REL_META_INI) return META_CUARTO0[rel - REL_META_INI].puntos.map((p) => rotar(p, CUARTO[raza]));
  return poligonoLoop(loopIndex(raza, rel));
}

/** Rota un vector (no un punto) del cuarto 0 al cuarto q. */
function rotarVector(v: Punto, q: number): Punto {
  let { x, y } = v;
  for (let i = 0; i < ((q % 4) + 4) % 4; i++) {
    const nx = y;
    const ny = -x;
    x = nx;
    y = ny;
  }
  return { x, y };
}

/**
 * Desplazamiento para colocar dos fichas lado a lado en una casilla,
 * a lo largo de su lado más largo.
 */
export function ejeCasilla(raza: RazaId, rel: number | null): Punto {
  if (rel === null) return { x: 0, y: 0 };
  if (rel >= REL_META_INI) return rotarVector({ x: 16, y: 0 }, CUARTO[raza]);
  const idx = loopIndex(raza, rel);
  const k = idx % POR_CUARTO;
  const q = Math.floor(idx / POR_CUARTO);
  let v: Punto;
  if (k <= 7) v = { x: 17, y: 0 };
  else if (k <= 11) {
    // Cuñas del abanico: a lo largo del radio que sale del vértice.
    const c = CELDAS_CUARTO0[k].centro;
    const dx = c.x - COL_A;
    const dy = c.y - ARM;
    const l = Math.hypot(dx, dy) || 1;
    v = { x: (dx / l) * 15, y: (dy / l) * 15 };
  } else v = { x: 0, y: 17 };
  return rotarVector(v, q);
}

/** Clave de casilla para agrupar fichas que comparten lugar. */
export function claveCasilla(raza: RazaId, rel: number | null, n: number): string {
  if (rel === null) return `base-${raza}-${n}`;
  if (rel >= REL_META_INI) return `meta-${raza}-${rel}`;
  return `loop-${loopIndex(raza, rel)}`;
}
