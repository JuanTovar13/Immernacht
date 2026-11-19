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
import type { AccionJuego, Asiento, CodigoError, MensajeCliente, MensajeServidor, VistaSala } from "../../src/game/online/protocolo";
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
}

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
      this.estado = (await ctx.storage.get<EstadoSala>("estado")) ?? null;
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
        return this.cambio();
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
    await this.cambio();
  }

  private async cambiarAsiento(ws: WebSocket, yo: string, raza: RazaId) {
    const e = this.estado!;
    if (e.partida) return;
    if (e.anfitrion !== yo) return this.error(ws, "no-permitido", "Solo el anfitrión puede cambiar los asientos.");
    const a = e.asientos[raza];
    if (!a || a.tipo === "humano") return;
    const siguiente: Record<"libre" | "ia" | "nadie", Asiento> = { libre: { tipo: "ia" }, ia: { tipo: "nadie" }, nadie: { tipo: "libre" } };
    e.asientos[raza] = siguiente[a.tipo];
    await this.cambio();
  }

  private async empezar(ws: WebSocket, yo: string) {
    const e = this.estado!;
    if (e.partida) return;
    if (e.anfitrion !== yo) return this.error(ws, "no-permitido", "Solo el anfitrión puede empezar.");
    const activos = ORDEN_RAZAS.filter((r) => e.asientos[r].tipo === "humano" || e.asientos[r].tipo === "ia");
    if (activos.length < 2) return this.error(ws, "invalido", "Se necesitan al menos 2 facciones.");
    // Los asientos que nadie tomó no juegan.
    for (const r of ORDEN_RAZAS) if (e.asientos[r].tipo === "libre") e.asientos[r] = { tipo: "nadie" };
    e.partida = motor.crearPartida(activos.map((r) => ({ raza: r, tipo: e.asientos[r].tipo === "humano" ? "humano" : "ia" })));
    e.ultimoCambio = Date.now();
    await this.cambio();
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
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 10, Math.min(auto?.cuando ?? caduca, caduca)));
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
    };
  }

  /** Guarda, avisa a todos y programa lo siguiente. */
  private async cambio() {
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
