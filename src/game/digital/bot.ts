/* Jugador controlado por la máquina: elige la acción con mejor puntaje. */
import { RAZAS, type RazaId } from "../types";
import { idxSalida, loopIndex, REL_ENTRADA, REL_META_INI } from "./board";
import {
  jugadorActual,
  casillaSegura,
  movimientosLegales,
  FORTALEZAS,
  puedeSacar,
  fortalezaEn,
  salidaBloqueada,
  VALOR_SALIDA,
  type Movimiento,
  type OpcionDado,
  type Partida,
} from "./engine";

export type AccionIA = { tipo: "tirar" } | { tipo: "sacar" } | { tipo: "mover"; fichaId: string; opcion: OpcionDado };

/** Cuántas fichas rivales podrían alcanzar la casilla idx (1..12 casillas detrás). */
function amenazas(p: Partida, raza: string, idx: number): number {
  let n = 0;
  for (const f of p.fichas) {
    if (f.raza === raza || f.rel === null || f.rel > REL_ENTRADA) continue;
    const i = loopIndex(f.raza, f.rel);
    const detras = (idx - i + 76) % 76;
    if (detras >= 1 && detras <= 12) n++;
  }
  return n;
}

/** ¿Mover la ficha a idx forma una fortaleza (otra ficha propia ya está ahí)? */
function formaFortaleza(p: Partida, raza: RazaId, idx: number, fichaId: string): boolean {
  if (!FORTALEZAS.activo) return false;
  // En la Salida de otra raza no se forma fortaleza.
  if ((Object.keys(RAZAS) as RazaId[]).some((r) => r !== raza && idxSalida(r) === idx)) return false;
  return p.fichas.some((o) => o.id !== fichaId && o.raza === raza && o.rel !== null && o.rel <= REL_ENTRADA && loopIndex(raza, o.rel) === idx);
}

function puntuar(p: Partida, m: Movimiento): number {
  const raza = jugadorActual(p).raza;
  const f = p.fichas.find((x) => x.id === m.fichaId)!;
  let s = m.valor * 0.6 + m.capturas * 60;
  if (m.destino >= REL_META_INI) {
    s += 40 + (m.destino - REL_META_INI) * 3;
  } else {
    const idx = loopIndex(raza, m.destino);
    if (casillaSegura(p, idx)) s += 12;
    else if (formaFortaleza(p, raza, idx, m.fichaId)) {
      // Una fortaleza no se puede comer y frena a los rivales que vienen detrás.
      s += 12 + amenazas(p, raza, idx) * 4;
    } else s -= amenazas(p, raza, idx) * 7;
  }
  if (f.rel !== null && f.rel <= REL_ENTRADA) {
    const origen = loopIndex(raza, f.rel);
    if (fortalezaEn(p, origen)) s -= amenazas(p, raza, origen) * 6; // abandonarla deja sola a la otra ficha
    else if (!casillaSegura(p, origen)) s += amenazas(p, raza, origen) * 6;
    // acercarse al final pesa un poco más
    s += f.rel * 0.05;
    // Con la Salida llena y un 5 guardado: primero despejar la Salida con el otro dado.
    if (salidaBloqueada(p) && origen === idxSalida(raza) && m.opcion !== "suma" && m.opcion !== "bono") {
      const orig = p.dadosOriginales!;
      if (orig[m.opcion] !== VALOR_SALIDA) s += 35;
    }
  }
  // No gastar el 5 moviendo si todavía hay fichas en la base.
  if (typeof m.opcion === "number" && p.dadosOriginales?.[m.opcion] === VALOR_SALIDA && p.fichas.some((x) => x.raza === raza && x.rel === null)) {
    s -= 15;
  }
  return s + Math.random() * 2;
}

export function elegirAccion(p: Partida): AccionIA | null {
  if (p.fase === "tirar") return { tipo: "tirar" };
  if (p.fase !== "mover" && p.fase !== "bono") return null;
  const movs = movimientosLegales(p);
  let mejor: AccionIA | null = null;
  let mejorPuntaje = -Infinity;
  if (puedeSacar(p)) {
    mejor = { tipo: "sacar" };
    mejorPuntaje = 45;
  }
  for (const m of movs) {
    const s = puntuar(p, m);
    if (s > mejorPuntaje) {
      mejorPuntaje = s;
      mejor = { tipo: "mover", fichaId: m.fichaId, opcion: m.opcion };
    }
  }
  return mejor;
}
