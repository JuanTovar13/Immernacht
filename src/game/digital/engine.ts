/* ============================================================
   Motor de reglas de la versión digital de Immernacht.
   Funciones puras: reciben una Partida y devuelven una nueva.
   Reglas tomadas de "Instrucciones" y "Descripción y reglas",
   con los ajustes acordados con el equipo.
   ============================================================ */
import { EVENTOS, MATRIZ_EFECTOS, RAZAS, type EfectoMatriz, type EventoDef, type RazaId } from "../types";
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
/** Valor que hay que sacar (en un dado o en la suma) para sacar una ficha de la base. */
export const VALOR_SALIDA = 5;
/** Casillas que avanza el premio por comer una ficha. */
export const BONO_CAPTURA = 20;
/** Casillas de premio la primera vez que una ficha entra a una de las 4 casillas del carril final. */
export const BONO_META = 10;
/** Máximo de fichas en una misma casilla del recorrido. */
export const MAX_POR_CASILLA = 2;
/** Cada vez que un evento sale, su peso se multiplica por este factor durante los 3 eventos siguientes. */
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
  /** Escudo de Luz o Camuflaje Silvestre: no puede ser comida hasta el próximo turno de su dueño. */
  escudo: false | "luz" | "camuflaje";
  /** Simbiosis de Enredaderas o Runa Guardiana: anula el primer ataque o trampa de la ronda. */
  proteccion: false | "enredaderas" | "runa";
  /** Derrumbe de Rocas: turnos de su dueño que le quedan inmovilizada. */
  bloqueo: number;
}

/**
 * Casillas cubiertas por un Derrumbe de Rocas mientras dure el efecto:
 * nadie puede entrar en ellas y las fichas que estén ahí no pueden moverse
 * (salvo las inmunes o protegidas cuando cayeron las rocas).
 */
export interface Derrumbe {
  id: number;
  /** Qué tapa las casillas: rocas (Derrumbe de Rocas) o luz (Cadenas Sagradas). Las reglas son las mismas. */
  tipo: "rocas" | "cadenas";
  celdas: number[];
  raza: RazaId;
  turnos: number;
  /** Fichas que resistieron las rocas (inmunes o con Simbiosis) y pueden salir. */
  exentas: string[];
  /** Fichas con efecto a favor (+1): quedan atrapadas solo 1 turno en lugar de 2. */
  cortas: string[];
}

/** Premio de movimiento pendiente: 20 casillas por comer, 10 por llegar al carril final. */
export interface Premio {
  valor: number;
  motivo: "captura" | "meta";
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
}

