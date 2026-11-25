/* ============================================================
   Motor de reglas de la versión digital de Immernacht.
   Funciones puras: reciben una Partida y devuelven una nueva.
   Reglas tomadas de "Instrucciones" y "Descripción y reglas",
   con los ajustes acordados con el equipo.
   ============================================================ */
import { EVENTOS, EVENTOS_GLOBALES, MATRIZ_EFECTOS, RAZAS, type EfectoMatriz, type EventoDef, type EventoGlobalDef, type RazaId } from "../types";
import {
  CUARTO,
  distanciaCircular,
  esRefugio,
  idxSalida,
  LOOP,
  loopIndex,
  REL_ENTRADA,
  REL_MAX,
  REL_META_INI,
  REL_MIN,
  relDesdeLoop,
} from "./board";

/** Probabilidad de que ocurra un evento al terminar un turno (igual que en la app del tablero físico). */
export const PROB_EVENTO = 0.35;
/**
 * Eventos globales: probabilidad al final de cada turno (muy raro: puede no salir
 * en toda la partida). Es un objeto para poder probar variantes en las simulaciones.
 */
export const EVENTO_GLOBAL: { prob: number; solo?: string } = { prob: 0.01 };
/** Valor que hay que sacar (en un dado o en la suma) para sacar una ficha de la base. */
export const VALOR_SALIDA = 5;
/** Casillas que avanza el premio por comer una ficha. */
export const BONO_CAPTURA = 20;
/** Casillas de premio la primera vez que una ficha entra a una de las 4 casillas del carril final. */
export const BONO_META = 10;
/** Máximo de fichas en una misma casilla del recorrido. */
export const MAX_POR_CASILLA = 2;
/** Cada vez que un evento sale, su peso se multiplica por este factor durante los 3 eventos siguientes. */
/**
 * Fortalezas: dos fichas de la misma raza en una casilla del recorrido.
 * Nadie puede caer en ellas ni cruzarlas mientras la fortaleza esté activa.
 * Duran `duracion` turnos del dueño: al llegar a 0 está obligado a abandonarla.
 * Es un objeto para poder probar variantes en las simulaciones.
 */
export const FORTALEZAS = {
  activo: true,
  /** Turnos del dueño que dura la fortaleza antes de tener que abandonarla. */
  duracion: 1,
  /** ¿La fortaleza también bloquea a las fichas de su propia raza? */
  bloqueaPropia: true,
};
const FACTOR_REPETICION = 0.35;
const VENTANA_REPETICION = 3;

export type TipoJugador = "humano" | "ia";

export interface Jugador {
  raza: RazaId;
  tipo: TipoJugador;
  /** Turnos que le quedan con la Maldición de Polimorfia (dados a la mitad). */
  maldicion: number;
  /** Última ficha que movió este jugador con los dados (los eventos caen sobre ella). */
  ultimaFicha: string | null;
}

export interface Ficha {
  id: string;
  raza: RazaId;
  n: number;
  /** null = en la base; -4..71 = recorrido; 72..75 = carril final */
  rel: number | null;
  /** Escudo de Luz o Tormenta de Arena: no puede ser comida hasta el próximo turno de su dueño. */
  escudo: false | "luz" | "arena";
  /** Simbiosis de Enredaderas o Runa Guardiana: anula el primer ataque o trampa de la ronda. */
  proteccion: false | "enredaderas" | "runa";
  /** Derrumbe de Rocas: turnos de su dueño que le quedan inmovilizada. */
  bloqueo: number;
}

/**
 * Casillas cubiertas por un Derrumbe de Rocas mientras dure el efecto:
 * nadie puede entrar en ellas y las fichas que estén ahí no pueden moverse
 * (salvo las protegidas cuando cayeron las rocas).
 */
export interface Derrumbe {
  id: number;
  /** Qué tapa las casillas: rocas (Derrumbe de Rocas) o luz (Cadenas Sagradas). Las reglas son las mismas. */
  tipo: "rocas" | "cadenas";
  celdas: number[];
  raza: RazaId;
  turnos: number;
  /** Fichas que resistieron las rocas (con Simbiosis o Runa) y pueden salir. */
  exentas: string[];
  /** Fichas con efecto a favor (+1): quedan atrapadas solo 1 turno en lugar de 2. */
  cortas: string[];
}

/** Premio de movimiento pendiente: 20 casillas por comer, 10 por llegar al carril final. */
export interface Premio {
  valor: number;
  motivo: "captura" | "meta";
}

export interface Fortaleza {
  raza: RazaId;
  idx: number;
  fichas: [string, string];
  /** Turnos del dueño que le quedan; con 0 está obligado a abandonarla en este turno. */
  turnos: number;
  /** Venció sin poder abandonarse (o se rehízo justo después): ya no bloquea. */
  roto: boolean;
}

export type Fase = "tirar" | "mover" | "bono" | "evento" | "fin";

/** Estado que deja el evento; se aplica cuando el jugador pulsa "Continuar". */
interface EfectoPendiente {
  fichas: Ficha[];
  jugadores: Jugador[];
  derrumbes: Derrumbe[];
  bonos: Premio[];
  log: EntradaLog[];
  contador: number;
  global?: EfectoGlobal | null;
}

/** Evento global con duración (Niebla Espesa, Luna Sangrienta): turnos que le quedan. */
export interface EfectoGlobal {
  id: string;
  turnos: number;
}

/** Trozo del texto de un evento; con `e` se pinta en verde (a favor) o rojo (en contra). */
export interface Segmento {
  t: string;
  e?: "positivo" | "negativo";
}

export interface ResultadoEvento {
  evento: EventoDef | EventoGlobalDef;
  raza: RazaId; // jugador que terminó el turno
  /** Efecto del evento con los números ya ajustados por la matriz (lo que se muestra en la tarjeta). */
  texto: Segmento[];
  /** Qué pasó, en una frase corta. */
  resumen: string;
  /** Detalle exacto (se muestra en "Más información"). */
  lineas: string[];
  pendiente: EfectoPendiente;
}

export interface EntradaLog {
  id: number;
  texto: string;
  raza?: RazaId;
}

export interface Partida {
  jugadores: Jugador[];
  fichas: Ficha[];
  turno: number;
  fase: Fase;
  /** Valores efectivos de los dados (ya divididos si hay maldición). */
  dados: [number, number] | null;
  /** Lo que realmente salió en los dados (para mostrar, para los pares y para el 5 de salida). */
  dadosOriginales: [number, number] | null;
  usados: [boolean, boolean];
  esPar: boolean;
  /** Pares seguidos en este turno: al tercero, magia negra (ver PARES_MAGIA_NEGRA). */
  paresSeguidos?: number;
  fichaLiberada: string | null;
  /** Lanzamientos que quedan en este turno (3 si no tiene fichas en el recorrido). */
  intentos: number;
  /** Premios de movimiento pendientes (se usan en orden). */
  bonos: Premio[];
  /** Qué hacer al terminar los bonos: seguir con los dados o pasar el turno (bono ganado en un evento). */
  trasBono: "continuar" | "avanzar";
  eventoActual: ResultadoEvento | null;
  derrumbes: Derrumbe[];
  /** Fortalezas formadas (solo con FORTALEZAS.activo). */
  fortalezas?: Fortaleza[];
  /** Fichas de una fortaleza que se tuvo que abandonar este turno (no pueden rehacerlo en el mismo turno). */
  forzadas?: string[];
  /** Historial para que un mismo evento no se repita tan seguido. */
  pesosEvento: Record<string, { nivel: number; restantes: number }>;
  ganador: RazaId | null;
  /** Evento global en curso (solo los que duran una ronda). */
  global?: EfectoGlobal | null;
  log: EntradaLog[];
  /** Última tirada (se sigue mostrando aunque el turno haya pasado). */
  ultimaTirada: { raza: RazaId; orig: [number, number]; efectivos: [number, number]; n: number } | null;
  /** Aviso breve para mostrar en pantalla (cambia el id cada vez). */
  aviso: { id: number; texto: string } | null;
  /** Todos los avisos de la última acción, en orden (una jugada puede dar varios). */
  avisos?: { id: number; texto: string }[];
  contador: number;
}

