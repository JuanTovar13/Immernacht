/* ============================================================
   Mensajes entre el juego y el servidor de salas en línea.
   Lo usan tanto la app (src/) como el servidor (server/).
   ============================================================ */
import type { RazaId } from "../types";
import type { OpcionDado, Partida } from "../digital/engine";

/** Quién ocupa cada asiento (raza) de la sala. */
export type Asiento =
  | { tipo: "libre" } // nadie lo eligió: no juega si se empieza así
  | { tipo: "humano"; jugadorId: string }
  | { tipo: "ia" }
  | { tipo: "nadie" }; // el anfitrión lo cerró

export interface JugadorSala {
  id: string;
  nombre: string;
  conectado: boolean;
}

/** Lo que todos ven de la sala. */
export interface VistaSala {
  codigo: string;
  anfitrion: string | null;
  jugadores: JugadorSala[];
  asientos: Record<RazaId, Asiento>;
  partida: Partida | null;
  /** Jugadores que marcaron "Listo". */
  listos: string[];
  /** Propuestas de intercambio de raza pendientes. */
  propuestas: PropuestaCambio[];
  /** Cuenta regresiva en marcha (un valor nuevo cada vez que arranca una), o null. */
  cuenta: number | null;
}

/** `de` propone a `a` intercambiar sus razas (si `de` no tiene, le pide la suya). */
export interface PropuestaCambio {
  de: string;
  a: string;
}

/** Segundos de la cuenta regresiva cuando todos están listos. */
export const SEGUNDOS_CUENTA = 3;

/** Acciones de juego (las mismas del modo local). */
export type AccionJuego =
  | { tipo: "tirar" }
  | { tipo: "sacar" }
  | { tipo: "mover"; fichaId: string; opcion: OpcionDado }
  | { tipo: "cerrarEvento" };

/** Del jugador al servidor. */
export type MensajeCliente =
  | { t: "hola"; jugadorId: string; nombre: string }
  | { t: "elegirRaza"; raza: RazaId }
  | { t: "soltarRaza" }
  /** Solo el anfitrión: cambia un asiento sin jugador (libre → máquina → cerrado). */
  | { t: "cambiarAsiento"; raza: RazaId }
  | { t: "empezar" }
  /** Marca o desmarca "Listo". Si todos lo están, empieza la cuenta regresiva. */
  | { t: "listo"; valor: boolean }
  /** Propone intercambiar razas con quien ocupa ese asiento. */
  | { t: "proponerCambio"; raza: RazaId }
  | { t: "responderCambio"; de: string; aceptar: boolean }
  | { t: "cancelarCambio" }
  /** Tras la victoria: la sala vuelve a la selección de razas. */
  | { t: "volverASala" }
  | { t: "accion"; accion: AccionJuego }
  | { t: "salir" };

/** Del servidor al jugador. */
export type MensajeServidor =
  | { t: "sala"; sala: VistaSala }
  | { t: "error"; codigo: CodigoError; mensaje: string };

export type CodigoError = "no-existe" | "llena" | "ya-empezo" | "invalido" | "no-permitido";

/** Letras sin las que se confunden (sin I, O, 0, 1). */
export const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const LARGO_CODIGO = 4;

export function codigoValido(c: string): boolean {
  return c.length === LARGO_CODIGO && [...c].every((l) => ALFABETO_CODIGO.includes(l));
}