export interface ResultadoEvento {
  evento: EventoDef;
  raza: RazaId; // jugador que terminó el turno
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
  fichaLiberada: string | null;
  /** Lanzamientos que quedan en este turno (3 si no tiene fichas en el recorrido). */
  intentos: number;
  /** Premios de movimiento pendientes (se usan en orden). */
  bonos: Premio[];
  /** Qué hacer al terminar los bonos: seguir con los dados o pasar el turno (bono ganado en un evento). */
  trasBono: "continuar" | "avanzar";
  eventoActual: ResultadoEvento | null;
  derrumbes: Derrumbe[];
  /** Historial para que un mismo evento no se repita tan seguido. */
  pesosEvento: Record<string, { nivel: number; restantes: number }>;
  ganador: RazaId | null;
  log: EntradaLog[];
  /** Última tirada (se sigue mostrando aunque el turno haya pasado). */
  ultimaTirada: { raza: RazaId; orig: [number, number]; efectivos: [number, number]; n: number } | null;
  /** Aviso breve para mostrar en pantalla (cambia el id cada vez). */
  aviso: { id: number; texto: string } | null;
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

function clonar(p: Partida): Partida {
  return {
    ...p,
    jugadores: p.jugadores.map((j) => ({ ...j })),
    fichas: p.fichas.map((f) => ({ ...f })),
    usados: [...p.usados] as [boolean, boolean],
    derrumbes: p.derrumbes.map((d) => ({ ...d })),
    bonos: p.bonos.map((b) => ({ ...b })),
    log: [...p.log],
  };
}

function registrar(p: Partida, texto: string, raza?: RazaId) {
  p.contador += 1;
  p.log = [...p.log, { id: p.contador, texto, raza }].slice(-80);
}

function avisar(p: Partida, texto: string) {
  p.contador += 1;
  p.aviso = { id: p.contador, texto };
}

export function jugadorActual(p: Partida): Jugador {
  return p.jugadores[p.turno];
}

export function fichasDe(p: Partida, raza: RazaId): Ficha[] {
  return p.fichas.filter((f) => f.raza === raza);
}

const enRecorrido = (f: Ficha) => f.rel !== null && f.rel <= REL_ENTRADA;
const enMeta = (f: Ficha) => f.rel !== null && f.rel >= REL_META_INI;

function tieneEnRecorrido(p: Partida, raza: RazaId) {
  return fichasDe(p, raza).some(enRecorrido);
}

/** Fichas en una casilla del recorrido compartido. */
function ocupantes(p: Partida, idx: number): Ficha[] {
  return p.fichas.filter((f) => enRecorrido(f) && loopIndex(f.raza, f.rel!) === idx);
}

const resisteSinGastar = (f: Ficha) => f.escudo || f.proteccion;

/** Derrumbe activo que cubre la casilla idx, si lo hay. */
function derrumbeEn(p: Partida, idx: number): Derrumbe | undefined {
  return p.derrumbes.find((d) => d.celdas.includes(idx));
}

/** Elemento de cada bloqueo: las razas inmunes a ese elemento pueden salir. */
const ELEMENTO_BLOQUEO = { rocas: "terrenal", cadenas: "celestial" } as const;

/** ¿La ficha está atrapada bajo un derrumbe o unas cadenas? Las inmunes a su elemento pueden salir. */
function atrapada(p: Partida, f: Ficha): Derrumbe | undefined {
  if (!enRecorrido(f)) return undefined;
  const idx = loopIndex(f.raza, f.rel!);
  // Puede haber rocas y cadenas en la misma casilla: basta con que una la retenga.
  return p.derrumbes.find((d) => {
    if (!d.celdas.includes(idx) || d.exentas.includes(f.id)) return false;
    if (MATRIZ_EFECTOS[f.raza][ELEMENTO_BLOQUEO[d.tipo]] === "inmune") return false;
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
function resisteAtaque(f: Ficha): boolean {
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
  if (esRefugio(idx)) return 0;
  let n = 0;
  for (const f of ocupantes(p, idx)) {
    if (f.raza === atacante) continue;
    if (resisteAtaque(f)) {
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
  if (esRefugio(idx)) return 0;
  return ocupantes(p, idx).filter((f) => f.raza !== atacante && !resisteSinGastar(f)).length;
}

/** La ficha rival que se comería al sacar una ficha a la Salida (solo una). */
function victimaEnSalida(p: Partida, raza: RazaId): Ficha | null {
  return ocupantes(p, idxSalida(raza)).find((f) => f.raza !== raza && !resisteSinGastar(f)) ?? null;
}

/* ---------------- Movimientos legales ---------------- */

/** ¿Cabe una ficha de `raza` en la casilla `idx` del recorrido (contando las que se comería)? */
function cabeEnCasilla(p: Partida, raza: RazaId, idx: number, excluir: string): boolean {
  const resto = ocupantes(p, idx).filter((f) => f.id !== excluir);
  const quedan = esRefugio(idx) ? resto : resto.filter((f) => f.raza === raza || resisteSinGastar(f));
  return quedan.length < MAX_POR_CASILLA;
}

function destinoValido(p: Partida, f: Ficha, destino: number): boolean {
  if (destino > REL_MAX) return false;
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

export function movimientosLegales(p: Partida): Movimiento[] {
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

/** Una ficha del carril final que ya no puede avanzar (todas las casillas de adelante ocupadas). */
function atascadaEnMeta(p: Partida, f: Ficha): boolean {
  for (let d = f.rel! + 1; d <= REL_MAX; d++) {
    if (!p.fichas.some((o) => o.raza === f.raza && o.rel === d)) return false;
  }
  return true;
}

/**
 * Lanzamientos del turno:
 * - con fichas en el recorrido → 1
 * - con fichas atascadas en el carril final y el resto en la base → 1 (si no saca 5, pasa)
 * - con todas en la base (o en un carril donde aún pueden avanzar) → 3 intentos para sacar un 5
 */
function intentosIniciales(p: Partida, raza: RazaId): number {
  if (tieneEnRecorrido(p, raza)) return 1;
  const meta = fichasDe(p, raza).filter(enMeta);
  if (meta.length > 0 && meta.every((f) => atascadaEnMeta(p, f))) return 1;
  return 3;
}

/* ---------------- Acciones ---------------- */

export function tirar(prev: Partida): Partida {
  if (prev.fase !== "tirar") return prev;
  const p = clonar(prev);
  const j = jugadorActual(p);
  const orig: [number, number] = [tirarDado(), tirarDado()];
  const efectivos: [number, number] =
    j.maldicion > 0 ? [Math.floor(orig[0] / 2), Math.floor(orig[1] / 2)] : [orig[0], orig[1]];
  p.dadosOriginales = orig;
  p.dados = efectivos;
  p.usados = [false, false];
  p.esPar = orig[0] === orig[1];
  p.fichaLiberada = null;
  p.fase = "mover";
  p.intentos -= 1;
  p.ultimaTirada = { raza: j.raza, orig, efectivos, n: (p.ultimaTirada?.n ?? 0) + 1 };

  const maldito = j.maldicion > 0 ? ` (sapo: ${efectivos[0]} y ${efectivos[1]})` : "";
  registrar(p, `${nombre(j.raza)} lanzan ${orig[0]} y ${orig[1]}${p.esPar ? " — ¡pares!" : ""}${maldito}`, j.raza);

  if (hayAcciones(p)) return p;

  if (p.esPar) {
    avisar(p, "Pares, pero no hay movimientos posibles. Vuelves a lanzar.");
    return finTirada(p);
  }
  if (!tieneEnRecorrido(p, j.raza)) {
    if (p.intentos > 0) {
      p.fase = "tirar";
      avisar(p, `Sin 5. Te ${p.intentos === 1 ? "queda 1 intento" : `quedan ${p.intentos} intentos`}.`);
      return p;
    }
    avisar(p, salidaBloqueada(p) ? "Tu Salida está llena." : "Sin 5 esta vez. Pasa el turno.");
    return terminarTurno(p);
  }
  avisar(p, "No hay movimientos posibles.");
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
    avisar(p, `Ninguna ficha puede avanzar ${perdido.valor} casillas: el premio se pierde.`);
  }
  if (!p.bonos.length) return salirBono(p);
  avisar(p, `¡Premio! Mueve una ficha ${p.bonos[0].valor} casillas.`);
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
    avisar(p, "¡Pares! Vuelves a lanzar.");
    return p;
  }
  return terminarTurno(p);
}

/** Fin del turno: efectos que caducan y, quizás, un evento del Portal. */
function terminarTurno(p: Partida): Partida {
  const j = jugadorActual(p);
  if (j.maldicion > 0) j.maldicion -= 1;
  p.derrumbes = p.derrumbes
    .map((d) => (d.raza === j.raza ? { ...d, turnos: d.turnos - 1 } : d))
    .filter((d) => d.turnos > 0);
  actualizarBloqueos(p);

  // Sin fichas fuera de la base no hay evento, ni tampoco si tiene fichas en su carril final.
  const puedeHaberEvento = tieneEnRecorrido(p, j.raza) && !fichasDe(p, j.raza).some(enMeta);
  if (puedeHaberEvento && Math.random() < PROB_EVENTO) {
    const evento = elegirEvento(p);
    p.pesosEvento = actualizarPesos(p.pesosEvento, evento.id);
    registrar(p, `Evento del Portal: ${evento.nombre}.`, j.raza);
    // El efecto se calcula ahora, pero se aplica al pulsar "Continuar" para que se vea.
    const q = clonar(p);
    q.bonos = [];
    const lineas = resolverEvento(q, evento, jugadorActual(q));
    actualizarBloqueos(q);
    p.eventoActual = {
      evento,
      raza: j.raza,
      lineas,
      pendiente: { fichas: q.fichas, jugadores: q.jugadores, derrumbes: q.derrumbes, bonos: q.bonos, log: q.log, contador: q.contador },
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

const MOD: Record<EfectoMatriz, number> = { positivo: 1, negativo: -1, neutral: 0, inmune: 0 };
const TEXTO_MOD: Record<EfectoMatriz, string> = {
  positivo: "y avanza 1 casilla extra",
  negativo: "y retrocede 1 casilla",
  neutral: "",
  inmune: "",
};

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

function describir(f: Ficha) {
  return `la ficha de los ${nombre(f.raza)}`;
}

/** Aplica el evento y devuelve las líneas que explican qué pasó. */
function resolverEvento(p: Partida, evento: EventoDef, j: Jugador): string[] {
  const lineas: string[] = [];
  const tipo = evento.tipo;
  const efecto = (r: RazaId) => MATRIZ_EFECTOS[r][tipo];
  const coletilla = (r: RazaId) => (TEXTO_MOD[efecto(r)] ? ` ${TEXTO_MOD[efecto(r)]}` : "");
  const enTablero = p.fichas.filter(enRecorrido);

  // Juicio Divino no depende de la última ficha movida.
  if (evento.id === "juicio-divino" || evento.id === "estampida") {
    const estampida = evento.id === "estampida";
    const candidatas = enTablero.filter((f) => efecto(f.raza) !== "inmune");
    if (candidatas.length < 2) {
      lineas.push(
        estampida
          ? "No hay suficientes fichas en el recorrido: la manada pasa de largo."
          : "No hay suficientes fichas en el recorrido: la balanza queda quieta."
      );
      return lineas;
    }
    const orden = [...candidatas].sort((a, b) => b.rel! - a.rel! || Math.random() - 0.5);
    const primera = orden[0];
    const ultima = orden[orden.length - 1];
    desplazar(p, primera, -3 + MOD[efecto(primera.raza)]);
    lineas.push(
      estampida
        ? `La ficha más adelantada (${nombre(primera.raza)}) choca con la manada y retrocede 3 casillas${coletilla(primera.raza)}.`
        : `La ficha más adelantada (${nombre(primera.raza)}) retrocede 3 casillas${coletilla(primera.raza)}.`
    );
    desplazar(p, ultima, 3 + MOD[efecto(ultima.raza)]);
    lineas.push(
      estampida
        ? `La ficha más rezagada (${nombre(ultima.raza)}) es arrastrada por la manada y avanza 3 casillas${coletilla(ultima.raza)}.`
        : `La ficha más rezagada (${nombre(ultima.raza)}) avanza 3 casillas${coletilla(ultima.raza)}.`
    );
    const inmunes = enTablero.filter((f) => efecto(f.raza) === "inmune");
    if (inmunes.length) lineas.push(`Los ${nombre(inmunes[0].raza)} son inmunes a los eventos de tipo ${tipo}.`);
    return lineas;
  }

  const objetivo = p.fichas.find((f) => f.id === j.ultimaFicha);
  if (!objetivo || !enRecorrido(objetivo)) {
    lineas.push("La última ficha movida ya no está en el recorrido: la energía del Portal se disipa.");
    return lineas;
  }
  const raza = objetivo.raza;
  const efectoPropio = efecto(raza);

  // Eventos de área: la matriz se aplica a cada ficha según su raza.
  if (evento.id === "rafaga-huracanada" || evento.id === "himno-de-los-angeles") {
    const himno = evento.id === "himno-de-los-angeles";
    const centro = loopIndex(raza, objetivo.rel!);
    const afectadas = enTablero
      .filter((f) => distanciaCircular(loopIndex(f.raza, f.rel!), centro) <= 2)
      .sort((a, b) => b.rel! - a.rel!); // las de adelante primero, para que haya sitio
    for (const f of afectadas) {
      if (efecto(f.raza) === "inmune") {
        lineas.push(himno ? `${capital(describir(f))} es inmune y no se deja llevar por el canto.` : `${capital(describir(f))} es inmune y resiste el viento.`);
        continue;
      }
      desplazar(p, f, 3 + MOD[efecto(f.raza)]);
      lineas.push(
        himno
          ? `El himno guía ${describir(f)} 3 casillas hacia adelante${coletilla(f.raza)}.`
          : `${capital(describir(f))} es empujada 3 casillas hacia adelante${coletilla(f.raza)}.`
      );
    }
    return lineas;
  }

  if (evento.id === "derrumbe-de-rocas" || evento.id === "cadenas-sagradas") {
    const tipoBloqueo = evento.id === "cadenas-sagradas" ? "cadenas" : "rocas";
    const bajo = tipoBloqueo === "cadenas" ? "encadenada por la luz" : "atrapada bajo las rocas";
    const a = loopIndex(raza, objetivo.rel!);
    const b = (a + 1) % LOOP;
    const afectadas = enTablero.filter((f) => {
      const i = loopIndex(f.raza, f.rel!);
      return i === a || i === b;
    });
    // Las rocas no mueven fichas: la matriz decide quién queda atrapado.
    const exentas: string[] = [];
    const cortas: string[] = [];
    for (const f of afectadas) {
      const e = efecto(f.raza);
      if (e === "inmune") {
        exentas.push(f.id);
        lineas.push(`${capital(describir(f))} es inmune: ${tipoBloqueo === "cadenas" ? "las cadenas no la atan" : "las rocas no la alcanzan"}.`);
      } else if (f.proteccion) {
        const quien = f.proteccion === "runa" ? "La runa guardiana protege" : "Las enredaderas protegen";
        f.proteccion = false;
        exentas.push(f.id);
        lineas.push(`${quien} ${describir(f)} de la trampa.`);
      } else if (e === "positivo") {
        cortas.push(f.id);
        lineas.push(`${capital(describir(f))} se protege de lo peor (+1): queda ${bajo} solo 1 turno.`);
      } else {
        lineas.push(`${capital(describir(f))} queda ${bajo} durante 2 turnos.`);
      }
    }
    p.contador += 1;
    p.derrumbes = [...p.derrumbes, { id: p.contador, tipo: tipoBloqueo, celdas: [a, b], raza: j.raza, turnos: 2, exentas, cortas }];
    lineas.push(`Nadie puede entrar en esas dos casillas mientras duren ${tipoBloqueo === "cadenas" ? "las cadenas" : "las rocas"}.`);
    actualizarBloqueos(p);
    return lineas;
  }

  // Eventos de una sola ficha: la última movida por el jugador.
  if (efectoPropio === "inmune") {
    lineas.push(`Los ${nombre(raza)} son inmunes a los eventos de tipo ${tipo}. No ocurre nada.`);
    return lineas;
  }
  const mod = MOD[efectoPropio];

  switch (evento.id) {
    case "escudo-de-luz": {
      objetivo.escudo = "luz";
      desplazar(p, objetivo, mod);
      lineas.push(`Un aura protege ${describir(objetivo)} hasta su próximo turno${coletilla(raza)}.`);
      break;
    }
    case "camuflaje-silvestre": {
      objetivo.escudo = "camuflaje";
      desplazar(p, objetivo, mod);
      lineas.push(`El follaje oculta ${describir(objetivo)}: nadie puede comerla hasta su próximo turno${coletilla(raza)}.`);
      break;
    }
    case "intercambio-dimensional":
    case "tromba-de-agua": {
      const tromba = evento.id === "tromba-de-agua";
      const idx = loopIndex(raza, objetivo.rel!);
      if (derrumbeEn(p, idx)) {
        lineas.push(`La ficha está atrapada: ${tromba ? "el agua" : "el hechizo"} no puede moverla.`);
        break;
      }
      const cercanas = enTablero
        .filter((f) => f.id !== objetivo.id && efecto(f.raza) !== "inmune" && !derrumbeEn(p, loopIndex(f.raza, f.rel!)))
        .map((f) => ({ f, d: distanciaCircular(loopIndex(f.raza, f.rel!), idx) }))
        .filter(({ d }) => d >= 1 && d <= 5)
        .sort((a, b) => a.d - b.d || Math.random() - 0.5);
      if (!cercanas.length) {
        lineas.push(`No hay ninguna ficha a 5 casillas o menos: ${tromba ? "el agua baja sin arrastrar a nadie" : "el hechizo no surte efecto"}.`);
        break;
      }
      const otra = cercanas[0].f;
      const idxOtra = loopIndex(otra.raza, otra.rel!);
      otra.rel = relDesdeLoop(otra.raza, idx);
      objetivo.rel = relDesdeLoop(raza, idxOtra);
      desplazar(p, objetivo, mod);
      lineas.push(
        tromba
          ? `El agua arrastra ${describir(objetivo)} y ${describir(otra)}: cada una queda donde estaba la otra${coletilla(raza)}.`
          : `${capital(describir(objetivo))} intercambia su lugar con ${describir(otra)}${coletilla(raza)}.`
      );
      break;
    }
    case "maldicion-de-polimorfia": {
      j.maldicion = 2;
      desplazar(p, objetivo, mod);
      lineas.push(`Los ${nombre(raza)} se convierten en sapo: sus próximas 2 tiradas valen la mitad${coletilla(raza)}.`);
      break;
    }
    case "arenas-movedizas": {
      j.maldicion = 2;
      desplazar(p, objetivo, mod);
      lineas.push(`Los ${nombre(raza)} se hunden en la arena: sus próximas 2 tiradas valen la mitad${coletilla(raza)}.`);
      break;
    }
    case "ataque-de-bestia":
    case "estallido-runico": {
      const bestia = evento.id === "ataque-de-bestia";
      if (objetivo.proteccion) {
        objetivo.proteccion = false;
        lineas.push(
          bestia
            ? `La protección mágica detiene a la bestia: ${describir(objetivo)} no se mueve.`
            : `La protección absorbe la explosión: ${describir(objetivo)} no se mueve.`
        );
        break;
      }
      desplazar(p, objetivo, -5 + mod);
      lineas.push(
        bestia
          ? `La bestia empuja ${describir(objetivo)} 5 casillas hacia atrás${coletilla(raza)}.`
          : `La explosión lanza ${describir(objetivo)} 5 casillas hacia atrás${coletilla(raza)}.`
      );
      const comidas = atacar(p, raza, loopIndex(raza, objetivo.rel!));
      if (comidas) {
        for (let i = 0; i < comidas; i++) p.bonos.push({ valor: BONO_CAPTURA, motivo: "captura" });
        lineas.push(`¡Al caer, se come ${comidas === 1 ? "una ficha" : `${comidas} fichas`}! Ganas un premio de ${BONO_CAPTURA} casillas.`);
      }
      break;
    }
    case "simbiosis-de-enredaderas": {
      desplazar(p, objetivo, 3 + mod);
      objetivo.proteccion = "enredaderas";
      lineas.push(`Las enredaderas impulsan ${describir(objetivo)} 3 casillas${coletilla(raza)} y la protegen esta ronda.`);
      break;
    }
    case "runa-guardiana": {
      desplazar(p, objetivo, 3 + mod);
      objetivo.proteccion = "runa";
      lineas.push(`Una runa impulsa ${describir(objetivo)} 3 casillas${coletilla(raza)} y la protege esta ronda.`);
      break;
    }
  }
  return lineas;
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- Consultas para la interfaz ---------------- */

export function fichasMovibles(p: Partida): Set<string> {
  return new Set(movimientosLegales(p).map((m) => m.fichaId));
}

export { REL_ENTRADA, REL_META_INI };
