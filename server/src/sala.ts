/* ============================================================
   Una sala de juego en línea (un Durable Object por sala).
   El servidor es la autoridad: guarda la partida, tira los dados,
   valida cada jugada con el mismo motor de la app y juega los
   turnos de las máquinas y de los jugadores desconectados.
   ============================================================ */
import { DurableObject } from "cloudflare:workers";
import * as motor from "../../src/game/digital/engine";
import { elegirAccion } from "../../src/game/digital/bot";
import { ORDEN_RAZAS, type RazaId } from "../../src/game/types";
import {
  SEGUNDOS_CUENTA,
  SEGUNDOS_ESPERA,
  type AccionJuego,
  type Asiento,
  type CodigoError,
  type MensajeCliente,
  type MensajeServidor,
  type PropuestaCambio,
  type VistaSala,
} from "../../src/game/online/protocolo";
import type { Partida } from "../../src/game/digital/engine";

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
}

interface EstadoSala {
  codigo: string;
  anfitrion: string | null;
  jugadores: { id: string; nombre: string }[];
  asientos: Record<RazaId, Asiento>;
  partida: Partida | null;
  /** Momento del último cambio de la partida (para el ritmo de las máquinas). */
  ultimoCambio: number;
  /** Cuándo empezó el evento que se está mostrando. */
  eventoDesde: number | null;
  /** Desde cuándo está desconectado cada jugador. */
  desconectadoDesde: Record<string, number>;
  actividad: number;
  /** Jugadores que marcaron "Listo" en la sala de espera. */
  listos: string[];
  propuestas: PropuestaCambio[];
  /** Cuándo empezó la cuenta regresiva en marcha (sirve de identificador), o null. */
  cuentaDesde: number | null;
  /** Cuándo termina esa cuenta y se abre el Portal. */
  cuentaFin?: number | null;
  /** true: la cuenta corta (todos listos); false: la de espera (alguien está listo). */
  cuentaCorta?: boolean;
}

/** Margen tras la cuenta para que a todos les dé tiempo de ver el "1". */
const MARGEN_CUENTA = 400;

/** Ritmo de las jugadas automáticas (ms). */
const RITMO_MAQUINA = 900;
/** Un jugador desconectado en su turno: tras este tiempo juega una máquina por él. */
const ESPERA_DESCONECTADO = 10_000;
/** Un evento del jugador de turno se cierra solo tras este tiempo si no pulsa Continuar. */
const EVENTO_HUMANO = 30_000;
/** Los eventos de las máquinas se cierran solos (da tiempo a leerlos). */
const EVENTO_MAQUINA = 9_000;
/** Una sala sin nadie conectado se borra tras este tiempo. */
const CADUCIDAD = 24 * 60 * 60 * 1000;
const MAX_JUGADORES = 4;

function asientosIniciales(): Record<RazaId, Asiento> {
  return { humanos: { tipo: "libre" }, elfos: { tipo: "libre" }, enanos: { tipo: "libre" }, nomuertos: { tipo: "libre" } };
}