export type OpcionDado = 0 | 1 | "suma" | "bono";

export interface Movimiento {
  fichaId: string;
  opcion: OpcionDado;
  valor: number;
  destino: number;
  capturas: number;
}

/* ---------------- Utilidades ---------------- */

const nombre = (r: RazaId) => RAZAS[r].nombre;
const RAZAS_IDS = Object.keys(RAZAS) as RazaId[];

function clonar(p: Partida): Partida {
  return {
    ...p,
    jugadores: p.jugadores.map((j) => ({ ...j })),
    fichas: p.fichas.map((f) => ({ ...f })),
    usados: [...p.usados] as [boolean, boolean],
    derrumbes: p.derrumbes.map((d) => ({ ...d })),
    fortalezas: (p.fortalezas ?? []).map((b) => ({ ...b })),
    forzadas: [...(p.forzadas ?? [])],
    bonos: p.bonos.map((b) => ({ ...b })),
    log: [...p.log],
    avisos: [],
  };
}

function registrar(p: Partida, texto: string, raza?: RazaId) {
  p.contador += 1;
  p.log = [...p.log, { id: p.contador, texto, raza }].slice(-80);
}

function avisar(p: Partida, texto: string) {
  p.contador += 1;
  p.aviso = { id: p.contador, texto };
  p.avisos = [...(p.avisos ?? []), p.aviso];
}

export function jugadorActual(p: Partida): Jugador {
  return p.jugadores[p.turno];
}

export function fichasDe(p: Partida, raza: RazaId): Ficha[] {
  return p.fichas.filter((f) => f.raza === raza);
}

const enRecorrido = (f: Ficha) => f.rel !== null && f.rel <= REL_ENTRADA;

/** ¿Puede la ficha moverse a esa casilla del recorrido por un intercambio? Solo si
 *  llega avanzando o retrocediendo lo justo, sin pasarse de la entrada a su carril
 *  (ni saltar hacia atrás por encima de su salida hasta quedar junto a la entrada). */
function cambioValido(f: Ficha, idxNuevo: number): boolean {
  const idxActual = loopIndex(f.raza, f.rel!);
  const delta = ((((idxNuevo - idxActual) % LOOP) + LOOP + LOOP / 2) % LOOP) - LOOP / 2;
  return relDesdeLoop(f.raza, idxNuevo) === f.rel! + delta;
}
const enMeta = (f: Ficha) => f.rel !== null && f.rel >= REL_META_INI;

function tieneEnRecorrido(p: Partida, raza: RazaId) {
  return fichasDe(p, raza).some(enRecorrido);
}

/** Fichas en una casilla del recorrido compartido. */
function ocupantes(p: Partida, idx: number): Ficha[] {
  return p.fichas.filter((f) => enRecorrido(f) && loopIndex(f.raza, f.rel!) === idx);
}

const resisteSinGastar = (p: Partida, f: Ficha) => !lunaSangrienta(p) && (f.escudo || f.proteccion);

/** Derrumbe activo que cubre la casilla idx, si lo hay. */
function derrumbeEn(p: Partida, idx: number): Derrumbe | undefined {
  return p.derrumbes.find((d) => d.celdas.includes(idx));
}

/** ¿La ficha está atrapada bajo un derrumbe o unas cadenas? */
function atrapada(p: Partida, f: Ficha): Derrumbe | undefined {
  if (!enRecorrido(f)) return undefined;
  const idx = loopIndex(f.raza, f.rel!);
  // Puede haber rocas y cadenas en la misma casilla: basta con que una la retenga.
  return p.derrumbes.find((d) => {
    if (!d.celdas.includes(idx) || d.exentas.includes(f.id)) return false;
    // Con el efecto a favor solo queda atrapada el primer turno.
    return !(d.cortas.includes(f.id) && d.turnos < 2);
  });
}

/** Turnos que le quedan atrapada a una ficha (0 si está libre). */
function turnosAtrapada(p: Partida, f: Ficha): number {
  const d = atrapada(p, f);
  if (!d) return 0;
  return d.cortas.includes(f.id) ? d.turnos - 1 : d.turnos;
}

/** Recalcula el contador de bloqueo de cada ficha (para mostrarlo sobre la ficha). */
function actualizarBloqueos(p: Partida) {
  for (const f of p.fichas) f.bloqueo = turnosAtrapada(p, f);
}

/* ---------------- Fortalezas ---------------- */

