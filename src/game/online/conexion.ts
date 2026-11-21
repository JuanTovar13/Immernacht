/* ============================================================
   Conexión con el servidor de salas en línea.
   Mantiene el WebSocket, se reconecta solo y pasa la partida
   que manda el servidor a la pantalla de juego digital.
   ============================================================ */
import { create } from "zustand";
import type { RazaId } from "../types";
import { useDigitalStore } from "../digital/store";
import { useGameStore } from "../store";
import { audioManager } from "../../audio/audioManager";
import type { AccionJuego, MensajeCliente, MensajeServidor, VistaSala } from "./protocolo";

/** Servidor publicado en Cloudflare (ver server/README.md). */
const SERVIDOR_PUBLICADO = "https://immernacht-online.immernacht.workers.dev";

/**
 * Dirección del servidor: en desarrollo el local (`npm run dev` en server/), en la app
 * publicada el de Cloudflare. Se puede cambiar con la variable VITE_SERVIDOR_ONLINE.
 */
export const SERVIDOR =
  (import.meta.env.VITE_SERVIDOR_ONLINE as string | undefined)?.replace(/\/$/, "") ??
  (import.meta.env.DEV ? "http://localhost:8787" : SERVIDOR_PUBLICADO);

const CLAVE_ID = "immernacht-jugador-id";
const CLAVE_NOMBRE = "immernacht-nombre";
const CLAVE_SALA = "immernacht-sala";

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: se juega igual, pero sin poder reconectar tras recargar */
  }
}

/** Identificador estable de este dispositivo (para volver a tu asiento si te desconectas). */
function miId(): string {
  let id = leer(CLAVE_ID);
  if (!id) {
    id = crypto.randomUUID();
    escribir(CLAVE_ID, id);
  }
  return id;
}

export type EstadoConexion = "desconectado" | "conectando" | "conectado" | "reconectando";

interface OnlineState {
  conexion: EstadoConexion;
  sala: VistaSala | null;
  error: string | null;
  jugadorId: string;
  nombre: string;
  /** Sala a la que volver tras recargar la página. */
  salaGuardada: string | null;
  setNombre: (n: string) => void;
  crearSala: () => Promise<void>;
  unirse: (codigo: string) => void;
  enviar: (m: MensajeCliente) => void;
  salir: () => void;
  limpiarError: () => void;
}

let ws: WebSocket | null = null;
let intentos = 0;
let reintento: ReturnType<typeof setTimeout> | null = null;
/** false cuando el jugador salió a propósito (no reconectar). */
let quiereConexion = false;

export const useOnline = create<OnlineState>((set, get) => {
  const conectar = (codigo: string) => {
    if (reintento) clearTimeout(reintento);
    ws?.close();
    quiereConexion = true;
    const url = `${SERVIDOR.replace(/^http/, "ws")}/api/salas/${codigo}/ws`;
    set({ conexion: intentos ? "reconectando" : "conectando", error: null });
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      intentos = 0;
      set({ conexion: "conectado" });
      escribir(CLAVE_SALA, codigo);
      set({ salaGuardada: codigo });
      enviarCrudo({ t: "hola", jugadorId: get().jugadorId, nombre: get().nombre || "Jugador" });
    };

    socket.onmessage = (ev) => {
      let msg: MensajeServidor;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.t === "sala") {
        // Empezó una partida nueva mientras este jugador seguía en la pantalla de victoria.
        const app = useGameStore.getState();
        if (msg.sala.partida && msg.sala.partida.fase !== "fin" && (get().sala?.partida?.fase ?? "fin") === "fin" && app.estado === "final" && app.origenFinal === "online") {
          audioManager.detenerMusica();
          audioManager.detenerNarracion();
          app.irA("digital");
        }
        set({ sala: msg.sala });
        sincronizarPartida(msg.sala, get().jugadorId);
      } else if (msg.t === "error") {
        set({ error: msg.mensaje });
        // Errores que impiden entrar: no seguir intentando.
        if (msg.codigo === "no-existe" || msg.codigo === "llena" || msg.codigo === "ya-empezo") {
          quiereConexion = false;
          escribir(CLAVE_SALA, null);
          set({ salaGuardada: null, sala: null });
        }
      }
    };

    socket.onclose = () => {
      if (ws !== socket) return;
      ws = null;
      if (!quiereConexion) {
        set({ conexion: "desconectado" });
        return;
      }
      // Reintenta con esperas cada vez más largas (máx. 8 s).
      intentos++;
      set({ conexion: "reconectando" });
      reintento = setTimeout(() => conectar(codigo), Math.min(8000, 500 * 2 ** Math.min(intentos, 4)));
    };
  };

  const enviarCrudo = (m: MensajeCliente) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };

  return {
    conexion: "desconectado",
    sala: null,
    error: null,
    jugadorId: miId(),
    nombre: leer(CLAVE_NOMBRE) ?? "",
    salaGuardada: leer(CLAVE_SALA),
    setNombre: (n) => {
      escribir(CLAVE_NOMBRE, n);
      set({ nombre: n });
    },
    crearSala: async () => {
      set({ conexion: "conectando", error: null });
      try {
        const r = await fetch(`${SERVIDOR}/api/salas`, { method: "POST" });
        const datos = (await r.json()) as { codigo?: string; error?: string };
        if (!r.ok || !datos.codigo) throw new Error(datos.error ?? "No se pudo crear la sala.");
        intentos = 0;
        conectar(datos.codigo);
      } catch (e) {
        set({ conexion: "desconectado", error: e instanceof Error && e.message !== "Failed to fetch" ? e.message : "No se pudo conectar con el servidor." });
      }
    },
    unirse: (codigo) => {
      intentos = 0;
      conectar(codigo.toUpperCase());
    },
    enviar: enviarCrudo,
    salir: () => {
      enviarCrudo({ t: "salir" });
      quiereConexion = false;
      if (reintento) clearTimeout(reintento);
      const s = ws;
      ws = null;
      // Deja que el mensaje salga antes de cerrar.
      setTimeout(() => s?.close(), 150);
      escribir(CLAVE_SALA, null);
      set({ sala: null, conexion: "desconectado", salaGuardada: null });
      useDigitalStore.getState().salirDeOnline();
    },
    limpiarError: () => set({ error: null }),
  };
});

/** Lleva la partida del servidor a la pantalla de juego, marcando qué razas son mías. */
function sincronizarPartida(sala: VistaSala, yo: string) {
  if (!sala.partida) return;
  const misRazas = (Object.keys(sala.asientos) as RazaId[]).filter((r) => {
    const a = sala.asientos[r];
    return a.tipo === "humano" && a.jugadorId === yo;
  });
  const nombres: Partial<Record<RazaId, string>> = {};
  for (const r of Object.keys(sala.asientos) as RazaId[]) {
    const a = sala.asientos[r];
    if (a.tipo === "humano") {
      const j = sala.jugadores.find((x) => x.id === a.jugadorId);
      nombres[r] = j ? `${j.nombre}${j.conectado ? "" : " (desconectado)"}` : "Jugador";
    }
  }
  useDigitalStore.getState().recibirOnline(sala.partida, misRazas, nombres, (a: AccionJuego) =>
    useOnline.getState().enviar({ t: "accion", accion: a })
  );
}