export class Sala extends DurableObject<Env> {
  private estado: EstadoSala | null = null;
  /** Conexiones que se están cerrando (aún aparecen en getWebSockets mientras se procesa el cierre). */
  private cerrados = new WeakSet<WebSocket>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const guardado = (await ctx.storage.get<EstadoSala>("estado")) ?? null;
      // Salas guardadas antes de que existieran "Listo" y los intercambios.
      this.estado = guardado && { ...guardado, listos: guardado.listos ?? [], propuestas: guardado.propuestas ?? [], cuentaDesde: guardado.cuentaDesde ?? null, cuentaFin: guardado.cuentaFin ?? null };
    });
  }

  /* ---------------- Conexiones ---------------- */

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/crear") {
      if (this.estado) return new Response("ocupado", { status: 409 });
      const codigo = await req.text();
      this.estado = {
        codigo,
        anfitrion: null,
        jugadores: [],
        asientos: asientosIniciales(),
        partida: null,
        ultimoCambio: Date.now(),
        eventoDesde: null,
        desconectadoDesde: {},
        actividad: Date.now(),
        listos: [],
        propuestas: [],
        cuentaDesde: null,
      };
      await this.guardar();
      await this.programar();
      return new Response("ok");
    }

    if (req.headers.get("Upgrade") !== "websocket") return new Response("Se esperaba un WebSocket", { status: 426 });
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    if (!this.estado) {
      this.enviar(servidor, { t: "error", codigo: "no-existe", mensaje: "Esa sala no existe o ya caducó." });
      servidor.close(4004, "no-existe");
    }
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const e = this.estado;
    if (!e || typeof data !== "string") return;
    let msg: MensajeCliente;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    e.actividad = Date.now();
    const yo = (ws.deserializeAttachment() as { jugadorId?: string } | null)?.jugadorId;

    if (msg.t === "hola") return this.hola(ws, msg.jugadorId, msg.nombre);
    if (!yo) return this.error(ws, "invalido", "Primero hay que identificarse.");

    switch (msg.t) {
      case "elegirRaza":
        return this.elegirRaza(ws, yo, msg.raza);
      case "soltarRaza":
        if (e.partida) return;
        this.soltar(yo);
        this.olvidarPropuestas(yo);
        this.desmarcar(yo);
        return this.cambio();
      case "listo":
        if (e.partida) return;
        e.listos = e.listos.filter((id) => id !== yo);
        if (msg.valor) e.listos.push(yo);
        return this.cambio();
      case "proponerCambio":
        return this.proponerCambio(ws, yo, msg.raza);
      case "responderCambio": {
        if (e.partida) return;
        const p = e.propuestas.find((x) => x.de === msg.de && x.a === yo);
        if (!p) return;
        e.propuestas = e.propuestas.filter((x) => x !== p);
        if (msg.aceptar) this.intercambiar(p.de, yo);
        return this.cambio();
      }
      case "cancelarCambio":
        e.propuestas = e.propuestas.filter((x) => x.de !== yo);
        return this.cambio();
      case "volverASala":
        return this.volverASala(yo);
      case "cambiarAsiento":
        return this.cambiarAsiento(ws, yo, msg.raza);
      case "empezar":
        return this.empezar(ws, yo);
      case "accion":
        return this.accion(ws, yo, msg.accion);
      case "salir":
        await this.salir(yo);
        ws.close(1000, "salió");
        return;
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.desconexion(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.desconexion(ws);
  }

  private async desconexion(ws: WebSocket) {
    const e = this.estado;
    const yo = (ws.deserializeAttachment() as { jugadorId?: string } | null)?.jugadorId;
    this.cerrados.add(ws);
    if (!e || !yo) return;
    // Puede tener otra pestaña abierta: solo cuenta como desconectado si no queda ninguna.
    if (!this.conectados().has(yo)) e.desconectadoDesde[yo] = Date.now();
    e.actividad = Date.now();
    await this.cambio();
  }

  /* ---------------- Sala de espera ---------------- */

  private async hola(ws: WebSocket, jugadorId: string, nombreCrudo: string) {
    const e = this.estado!;
    const nombre = String(nombreCrudo ?? "").trim().slice(0, 20);
    if (!jugadorId || typeof jugadorId !== "string" || jugadorId.length > 64 || !nombre) {
      return this.error(ws, "invalido", "Falta tu nombre.");
    }
    const existente = e.jugadores.find((j) => j.id === jugadorId);
    if (existente) {
      existente.nombre = nombre;
    } else {
      if (e.partida) return this.cerrarCon(ws, "ya-empezo", "La partida de esta sala ya empezó.");
      if (e.jugadores.length >= MAX_JUGADORES) return this.cerrarCon(ws, "llena", "La sala está llena.");
      e.jugadores.push({ id: jugadorId, nombre });
      // Se sienta solo en el primer asiento libre.
      const libre = ORDEN_RAZAS.find((r) => e.asientos[r].tipo === "libre");
      if (libre) e.asientos[libre] = { tipo: "humano", jugadorId };
    }
    if (!e.anfitrion) e.anfitrion = jugadorId;
    delete e.desconectadoDesde[jugadorId];
    ws.serializeAttachment({ jugadorId });
    await this.cambio();
  }

  private razaDe(jugadorId: string): RazaId | undefined {
    const e = this.estado!;
    return ORDEN_RAZAS.find((r) => {
      const a = e.asientos[r];
      return a.tipo === "humano" && a.jugadorId === jugadorId;
    });
  }

  private soltar(jugadorId: string) {
    const r = this.razaDe(jugadorId);
    if (r) this.estado!.asientos[r] = { tipo: "libre" };
  }

  private async elegirRaza(ws: WebSocket, yo: string, raza: RazaId) {
    const e = this.estado!;
    if (e.partida) return this.error(ws, "ya-empezo", "La partida ya empezó.");
    if (!ORDEN_RAZAS.includes(raza)) return;
    const a = e.asientos[raza];
    if (a.tipo === "humano" && a.jugadorId !== yo) return this.error(ws, "no-permitido", "Ese asiento ya está ocupado.");
    if (a.tipo === "nadie") return this.error(ws, "no-permitido", "El anfitrión cerró ese asiento.");
    this.soltar(yo);
    e.asientos[raza] = { tipo: "humano", jugadorId: yo };
    this.olvidarPropuestas(yo);
    this.desmarcar(yo);
    await this.cambio();
  }

  /** Quien cambia de raza deja de estar "Listo" (puede que aún no lo esté). */
  private desmarcar(...ids: string[]) {
    const e = this.estado!;
    e.listos = e.listos.filter((id) => !ids.includes(id));
  }

  private olvidarPropuestas(...ids: string[]) {
    const e = this.estado!;
    e.propuestas = e.propuestas.filter((p) => !ids.includes(p.de) && !ids.includes(p.a));
  }

  private async proponerCambio(ws: WebSocket, yo: string, raza: RazaId) {
    const e = this.estado!;
    if (e.partida || !ORDEN_RAZAS.includes(raza)) return;
    const a = e.asientos[raza];
    if (a.tipo !== "humano" || a.jugadorId === yo) return this.error(ws, "invalido", "Ese asiento no tiene a otro jugador.");
    const otro = a.jugadorId;
    // Si el otro ya me lo había propuesto, ambos quieren: se cambia directamente.
    if (e.propuestas.some((p) => p.de === otro && p.a === yo)) {
      this.intercambiar(otro, yo);
    } else {
      e.propuestas = [...e.propuestas.filter((p) => p.de !== yo), { de: yo, a: otro }];
    }
    await this.cambio();
  }

  /** `de` se queda la raza de `a`; `a` se queda la de `de` (o ninguna, si `de` no tenía). */
  private intercambiar(de: string, a: string) {
    const e = this.estado!;
    const razaDe = this.razaDe(de);
    const razaA = this.razaDe(a);
    if (!razaA) return;
    e.asientos[razaA] = { tipo: "humano", jugadorId: de };
    if (razaDe) e.asientos[razaDe] = { tipo: "humano", jugadorId: a };
    this.olvidarPropuestas(de, a);
    this.desmarcar(de, a);
  }

  /** Tras la victoria, la sala vuelve a la selección de razas con los mismos jugadores. */
  private async volverASala(yo: string) {
    const e = this.estado!;
    if (!e.partida || e.partida.fase !== "fin" || !e.jugadores.some((j) => j.id === yo)) return;
    e.partida = null;
    e.eventoDesde = null;
    // Los asientos que no jugaron vuelven a estar libres para quien quiera sentarse.
    for (const r of ORDEN_RAZAS) if (e.asientos[r].tipo === "nadie") e.asientos[r] = { tipo: "libre" };
    e.listos = [];
    e.propuestas = [];
    this.cancelarCuenta();
    await this.cambio();
  }

  /**
   * Arranca, acorta o cancela la cuenta regresiva:
   * - todos los presentes listos → cuenta corta (SEGUNDOS_CUENTA);
   * - con más de un jugador en la sala y alguien listo → cuenta de espera (SEGUNDOS_ESPERA),
   *   al final de la cual la partida empieza aunque no todos lo hayan marcado;
   * - nadie listo (o no hay facciones suficientes) → sin cuenta.
   */
  private revisarCuenta() {
    const e = this.estado!;
    const conectados = this.conectados();
    const presentes = e.jugadores.filter((j) => conectados.has(j.id));
    const activos = ORDEN_RAZAS.filter((r) => e.asientos[r].tipo === "humano" || e.asientos[r].tipo === "ia");
    const valida = !e.partida && activos.length >= 2 && presentes.some((j) => this.razaDe(j.id));
    const listos = presentes.filter((j) => e.listos.includes(j.id)).length;
    const ahora = Date.now();
    const arrancar = (segundos: number, corta: boolean) => {
      e.cuentaDesde = ahora;
      e.cuentaFin = ahora + segundos * 1000;
      e.cuentaCorta = corta;
    };
    if (valida && listos > 0 && listos === presentes.length) {
      if (e.cuentaFin == null || e.cuentaFin - ahora > SEGUNDOS_CUENTA * 1000) arrancar(SEGUNDOS_CUENTA, true);
    } else if (valida && listos > 0 && presentes.length > 1) {
      // Si venía la cuenta corta (alguien dejó de estar listo o llegó otro jugador), vuelve la de espera.
      if (e.cuentaFin == null || e.cuentaCorta) arrancar(SEGUNDOS_ESPERA, false);
    } else this.cancelarCuenta();
  }

  private cancelarCuenta() {
    const e = this.estado!;
    e.cuentaDesde = null;
    e.cuentaFin = null;
    e.cuentaCorta = false;
  }

  private finCuenta(): number | null {
    const e = this.estado;
    if (!e || e.cuentaDesde == null) return null;
    // Salas guardadas antes de la cuenta de espera: solo tienen el inicio.
    return (e.cuentaFin ?? e.cuentaDesde + SEGUNDOS_CUENTA * 1000) + MARGEN_CUENTA;
  }

  private async cambiarAsiento(ws: WebSocket, yo: string, raza: RazaId) {
    const e = this.estado!;
    if (e.partida) return;
    if (e.anfitrion !== yo) return this.error(ws, "no-permitido", "Solo el anfitrión puede cambiar los asientos.");
    const a = e.asientos[raza];
    if (!a || a.tipo === "humano") return;
    const siguiente: Record<"libre" | "ia" | "nadie", Asiento> = { libre: { tipo: "ia" }, ia: { tipo: "nadie" }, nadie: { tipo: "libre" } };
    e.asientos[raza] = siguiente[a.tipo];
    // Cambió la mesa: si había cuenta regresiva, vuelve a empezar.
    this.cancelarCuenta();
    await this.cambio();
  }

  private async empezar(ws: WebSocket, yo: string) {
    const e = this.estado!;
    if (e.partida) return;
    if (e.anfitrion !== yo) return this.error(ws, "no-permitido", "Solo el anfitrión puede empezar.");
    if (!this.iniciarPartida()) return this.error(ws, "invalido", "Se necesitan al menos 2 facciones.");
    await this.cambio();
  }

  /** Crea la partida con los asientos actuales. false si no hay facciones suficientes. */
  private iniciarPartida(): boolean {
    const e = this.estado!;
    const activos = ORDEN_RAZAS.filter((r) => e.asientos[r].tipo === "humano" || e.asientos[r].tipo === "ia");
    if (activos.length < 2) return false;
    // Los asientos que nadie tomó no juegan.
    for (const r of ORDEN_RAZAS) if (e.asientos[r].tipo === "libre") e.asientos[r] = { tipo: "nadie" };
    e.partida = motor.crearPartida(activos.map((r) => ({ raza: r, tipo: e.asientos[r].tipo === "humano" ? "humano" : "ia" })));
    e.ultimoCambio = Date.now();
    e.listos = [];
    e.propuestas = [];
    this.cancelarCuenta();
    return true;
  }

  /** Abandona la sala. En plena partida, una máquina toma su lugar. */
  private async salir(yo: string) {
    const e = this.estado!;
    const raza = this.razaDe(yo);
    if (e.partida) {
      if (raza) {
        e.asientos[raza] = { tipo: "ia" };
        e.partida = { ...e.partida, jugadores: e.partida.jugadores.map((j) => (j.raza === raza ? { ...j, tipo: "ia" } : j)) };
      }
    } else {
      this.soltar(yo);
    }
    this.olvidarPropuestas(yo);
    this.desmarcar(yo);
    e.jugadores = e.jugadores.filter((j) => j.id !== yo);
    delete e.desconectadoDesde[yo];
    if (e.anfitrion === yo) e.anfitrion = e.jugadores[0]?.id ?? null;
    await this.cambio();
  }

  /* ---------------- Partida ---------------- */

  /** ¿Quién controla la raza que tiene el turno? (null = una máquina) */
  private controlador(p: Partida): string | null {
    const a = this.estado!.asientos[motor.jugadorActual(p).raza];
    return a.tipo === "humano" ? a.jugadorId : null;
  }

  private async accion(ws: WebSocket, yo: string, accion: AccionJuego) {
    const e = this.estado!;
    const p = e.partida;
    if (!p || p.fase === "fin") return;
    if (this.controlador(p) !== yo) return this.error(ws, "no-permitido", "No es tu turno.");
    const nueva = aplicar(p, accion);
    if (nueva === p) return; // jugada no válida: el motor la ignora
    this.actualizarPartida(nueva);
    await this.cambio();
  }

  private actualizarPartida(nueva: Partida) {
    const e = this.estado!;
    if (nueva.fase === "evento" && e.partida?.fase !== "evento") e.eventoDesde = Date.now();
    if (nueva.fase !== "evento") e.eventoDesde = null;
    e.partida = nueva;
    e.ultimoCambio = Date.now();
  }

  /** Próxima jugada automática: cuándo y cuál (o null si se espera a un jugador). */
  private automatica(): { cuando: number; accion: AccionJuego } | null {
    const e = this.estado!;
    const p = e.partida;
    if (!p || p.fase === "fin") return null;
    const quien = this.controlador(p);
    const ausente = quien !== null && !this.conectados().has(quien);
    const desdeAusencia = quien ? (e.desconectadoDesde[quien] ?? e.ultimoCambio) : e.ultimoCambio;

    if (p.fase === "evento") {
      const espera = quien && !ausente ? EVENTO_HUMANO : EVENTO_MAQUINA;
      return { cuando: (e.eventoDesde ?? e.ultimoCambio) + espera, accion: { tipo: "cerrarEvento" } };
    }
    if (quien && !ausente) return null;
    const accion = elegirAccion(p);
    if (!accion) return null;
    const base = quien ? Math.max(e.ultimoCambio, desdeAusencia) + ESPERA_DESCONECTADO : e.ultimoCambio + RITMO_MAQUINA;
    const extra = quien ? 0 : p.fase === "tirar" ? 0 : 250;
    return { cuando: base + extra, accion };
  }

  async alarm() {
    const e = this.estado;
    if (!e) return;
    const ahora = Date.now();
    if (this.conectados().size === 0 && ahora - e.actividad > CADUCIDAD) {
      await this.ctx.storage.deleteAll();
      this.estado = null;
      return;
    }
    const fin = this.finCuenta();
    if (fin !== null && fin <= ahora + 20) {
      // La cuenta terminó: se abre el Portal (con quien esté sentado, listo o no).
      this.revisarCuenta();
      if (e.cuentaDesde !== null && this.iniciarPartida()) {
        await this.cambio();
        return;
      }
    }
    const auto = this.automatica();
    if (auto && auto.cuando <= ahora + 20) {
      const nueva = aplicar(e.partida!, auto.accion);
      if (nueva !== e.partida) {
        this.actualizarPartida(nueva);
        await this.cambio();
        return;
      }
    }
    await this.programar();
  }

  /** Deja programada la próxima alarma (jugada automática o limpieza). */
  private async programar() {
    const e = this.estado;
    if (!e) return;
    const auto = this.automatica();
    const caduca = e.actividad + CADUCIDAD;
    const proxima = Math.min(auto?.cuando ?? caduca, this.finCuenta() ?? caduca, caduca);
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 10, proxima));
  }

  /* ---------------- Envío ---------------- */

  private conectados(): Set<string> {
    const ids = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) {
      if (this.cerrados.has(ws)) continue;
      const id = (ws.deserializeAttachment() as { jugadorId?: string } | null)?.jugadorId;
      if (id) ids.add(id);
    }
    return ids;
  }

  private vista(): VistaSala {
    const e = this.estado!;
    const conectados = this.conectados();
    return {
      codigo: e.codigo,
      anfitrion: e.anfitrion,
      jugadores: e.jugadores.map((j) => ({ ...j, conectado: conectados.has(j.id) })),
      asientos: e.asientos,
      partida: e.partida,
      listos: e.listos,
      propuestas: e.propuestas,
      cuenta: e.cuentaDesde,
      cuentaRestante: e.cuentaDesde == null ? null : Math.max(0, (this.finCuenta() ?? 0) - MARGEN_CUENTA - Date.now()),
    };
  }

  /** Guarda, avisa a todos y programa lo siguiente. */
  private async cambio() {
    if (this.estado) this.revisarCuenta();
    await this.guardar();
    const msg: MensajeServidor = { t: "sala", sala: this.vista() };
    const texto = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (this.cerrados.has(ws)) continue;
      try {
        ws.send(texto);
      } catch {
        /* conexión cerrándose */
      }
    }
    await this.programar();
  }

  private async guardar() {
    if (this.estado) await this.ctx.storage.put("estado", this.estado);
  }

  private enviar(ws: WebSocket, msg: MensajeServidor) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* conexión cerrándose */
    }
  }

  private error(ws: WebSocket, codigo: CodigoError, mensaje: string) {
    this.enviar(ws, { t: "error", codigo, mensaje });
  }

  private cerrarCon(ws: WebSocket, codigo: CodigoError, mensaje: string) {
    this.error(ws, codigo, mensaje);
    ws.close(4000, codigo);
  }
}

function aplicar(p: Partida, a: AccionJuego): Partida {
  switch (a.tipo) {
    case "tirar":
      return motor.tirar(p);
    case "sacar":
      return motor.sacarFicha(p);
    case "mover":
      return motor.mover(p, a.fichaId, a.opcion);
    case "cerrarEvento":
      return motor.cerrarEvento(p);
  }
}