/** Recalcula las fortalezas según dónde están las fichas (conserva el contador de los que ya existían). */
function sincronizarFortalezas(p: Partida) {
  if (!FORTALEZAS.activo) {
    p.fortalezas = [];
    return;
  }
  const antes = p.fortalezas ?? [];
  const grupos = new Map<string, Ficha[]>();
  for (const f of p.fichas) {
    if (!enRecorrido(f)) continue;
    const idx = loopIndex(f.raza, f.rel!);
    // No se puede formar fortaleza en la Salida de otra raza.
    if (RAZAS_IDS.some((r) => r !== f.raza && idxSalida(r) === idx)) continue;
    const k = `${f.raza}@${idx}`;
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  const forzadas = p.forzadas ?? [];
  const nuevos: Fortaleza[] = [];
  for (const fs of grupos.values()) {
    if (fs.length < 2) continue;
    const ids = [fs[0].id, fs[1].id].sort() as [string, string];
    const idx = loopIndex(fs[0].raza, fs[0].rel!);
    const previo = antes.find((b) => b.idx === idx && b.fichas[0] === ids[0] && b.fichas[1] === ids[1]);
    nuevos.push(
      previo ?? {
        raza: fs[0].raza,
        idx,
        fichas: ids,
        turnos: FORTALEZAS.duracion,
        roto: forzadas.includes(ids[0]) && forzadas.includes(ids[1]),
      }
    );
  }
  p.fortalezas = nuevos;
}

/** ¿La fortaleza bloquea el paso? Sobre un derrumbe no tiene efecto. */
function fortalezaActiva(p: Partida, b: Fortaleza): boolean {
  return !b.roto && !derrumbeEn(p, b.idx) && !lunaSangrienta(p);
}

/** Fortalezas que están bloqueando ahora mismo. */
export function fortalezasActivas(p: Partida): Fortaleza[] {
  return (p.fortalezas ?? []).filter((b) => fortalezaActiva(p, b));
}

/** Fortaleza activa en la casilla idx, si lo hay. */
export function fortalezaEn(p: Partida, idx: number): Fortaleza | undefined {
  return (p.fortalezas ?? []).find((b) => b.idx === idx && fortalezaActiva(p, b));
}

/** ¿Alguna fortaleza impide a la ficha `f` cruzar o caer en las casillas hasta `destino`? */
function cortaElPaso(p: Partida, f: Ficha, destino: number): boolean {
  if (!FORTALEZAS.activo || f.rel === null) return false;
  const hasta = Math.min(destino, REL_ENTRADA);
  for (let r = f.rel + 1; r <= hasta; r++) {
    const b = fortalezaEn(p, loopIndex(f.raza, r));
    if (b && !b.fichas.includes(f.id) && (b.raza !== f.raza || FORTALEZAS.bloqueaPropia)) return true;
  }
  return false;
}

/** Fortalezas del jugador que tiene que abandonar en este turno. */
function fortalezasVencidas(p: Partida, raza: RazaId): Fortaleza[] {
  return (p.fortalezas ?? []).filter((b) => b.raza === raza && !b.roto && b.turnos <= 0);
}

const tirarDado = () => 1 + Math.floor(Math.random() * 6);

/** Orden de turnos: sentido horario sobre el tablero (arriba-izq → arriba-der → abajo-der → abajo-izq). */
const ordenHorario = (r: RazaId) => (4 - CUARTO[r]) % 4;

/* ---------------- Creación ---------------- */

export function crearPartida(jugadores: { raza: RazaId; tipo: TipoJugador }[]): Partida {
  const ordenados = [...jugadores].sort((a, b) => ordenHorario(a.raza) - ordenHorario(b.raza));
  const inicio = Math.floor(Math.random() * ordenados.length);
  const p: Partida = {
    jugadores: ordenados.map((j) => ({ ...j, maldicion: 0, ultimaFicha: null })),
    fichas: ordenados.flatMap((j) =>
      [0, 1, 2, 3].map((n) => ({
        id: `${j.raza}-${n}`,
        raza: j.raza,
        n,
        rel: null,
        escudo: false,
        proteccion: false,
        bloqueo: 0,
      }))
    ),
    turno: inicio,
    fase: "tirar",
    dados: null,
    dadosOriginales: null,
    usados: [false, false],
    esPar: false,
    fichaLiberada: null,
    intentos: 3,
    bonos: [],
    trasBono: "continuar",
    eventoActual: null,
    derrumbes: [],
    pesosEvento: {},
    ganador: null,
    ultimaTirada: null,
    log: [],
    aviso: null,
    contador: 0,
  };
  registrar(p, `El Portal se abre. Comienzan los ${nombre(ordenados[inicio].raza)}.`);
  return p;
}

/* ---------------- Capturas ---------------- */

/** ¿La ficha resiste un ataque? Consume la protección de Simbiosis si la usa. */
/** Niebla Espesa: nadie puede capturar. */
const niebla = (p: Partida) => p.global?.id === "niebla-espesa";
/** Luna Sangrienta: escudos, protecciones y fortalezas no surten efecto. */
const lunaSangrienta = (p: Partida) => p.global?.id === "luna-sangrienta";
/** ¿Está prohibido capturar en esta casilla? En Salidas y Refugios, y en todas con Niebla Espesa. */
const sinCapturas = (p: Partida, idx: number) => esRefugio(idx) || niebla(p);

function resisteAtaque(p: Partida, f: Ficha): boolean {
  if (lunaSangrienta(p)) return false;
  if (f.escudo) return true;
  if (f.proteccion) {
    f.proteccion = false;
    return true;
  }
  return false;
}

function devolverABase(f: Ficha) {
  f.rel = null;
  f.bloqueo = 0;
  f.escudo = false;
  f.proteccion = false;
}

/** Ataca a las fichas rivales que haya en la casilla `idx` (nunca en Salidas ni Refugios). */
function atacar(p: Partida, atacante: RazaId, idx: number): number {
  if (sinCapturas(p, idx)) return 0;
  let n = 0;
  for (const f of ocupantes(p, idx)) {
    if (f.raza === atacante) continue;
    if (resisteAtaque(p, f)) {
      registrar(p, `Una ficha de los ${nombre(f.raza)} resiste el ataque protegida por la magia.`, f.raza);
      continue;
    }
    devolverABase(f);
    n++;
  }
  if (n > 0) {
    registrar(p, `¡Los ${nombre(atacante)} atacan! ${n === 1 ? "Una ficha vuelve" : `${n} fichas vuelven`} a su base.`, atacante);
  }
  return n;
}

function capturasPosibles(p: Partida, atacante: RazaId, idx: number): number {
  if (sinCapturas(p, idx)) return 0;
  return ocupantes(p, idx).filter((f) => f.raza !== atacante && !resisteSinGastar(p, f)).length;
}

/** La ficha rival que se comería al sacar una ficha a la Salida (solo una). */
function victimaEnSalida(p: Partida, raza: RazaId): Ficha | null {
  if (niebla(p)) return null;
  return ocupantes(p, idxSalida(raza)).find((f) => f.raza !== raza && !resisteSinGastar(p, f)) ?? null;
}

/* ---------------- Movimientos legales ---------------- */

/** ¿Cabe una ficha de `raza` en la casilla `idx` del recorrido (contando las que se comería)? */
function cabeEnCasilla(p: Partida, raza: RazaId, idx: number, excluir: string): boolean {
  const resto = ocupantes(p, idx).filter((f) => f.id !== excluir);
  const quedan = sinCapturas(p, idx) ? resto : resto.filter((f) => f.raza === raza || resisteSinGastar(p, f));
  return quedan.length < MAX_POR_CASILLA;
}

function destinoValido(p: Partida, f: Ficha, destino: number): boolean {
  if (destino > REL_MAX) return false;
  // Nadie puede caer en una fortaleza ni cruzarla.
  if (cortaElPaso(p, f, destino)) return false;
  if (destino >= REL_META_INI) {
    // Dos fichas no pueden ocupar la misma casilla del carril final.
    return !p.fichas.some((o) => o.id !== f.id && o.raza === f.raza && o.rel === destino);
  }
  const idx = loopIndex(f.raza, destino);
  // Nadie puede entrar en una casilla tapada por un derrumbe.
  if (derrumbeEn(p, idx)) return false;
  return cabeEnCasilla(p, f.raza, idx, f.id);
}

/** Qué dado(s) se gastan para sacar una ficha: un dado con 5, o la suma si da 5. */
function opcionSalida(p: Partida): 0 | 1 | "suma" | null {
  if (!p.dadosOriginales) return null;
  const [a, b] = p.dadosOriginales;
  if (!p.usados[0] && a === VALOR_SALIDA) return 0;
  if (!p.usados[1] && b === VALOR_SALIDA) return 1;
  if (!p.usados[0] && !p.usados[1] && a + b === VALOR_SALIDA) return "suma";
  return null;
}

/** ¿Hay sitio en la Salida? Al salir se come como máximo una ficha rival. */
function salidaLibre(p: Partida, raza: RazaId): boolean {
  const occ = ocupantes(p, idxSalida(raza));
  const quedan = occ.length - (victimaEnSalida(p, raza) ? 1 : 0);
  return quedan < MAX_POR_CASILLA;
}

export function puedeSacar(p: Partida): boolean {
  if (p.fase !== "mover") return false;
  const raza = jugadorActual(p).raza;
  // Con una fortaleza vencida hay que abandonarla antes de sacar fichas.
  if (debeRomper(p)) return false;
  if (!fichasDe(p, raza).some((f) => f.rel === null)) return false;
  return opcionSalida(p) !== null && salidaLibre(p, raza);
}

/** Motivo por el que no se puede sacar teniendo un 5 (para avisar al jugador). */
export function salidaBloqueada(p: Partida): boolean {
  if (p.fase !== "mover") return false;
  const raza = jugadorActual(p).raza;
  return fichasDe(p, raza).some((f) => f.rel === null) && opcionSalida(p) !== null && !salidaLibre(p, raza);
}

/** Premio que se está usando ahora (el primero de la cola). */
export function premioActual(p: Partida): Premio | null {
  return p.fase === "bono" ? (p.bonos[0] ?? null) : null;
}

function movimientosBono(p: Partida): Movimiento[] {
  const raza = jugadorActual(p).raza;
  const premio = p.bonos[0];
  const res: Movimiento[] = [];
  if (!premio) return res;
  for (const f of fichasDe(p, raza)) {
    if (f.rel === null || atrapada(p, f)) continue;
    const destino = f.rel + premio.valor;
    if (!destinoValido(p, f, destino)) continue;
    const capturas = destino <= REL_ENTRADA ? capturasPosibles(p, raza, loopIndex(raza, destino)) : 0;
    res.push({ fichaId: f.id, opcion: "bono", valor: premio.valor, destino, capturas });
  }
  return res;
}

/** Movimientos que abandonan una fortaleza vencida del jugador. */
function movimientosQueRompen(p: Partida, movs: Movimiento[]): Movimiento[] {
  const vencidos = fortalezasVencidas(p, jugadorActual(p).raza);
  if (!vencidos.length) return [];
  return movs.filter((m) => vencidos.some((b) => b.fichas.includes(m.fichaId)));
}

/** ¿Está obligado a mover una ficha de una fortaleza vencida (y puede hacerlo)? */
export function debeRomper(p: Partida): boolean {
  return movimientosQueRompen(p, movimientosSinObligacion(p)).length > 0;
}

/** Si tiene que abandonar una fortaleza y puede, solo valen los movimientos que la abandonan. */
export function movimientosLegales(p: Partida): Movimiento[] {
  const movs = movimientosSinObligacion(p);
  const rompen = movimientosQueRompen(p, movs);
  return rompen.length ? rompen : movs;
}

function movimientosSinObligacion(p: Partida): Movimiento[] {
  if (p.fase === "bono") return movimientosBono(p);
  if (p.fase !== "mover" || !p.dados) return [];
  const raza = jugadorActual(p).raza;
  const [d0, d1] = p.dados;
  const libres: { opcion: OpcionDado; valor: number }[] = [];
  if (!p.usados[0] && d0 > 0) libres.push({ opcion: 0, valor: d0 });
  if (!p.usados[1] && d1 > 0 && !(d1 === d0 && !p.usados[0])) libres.push({ opcion: 1, valor: d1 });
  if (!p.usados[0] && !p.usados[1] && d0 > 0 && d1 > 0) libres.push({ opcion: "suma", valor: d0 + d1 });

  const calcular = (excluirLiberada: boolean) => {
    const res: Movimiento[] = [];
    for (const f of fichasDe(p, raza)) {
      if (f.rel === null || atrapada(p, f)) continue;
      if (excluirLiberada && f.id === p.fichaLiberada) continue;
      for (const { opcion, valor } of libres) {
        const destino = f.rel + valor;
        if (!destinoValido(p, f, destino)) continue;
        const capturas = destino <= REL_ENTRADA ? capturasPosibles(p, raza, loopIndex(raza, destino)) : 0;
        res.push({ fichaId: f.id, opcion, valor, destino, capturas });
      }
    }
    return res;
  };

  // "Sacar la ficha y avanzar con otra ficha diferente… Solo se puede avanzar con
  //  la misma ficha si no cuenta con más fichas en juego."
  if (p.fichaLiberada) {
    const sinLiberada = calcular(true);
    if (sinLiberada.length > 0) return sinLiberada;
  }
  return calcular(false);
}

function hayAcciones(p: Partida) {
  return puedeSacar(p) || movimientosLegales(p).length > 0;
}

/**
 * Lanzamientos del turno:
 * - con fichas en el recorrido → 1
 * - sin fichas en el recorrido (todas en la base o en el carril final) → 3 intentos para sacar un 5
 */
function intentosIniciales(p: Partida, raza: RazaId): number {
  return tieneEnRecorrido(p, raza) ? 1 : 3;
}

/* ---------------- Acciones ---------------- */

export function tirar(prev: Partida): Partida {
  if (prev.fase !== "tirar") return prev;
  const p = clonar(prev);
  const j = jugadorActual(p);
  const orig: [number, number] = [tirarDado(), tirarDado()];
  const efectivos: [number, number] =
    // Dados a la mitad redondeando hacia arriba (un 1 sigue valiendo 1).
    j.maldicion > 0 ? [Math.ceil(orig[0] / 2), Math.ceil(orig[1] / 2)] : [orig[0], orig[1]];
  p.dadosOriginales = orig;
  p.dados = efectivos;
  p.usados = [false, false];
  // En los tiros de salida (sin fichas en el recorrido) los pares no dan otro lanzamiento.
  p.esPar = orig[0] === orig[1] && tieneEnRecorrido(p, j.raza);
  p.fichaLiberada = null;
  p.fase = "mover";
  p.intentos -= 1;
  p.ultimaTirada = { raza: j.raza, orig, efectivos, n: (p.ultimaTirada?.n ?? 0) + 1 };

  const maldito = j.maldicion > 0 ? ` (ralentizados: ${efectivos[0]} y ${efectivos[1]})` : "";
  registrar(p, `${nombre(j.raza)} lanzan ${orig[0]} y ${orig[1]}${p.esPar ? " — ¡pares!" : ""}${maldito}`, j.raza);

  p.paresSeguidos = p.esPar ? (p.paresSeguidos ?? 0) + 1 : 0;
  if (p.paresSeguidos >= PARES_MAGIA_NEGRA) return magiaNegra(p);

  if (hayAcciones(p)) {
    if (debeRomper(p)) avisar(p, "Tu fortaleza cae: mueve una de sus fichas.");
    return p;
  }

  if (p.esPar) {
    avisar(p, "No hay movimientos posibles.");
    return finTirada(p);
  }
  // Tiros de salida: sin aviso, el texto junto a los dados ya cuenta los intentos.
  if (!tieneEnRecorrido(p, j.raza)) {
    if (p.intentos > 0) {
      p.fase = "tirar";
      return p;
    }
    return terminarTurno(p);
  }
  avisar(p, "No hay movimientos posibles.");
  return terminarTurno(p);
}

/** Pares seguidos en un mismo turno que delatan el uso de magia negra. */
export const PARES_MAGIA_NEGRA = 3;

/**
 * Tercer par seguido: los dados no se juegan, la última ficha movida vuelve a
 * su base (si sigue en el recorrido; el carril final está a salvo) y el turno termina.
 */
function magiaNegra(p: Partida): Partida {
  const j = jugadorActual(p);
  const raza = nombre(j.raza);
  const ficha = p.fichas.find((f) => f.id === j.ultimaFicha);
  p.esPar = false;
  p.usados = [true, true];
  if (ficha && enRecorrido(ficha)) {
    devolverABase(ficha);
    sincronizarFortalezas(p);
    actualizarBloqueos(p);
    registrar(p, `¡Magia negra! Tres pares seguidos: una ficha de los ${raza} vuelve a su base.`, j.raza);
    avisar(p, `¡Tres pares seguidos! Los ${raza} usaron magia negra y su última ficha movida regresa a la base.`);
  } else {
    registrar(p, `¡Magia negra! Tres pares seguidos: los ${raza} pierden el resto del turno.`, j.raza);
    avisar(p, `¡Tres pares seguidos! Los ${raza} usaron magia negra y pierden el resto del turno.`);
  }
  return terminarTurno(p);
}

export function sacarFicha(prev: Partida): Partida {
  if (!puedeSacar(prev)) return prev;
  const p = clonar(prev);
  const j = jugadorActual(p);
  const op = opcionSalida(p)!;
  if (op === "suma") p.usados = [true, true];
  else p.usados[op] = true;

  // Al salir se come como máximo una ficha rival que esté en la Salida (aunque sea Refugio).
  const victima = victimaEnSalida(p, j.raza);
  const ficha = fichasDe(p, j.raza).find((f) => f.rel === null)!;
  ficha.rel = 0;
  // Si la Salida está bajo un derrumbe, la ficha sale pero queda atrapada ahí.
  actualizarBloqueos(p);
  sincronizarFortalezas(p);
  p.fichaLiberada = ficha.id;
  j.ultimaFicha = ficha.id;
  registrar(p, `${nombre(j.raza)} sacan una ficha de su base.`, j.raza);
  if (victima) {
    devolverABase(victima);
    registrar(p, `¡Al salir, los ${nombre(j.raza)} se comen una ficha de los ${nombre(victima.raza)}!`, j.raza);
    p.bonos.push({ valor: BONO_CAPTURA, motivo: "captura" });
    return entrarBono(p, "continuar");
  }
  return continuar(p);
}

export function mover(prev: Partida, fichaId: string, opcion: OpcionDado): Partida {
  const mov = movimientosLegales(prev).find((m) => m.fichaId === fichaId && m.opcion === opcion);
  if (!mov) return prev;
  const p = clonar(prev);
  const j = jugadorActual(p);
  const f = p.fichas.find((x) => x.id === fichaId)!;
  const origen = f.rel!;
  const roto = fortalezasVencidas(p, j.raza).find((b) => b.fichas.includes(f.id));
  if (roto) p.forzadas = [...(p.forzadas ?? []), ...roto.fichas];
  f.rel = mov.destino;
  const esBono = opcion === "bono";
  if (esBono) p.bonos.shift();
  else if (opcion === "suma") p.usados = [true, true];
  else p.usados[opcion] = true;
  // El premio por comer no cuenta como "última ficha movida" (no dispara eventos).
  if (!esBono) j.ultimaFicha = f.id;

  let comidas = 0;
  if (mov.destino <= REL_ENTRADA) {
    comidas = atacar(p, j.raza, loopIndex(j.raza, mov.destino));
  } else if (origen < REL_META_INI) {
    registrar(p, `Una ficha de los ${nombre(j.raza)} entra al carril del Portal.`, j.raza);
  }
  sincronizarFortalezas(p);
  if (esBono) registrar(p, `Premio: una ficha de los ${nombre(j.raza)} avanza ${mov.valor} casillas.`, j.raza);

  if (fichasDe(p, j.raza).every(enMeta)) {
    p.ganador = j.raza;
    p.fase = "fin";
    p.bonos = [];
    registrar(p, `¡Las cuatro voluntades de los ${nombre(j.raza)} resuenan en el Portal!`, j.raza);
    return p;
  }

  for (let i = 0; i < comidas; i++) p.bonos.push({ valor: BONO_CAPTURA, motivo: "captura" });
  // Premio de llegada: solo la primera vez que entra a una de las 4 casillas finales.
  if (origen < REL_META_INI && mov.destino >= REL_META_INI) {
    p.bonos.push({ valor: BONO_META, motivo: "meta" });
    registrar(p, `¡Una ficha de los ${nombre(j.raza)} llega al carril final! Premio de ${BONO_META} casillas.`, j.raza);
  }
  if (p.bonos.length) return entrarBono(p, esBono ? p.trasBono : "continuar");
  if (esBono) return salirBono(p);
  return continuar(p);
}

/** Abre la fase de premio. Si ninguna ficha puede usar un premio, ese premio se pierde. */
function entrarBono(p: Partida, tras: "continuar" | "avanzar"): Partida {
  p.trasBono = tras;
  p.fase = "bono";
  while (p.bonos.length && movimientosBono(p).length === 0) {
    const perdido = p.bonos.shift()!;
    avisar(p, `Ninguna ficha puede avanzar ${perdido.valor} casillas`);
  }
  if (!p.bonos.length) return salirBono(p);
  const { valor, motivo } = p.bonos[0];
  const raza = nombre(jugadorActual(p).raza);
  avisar(
    p,
    motivo === "meta"
      ? `¡Los ${raza} obtienen ${valor} puntos de movimiento por llegar al portal!`
      : `¡Los ${raza} obtienen ${valor} movimientos por capturar un enemigo!`
  );
  return p;
}

function salirBono(p: Partida): Partida {
  p.bonos = [];
  p.fase = "mover";
  if (p.trasBono === "avanzar") return avanzarTurno(p);
  return continuar(p);
}

function continuar(p: Partida): Partida {
  if (hayAcciones(p)) return p;
  return finTirada(p);
}

function finTirada(p: Partida): Partida {
  if (p.esPar && !p.ganador) {
    p.fase = "tirar";
    p.dados = null;
    p.usados = [false, false];
    p.fichaLiberada = null;
    p.intentos = intentosIniciales(p, jugadorActual(p).raza);
    // Sin aviso: el botón de lanzar ya brilla para volver a tirar.
    return p;
  }
  return terminarTurno(p);
}

/** Fin del turno: efectos que caducan y, quizás, un evento del Portal. */
function terminarTurno(p: Partida): Partida {
  const j = jugadorActual(p);
  if (j.maldicion > 0) j.maldicion -= 1;
  // Una fortaleza vencida que no se pudo abandonar se deshace igual.
  for (const b of fortalezasVencidas(p, j.raza)) b.roto = true;
  p.derrumbes = p.derrumbes
    .map((d) => (d.raza === j.raza ? { ...d, turnos: d.turnos - 1 } : d))
    .filter((d) => d.turnos > 0);
  actualizarBloqueos(p);

  // Los eventos globales con duración gastan un turno (duran una ronda completa).
  if (p.global) {
    const turnos = p.global.turnos - 1;
    if (turnos <= 0) {
      const g = EVENTOS_GLOBALES.find((e) => e.id === p.global!.id);
      if (g) registrar(p, `Termina el efecto de ${g.nombre}.`);
      p.global = null;
    } else p.global = { ...p.global, turnos };
  }

  // Muy de vez en cuando, un evento global (en lugar del evento del Portal de este turno).
  if (Math.random() < EVENTO_GLOBAL.prob) {
    const posibles = EVENTO_GLOBAL.solo ? EVENTOS_GLOBALES.filter((e) => e.id === EVENTO_GLOBAL.solo) : EVENTOS_GLOBALES;
    const evento = posibles[Math.floor(Math.random() * posibles.length)];
    registrar(p, `Evento global: ${evento.nombre}.`);
    const q = clonar(p);
    q.bonos = [];
    const { resumen, detalle: lineas } = resolverGlobal(q, evento);
    actualizarBloqueos(q);
    p.eventoActual = {
      evento,
      raza: j.raza,
      texto: [{ t: evento.efecto }],
      resumen,
      lineas,
      pendiente: { fichas: q.fichas, jugadores: q.jugadores, derrumbes: q.derrumbes, bonos: q.bonos, log: q.log, contador: q.contador, global: q.global ?? null },
    };
    p.contador = q.contador;
    p.fase = "evento";
    return p;
  }

  // Hay evento posible mientras tenga alguna ficha en el recorrido. Las del carril final
  // están a salvo, pero no impiden que el Portal actúe sobre las demás.
  const puedeHaberEvento = tieneEnRecorrido(p, j.raza);
  if (puedeHaberEvento && Math.random() < PROB_EVENTO) {
    const evento = elegirEvento(p);
    p.pesosEvento = actualizarPesos(p.pesosEvento, evento.id);
    registrar(p, `Evento del Portal: ${evento.nombre}.`, j.raza);
    // El efecto se calcula ahora, pero se aplica al pulsar "Continuar" para que se vea.
    const q = clonar(p);
    q.bonos = [];
    const { resumen, detalle: lineas, extremos } = resolverEvento(q, evento, jugadorActual(q));
    actualizarBloqueos(q);
    p.eventoActual = {
      evento,
      raza: j.raza,
      texto: textoEvento(evento, MATRIZ_EFECTOS[j.raza][evento.tipo], extremos),
      resumen,
      lineas,
      pendiente: { fichas: q.fichas, jugadores: q.jugadores, derrumbes: q.derrumbes, bonos: q.bonos, log: q.log, contador: q.contador, global: q.global ?? null },
    };
    p.contador = q.contador;
    p.fase = "evento";
    return p;
  }
  return avanzarTurno(p);
}

export function cerrarEvento(prev: Partida): Partida {
  if (prev.fase !== "evento" || !prev.eventoActual) return prev;
  const p = clonar(prev);
  const res = prev.eventoActual.pendiente;
  p.fichas = res.fichas.map((f) => ({ ...f }));
  p.jugadores = res.jugadores.map((j) => ({ ...j }));
  p.derrumbes = res.derrumbes.map((d) => ({ ...d }));
  p.log = [...res.log];
  if (res.global !== undefined) p.global = res.global;
  sincronizarFortalezas(p);
  p.contador = Math.max(p.contador, res.contador);
  p.eventoActual = null;
  if (res.bonos.length) {
    p.bonos = res.bonos.map((b) => ({ ...b }));
    return entrarBono(p, "avanzar");
  }
  return avanzarTurno(p);
}

function avanzarTurno(p: Partida): Partida {
  p.turno = (p.turno + 1) % p.jugadores.length;
  const j = jugadorActual(p);
  // Las fortalezas del jugador que empieza gastan un turno.
  p.forzadas = [];
  sincronizarFortalezas(p);
  p.fortalezas = (p.fortalezas ?? []).map((b) => (b.raza === j.raza ? { ...b, turnos: b.turnos - 1 } : b));
  // Escudo de Luz y Simbiosis duran "hasta tu próximo turno".
  for (const f of fichasDe(p, j.raza)) {
    f.escudo = false;
    f.proteccion = false;
  }
  p.fase = "tirar";
  p.dados = null;
  p.dadosOriginales = null;
  p.usados = [false, false];
  p.esPar = false;
  p.paresSeguidos = 0;
  p.fichaLiberada = null;
  p.bonos = [];
  p.trasBono = "continuar";
  p.intentos = intentosIniciales(p, j.raza);
  return p;
}

/* ---------------- Probabilidad de los eventos ---------------- */

/** Peso de cada evento: baja cada vez que se repite dentro de la ventana de 3 eventos. */
export function pesoEvento(p: Partida, id: string): number {
  return Math.pow(FACTOR_REPETICION, p.pesosEvento[id]?.nivel ?? 0);
}

function elegirEvento(p: Partida): EventoDef {
  const pesos = EVENTOS.map((e) => pesoEvento(p, e.id));
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < EVENTOS.length; i++) {
    r -= pesos[i];
    if (r < 0) return EVENTOS[i];
  }
  return EVENTOS[EVENTOS.length - 1];
}

function actualizarPesos(pesos: Partida["pesosEvento"], salio: string): Partida["pesosEvento"] {
  const res: Partida["pesosEvento"] = {};
  for (const e of EVENTOS) {
    const s = pesos[e.id] ?? { nivel: 0, restantes: 0 };
    if (e.id === salio) res[e.id] = { nivel: s.nivel + 1, restantes: VENTANA_REPETICION };
    else if (s.restantes > 1) res[e.id] = { nivel: s.nivel, restantes: s.restantes - 1 };
    else res[e.id] = { nivel: 0, restantes: 0 };
  }
  return res;
}

/* ---------------- Eventos ---------------- */

const MOD: Record<EfectoMatriz, number> = { positivo: 1, negativo: -1, neutral: 0 };

/**
 * Desplaza una ficha del recorrido por un evento. Nunca entra al carril final
 * y nunca deja más de 2 fichas en una casilla: si la casilla está llena, se
 * queda en la más cercana con sitio, volviendo hacia donde estaba.
 */
function desplazar(p: Partida, f: Ficha, n: number) {
  // Una ficha atrapada bajo las rocas no se mueve, ni siquiera por otros eventos.
  if (!enRecorrido(f) || n === 0 || atrapada(p, f)) return;
  const origen = f.rel!;
  const objetivo = Math.max(REL_MIN, Math.min(REL_ENTRADA, origen + n));
  const paso = objetivo > origen ? -1 : 1;
  for (let r = objetivo; r !== origen; r += paso) {
    const idx = loopIndex(f.raza, r);
    if (!derrumbeEn(p, idx) && ocupantes(p, idx).filter((o) => o.id !== f.id).length < MAX_POR_CASILLA) {
      f.rel = r;
      return;
    }
  }
}

const MAS: Record<EfectoMatriz, string> = { positivo: " (+1 a favor)", negativo: " (−1 en contra)", neutral: "" };

function casillas(n: number) {
  return `${n} casilla${n === 1 ? "" : "s"}`;
}

/** "avanza 4 casillas (+1 a favor)" / "retrocede 3 casillas" / "" si no se mueve. */
function movimiento(n: number, e: EfectoMatriz, plural = false) {
  if (n === 0) return "";
  const verbo = n > 0 ? (plural ? "avanzan" : "avanza") : plural ? "retroceden" : "retrocede";
  return `${verbo} ${casillas(Math.abs(n))}${MAS[e]}`;
}

/** Resultado de un evento: una frase corta para la tarjeta y el detalle exacto para "Más información". */
interface Resolucion {
  resumen: string;
  detalle: string[];
  /** Juicio Divino y Estampida: de qué raza son la ficha más adelantada y la más rezagada. */
  extremos?: { adelantada: RazaId; rezagada: RazaId };
}

/** Aplica un evento global: igual para todos, sin matriz de efectos. */
function resolverGlobal(p: Partida, evento: EventoGlobalDef): Resolucion {
  const detalle: string[] = [];
  switch (evento.id) {
    case "tornado":
    case "retroceso-del-tiempo": {
      const avanza = evento.id === "tornado";
      // Se mueven primero las que van delante en el sentido del movimiento, para no estorbarse.
      const fichas = p.fichas
        .filter(enRecorrido)
        .filter((f) => avanza || !esRefugio(loopIndex(f.raza, f.rel!)))
        .sort((a, b) => (avanza ? b.rel! - a.rel! : a.rel! - b.rel!));
      let movidas = 0;
      for (const f of fichas) {
        const antes = f.rel;
        desplazar(p, f, avanza ? 2 : -2);
        if (f.rel !== antes) movidas++;
      }
      const quietas = p.fichas.filter(enRecorrido).length - movidas;
      if (quietas > 0) {
        const cuantas = quietas === 1 ? "Una ficha no se mueve" : `${quietas} fichas no se mueven`;
        detalle.push(`${cuantas} (${avanza ? "atrapada o ya en la entrada a su carril" : "en una salida o un refugio, o atrapada"}).`);
      }
      if (!movidas) return { resumen: "Ninguna ficha del recorrido puede moverse: no pasa nada.", detalle };
      const verbo = avanza ? "avanza" : "retrocede";
      return { resumen: movidas === 1 ? `Una ficha ${verbo} 2 casillas.` : `${movidas} fichas ${verbo}n 2 casillas.`, detalle };
    }
    case "niebla-espesa":
    case "luna-sangrienta": {
      // Una ronda completa: hasta que todos hayan jugado un turno.
      p.global = { id: evento.id, turnos: p.jugadores.length };
      return {
        resumen:
          evento.id === "niebla-espesa"
            ? "Nadie puede capturar hasta que todos hayan jugado un turno."
            : "Escudos, protecciones y fortalezas no sirven hasta que todos hayan jugado un turno.",
        detalle,
      };
    }
    case "sombra-del-eclipse": {
      for (const j of p.jugadores) j.maldicion = Math.max(j.maldicion, 1);
      return { resumen: "Todas las razas quedan ralentizadas durante su próximo turno.", detalle };
    }
    case "llamado-del-portal": {
      const salen: RazaId[] = [];
      for (const j of p.jugadores) {
        const ficha = fichasDe(p, j.raza).find((f) => f.rel === null);
        if (!ficha) continue;
        if (ocupantes(p, idxSalida(j.raza)).length >= MAX_POR_CASILLA) {
          detalle.push(`Los ${nombre(j.raza)} no tienen sitio en su salida.`);
          continue;
        }
        ficha.rel = 0;
        salen.push(j.raza);
      }
      sincronizarFortalezas(p);
      if (!salen.length) return { resumen: "Nadie puede sacar una ficha: no pasa nada.", detalle };
      return { resumen: `Sacan una ficha de su base: ${salen.map(nombre).join(", ")}.`, detalle };
    }
  }
  return { resumen: "No pasa nada.", detalle };
}

/** Aplica el evento y devuelve qué pasó, solo en términos de juego (el lore va en la descripción). */
function resolverEvento(p: Partida, evento: EventoDef, j: Jugador): Resolucion {
  const detalle: string[] = [];
  const tipo = evento.tipo;
  const efecto = (r: RazaId) => MATRIZ_EFECTOS[r][tipo];
  const enTablero = p.fichas.filter(enRecorrido);
  const los = (r: RazaId) => `los ${nombre(r)}`;

  // Juicio Divino y Estampida no dependen de la última ficha movida.
  if (evento.id === "juicio-divino" || evento.id === "estampida") {
    const candidatas = enTablero;
    if (candidatas.length < 2) {
      return { resumen: "No hay suficientes fichas en el recorrido: no pasa nada.", detalle };
    }
    const orden = [...candidatas].sort((a, b) => b.rel! - a.rel! || Math.random() - 0.5);
    const primera = orden[0];
    const ultima = orden[orden.length - 1];
    const nPrimera = -3 + MOD[efecto(primera.raza)];
    const nUltima = 3 + MOD[efecto(ultima.raza)];
    desplazar(p, primera, nPrimera);
    desplazar(p, ultima, nUltima);
    detalle.push(`Más adelantada (${nombre(primera.raza)}): ${movimiento(nPrimera, efecto(primera.raza))}.`);
    detalle.push(`Más rezagada (${nombre(ultima.raza)}): ${movimiento(nUltima, efecto(ultima.raza))}.`);
    return {
      extremos: { adelantada: primera.raza, rezagada: ultima.raza },
      resumen: `La ficha más adelantada (${nombre(primera.raza)}) retrocede y la más rezagada (${nombre(ultima.raza)}) avanza.`,
      detalle,
    };
  }

  // El evento cae sobre la última ficha movida; si ya no está en el recorrido (llegó al carril
  // final o se la comieron), sobre su ficha más adelantada que siga en él.
  const ultima = p.fichas.find((f) => f.id === j.ultimaFicha);
  const objetivo =
    ultima && enRecorrido(ultima)
      ? ultima
      : fichasDe(p, j.raza)
          .filter(enRecorrido)
          .sort((a, b) => b.rel! - a.rel!)[0];
  if (!objetivo) {
    return { resumen: "No tienes fichas en el recorrido: no pasa nada.", detalle };
  }
  const raza = objetivo.raza;
  const efectoPropio = efecto(raza);

  // Eventos de área: la matriz se aplica a cada ficha según su raza.
  if (evento.id === "rafaga-huracanada" || evento.id === "himno-de-los-angeles") {
    const centro = loopIndex(raza, objetivo.rel!);
    const afectadas = enTablero
      .filter((f) => distanciaCircular(loopIndex(f.raza, f.rel!), centro) <= 2)
      .sort((a, b) => b.rel! - a.rel!); // las de adelante primero, para que haya sitio
    let movidas = 0;
    for (const f of afectadas) {
      const e = efecto(f.raza);
      const n = 3 + MOD[e];
      desplazar(p, f, n);
      movidas++;
      detalle.push(`${capital(nombre(f.raza))}: ${movimiento(n, e)}.`);
    }
    // Dos fichas de la misma raza que se mueven igual se muestran en una sola línea.
    const unicas = [...new Set(detalle)];
    detalle.splice(0, detalle.length, ...unicas.map((l) => {
      const n = detalle.filter((x) => x === l).length;
      return n > 1 ? l.replace(":", ` (${n} fichas):`) : l;
    }));
    const resumen =
      movidas === 0
        ? "Ninguna ficha cercana se mueve."
        : movidas === 1
          ? "La única ficha afectada avanza."
          : `Las ${movidas} fichas a 2 casillas o menos avanzan.`;
    return { resumen, detalle };
  }

  if (evento.id === "derrumbe-de-rocas" || evento.id === "cadenas-sagradas") {
    const tipoBloqueo = evento.id === "cadenas-sagradas" ? "cadenas" : "rocas";
    const a = loopIndex(raza, objetivo.rel!);
    const b = (a + 1) % LOOP;
    const afectadas = enTablero.filter((f) => {
      const i = loopIndex(f.raza, f.rel!);
      return i === a || i === b;
    });
    // El bloqueo no mueve fichas: la matriz decide cuánto tiempo queda atrapada cada una.
    const exentas: string[] = [];
    const cortas: string[] = [];
    for (const f of afectadas) {
      const e = efecto(f.raza);
      if (f.proteccion) {
        f.proteccion = false;
        exentas.push(f.id);
        detalle.push(`${nombre(f.raza)}: su protección se gasta y puede salir.`);
      } else if (e === "positivo") {
        cortas.push(f.id);
        detalle.push(`${nombre(f.raza)}: atrapada 1 turno (+1 a favor).`);
      } else {
        detalle.push(`${nombre(f.raza)}: atrapada 2 turnos.`);
      }
    }
    p.contador += 1;
    p.derrumbes = [...p.derrumbes, { id: p.contador, tipo: tipoBloqueo, celdas: [a, b], raza: j.raza, turnos: 2, exentas, cortas }];
    actualizarBloqueos(p);
    return { resumen: "Esta casilla y la siguiente quedan bloqueadas 2 turnos: nadie entra ni sale.", detalle };
  }

  // Eventos de una sola ficha: la última movida por el jugador.
  const mod = MOD[efectoPropio];
  const ajuste = () => {
    const m = movimiento(mod, efectoPropio);
    if (m) detalle.push(`Además ${m}.`);
  };

  switch (evento.id) {
    case "escudo-de-luz":
    case "tormenta-de-arena": {
      objetivo.escudo = evento.id === "escudo-de-luz" ? "luz" : "arena";
      desplazar(p, objetivo, mod);
      ajuste();
      return { resumen: `Nadie puede comer la ficha de ${los(raza)} hasta su próximo turno.`, detalle };
    }
    case "intercambio-dimensional":
    case "tromba-de-agua": {
      const idx = loopIndex(raza, objetivo.rel!);
      if (derrumbeEn(p, idx)) return { resumen: "La ficha está atrapada y no se puede mover: no pasa nada.", detalle };
      const cercanas = enTablero
        .filter((f) => f.id !== objetivo.id && !derrumbeEn(p, loopIndex(f.raza, f.rel!)))
        .map((f) => ({ f, d: distanciaCircular(loopIndex(f.raza, f.rel!), idx) }))
        .filter(({ d }) => d >= 1 && d <= 5);
      // Solo cuentan los intercambios posibles: ninguna de las dos fichas puede
      // pasarse de la entrada a su carril (ni saltar hacia atrás hasta ella).
      const validas = cercanas
        .filter(({ f }) => cambioValido(objetivo, loopIndex(f.raza, f.rel!)) && cambioValido(f, idx))
        .sort((a, b) => a.d - b.d || Math.random() - 0.5);
      if (!cercanas.length) return { resumen: "No hay fichas a 5 casillas o menos: no pasa nada.", detalle };
      if (!validas.length) return { resumen: "Ninguna ficha cercana puede cambiar de lugar sin pasarse de su carril: no pasa nada.", detalle };
      const { f: otra, d } = validas[0];
      const idxOtra = loopIndex(otra.raza, otra.rel!);
      otra.rel = relDesdeLoop(otra.raza, idx);
      objetivo.rel = relDesdeLoop(raza, idxOtra);
      desplazar(p, objetivo, mod);
      detalle.push(`Estaban a ${casillas(d)} de distancia.`);
      ajuste();
      const conQuien = otra.raza === raza ? "otra de sus fichas" : `la de ${los(otra.raza)}`;
      return { resumen: `La ficha de ${los(raza)} cambia de lugar con ${conQuien}.`, detalle };
    }
    case "maldicion-de-polimorfia":
    case "pantano-de-lianas": {
      // Con el efecto a favor dura 1 turno en lugar de 2; en contra, además retrocede 1.
      const turnos = efectoPropio === "positivo" ? 1 : 2;
      j.maldicion = turnos;
      if (efectoPropio === "negativo") desplazar(p, objetivo, -1);
      if (efectoPropio === "positivo") detalle.push("Dura 1 turno en lugar de 2 (+1 a favor).");
      if (efectoPropio === "negativo") detalle.push("Además retrocede 1 casilla (−1 en contra).");
      return { resumen: `Los ${nombre(raza)} quedan ralentizados ${turnos === 1 ? "durante su próximo turno" : "durante sus próximos 2 turnos"}.`, detalle };
    }
    case "ataque-de-bestia":
    case "estallido-runico": {
      if (objetivo.proteccion) {
        objetivo.proteccion = false;
        detalle.push("La protección se gasta.");
        return { resumen: "La protección detiene el golpe: la ficha no se mueve.", detalle };
      }
      const n = -5 + mod;
      desplazar(p, objetivo, n);
      const comidas = atacar(p, raza, loopIndex(raza, objetivo.rel!));
      if (efectoPropio !== "neutral") detalle.push(`${capital(movimiento(n, efectoPropio))}.`);
      if (comidas) {
        for (let i = 0; i < comidas; i++) p.bonos.push({ valor: BONO_CAPTURA, motivo: "captura" });
        detalle.push(`Al caer se come ${comidas === 1 ? "1 ficha" : `${comidas} fichas`}: premio de ${BONO_CAPTURA} casillas.`);
      }
      return {
        resumen: `La ficha de ${los(raza)} retrocede ${casillas(Math.abs(n))}${comidas ? " y se come lo que hay donde cae" : ""}.`,
        detalle,
      };
    }
    case "simbiosis-de-enredaderas":
    case "runa-guardiana": {
      const n = 3 + mod;
      desplazar(p, objetivo, n);
      objetivo.proteccion = evento.id === "runa-guardiana" ? "runa" : "enredaderas";
      if (efectoPropio !== "neutral") detalle.push(`${capital(movimiento(n, efectoPropio))}.`);
      detalle.push("La protección anula el primer ataque o trampa hasta su próximo turno.");
      return { resumen: `La ficha de ${los(raza)} avanza ${casillas(n)} y queda protegida.`, detalle };
    }
  }
  return { resumen: "No pasa nada.", detalle };
}

const S = (t: string): Segmento => ({ t });
/** Número o frase afectada por la matriz: en color si es a favor o en contra. */
const N = (t: string, e: EfectoMatriz): Segmento => (e === "neutral" ? { t } : { t, e });

/**
 * Efecto de un evento con los números ya ajustados por la matriz para la raza del jugador
 * (en Juicio Divino y Estampida, para la raza de cada ficha afectada).
 */
export function textoEvento(evento: EventoDef, e: EfectoMatriz, extremos?: { adelantada: RazaId; rezagada: RazaId }): Segmento[] {
  const m = MOD[e];
  switch (evento.id) {
    case "escudo-de-luz":
    case "tormenta-de-arena":
      return m === 0
        ? [S("No te pueden comer hasta tu próximo turno.")]
        : [S("No te pueden comer hasta tu próximo turno y "), N(m > 0 ? "avanzas 1 casilla" : "retrocedes 1 casilla", e), S(".")];
    case "juicio-divino":
    case "estampida": {
      const ea = extremos ? MATRIZ_EFECTOS[extremos.adelantada][evento.tipo] : "neutral";
      const er = extremos ? MATRIZ_EFECTOS[extremos.rezagada][evento.tipo] : "neutral";
      const quien = (r?: RazaId) => (r ? ` (${nombre(r)})` : "");
      return [
        S(`La ficha más adelantada${quien(extremos?.adelantada)} retrocede `),
        N(casillas(3 - MOD[ea]), ea),
        S(` y la más rezagada${quien(extremos?.rezagada)} avanza `),
        N(String(3 + MOD[er]), er),
        S("."),
      ];
    }
    case "intercambio-dimensional":
    case "tromba-de-agua":
      return m === 0
        ? [S("Tu ficha cambia de lugar con la más cercana a 5 casillas o menos.")]
        : [S("Tu ficha cambia de lugar con la más cercana a 5 casillas o menos y "), N(m > 0 ? "avanza 1 casilla" : "retrocede 1 casilla", e), S(".")];
    case "maldicion-de-polimorfia":
    case "pantano-de-lianas":
      if (m > 0) return [S("Quedas ralentizado "), N("1 turno", e), S(".")];
      if (m < 0) return [S("Quedas ralentizado 2 turnos y "), N("retrocedes 1 casilla", e), S(".")];
      return [S("Quedas ralentizado 2 turnos.")];
    case "ataque-de-bestia":
    case "estallido-runico":
      return [S("Tu ficha retrocede "), N(casillas(5 - m), e), S(". Si cae sobre otra, la come.")];
    case "simbiosis-de-enredaderas":
    case "runa-guardiana":
      return [S("Avanzas "), N(casillas(3 + m), e), S(" y anulas el primer ataque o trampa hasta tu próximo turno.")];
    case "rafaga-huracanada":
    case "himno-de-los-angeles":
      return m === 0
        ? [S("Las fichas a 2 casillas o menos avanzan 3.")]
        : [S("Las fichas a 2 casillas o menos avanzan 3; las tuyas, "), N(String(3 + m), e), S(".")];
    case "derrumbe-de-rocas":
    case "cadenas-sagradas":
      return m > 0
        ? [S("Esa casilla y la siguiente se bloquean 2 turnos; tu ficha sale en "), N("1 turno", e), S(".")]
        : [S("Esa casilla y la siguiente se bloquean 2 turnos.")];
  }
  return [S(evento.efecto)];
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- Consultas para la interfaz ---------------- */

export function fichasMovibles(p: Partida): Set<string> {
  return new Set(movimientosLegales(p).map((m) => m.fichaId));
}

export { REL_ENTRADA, REL_META_INI };
