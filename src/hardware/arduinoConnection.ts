import { useGameStore } from "../game/store";
import { RAZAS, type RazaId } from "../game/types";

let intervaloId: number | null = null;

interface RespuestaEstado {
  ganador: RazaId | null;
}

/** Acepta "192.168.1.5:3000", "http://..." o una URL de ngrok (con o sin https://). */
function construirUrl(entrada: string): string {
  let base = entrada.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    // Sin protocolo: los dominios de ngrok son siempre https; una IP local, http.
    base = (base.includes("ngrok") ? "https://" : "http://") + base;
  }
  return `${base}/estado`;
}

export const arduinoConnection = {
  /** Empieza a preguntarle al Arduino, cada 1s, si alguna raza ya ganó.
   *  ip: la IP local del Arduino en la red WiFi (ej. "192.168.1.42"),
   *  la misma que el Arduino imprime por Serial al conectarse. */
  iniciar(ip: string) {
    this.detener();
    console.log("Valor recibido:", JSON.stringify(ip))
    const url = construirUrl(ip);
    // ngrok (plan gratis) muestra una página de aviso a los navegadores; este
    // encabezado se la salta. Solo se envía a ngrok para no complicar la red local.
    const headers: Record<string, string> = url.includes("ngrok")
      ? { "ngrok-skip-browser-warning": "1" }
      : {};
    intervaloId = window.setInterval(async () => {
      try {
        const res = await fetch(url, { cache: "no-store", headers });
        const data: RespuestaEstado = await res.json();
        if (data.ganador) {
          arduinoConnection.detener();
          // Solo se acepta una raza válida; cualquier otro texto → ganador desconocido.
          const raza = data.ganador in RAZAS ? data.ganador : undefined;
          useGameStore.getState().partidaTerminada(raza);
        }
      } catch {
        // El Arduino no respondió esta vez (apagado, cambiando de red, etc.)
        // — no es un error grave, se reintenta solo en el siguiente segundo.
      }
    }, 1000);
  },

  detener() {
    if (intervaloId !== null) {
      clearInterval(intervaloId);
      intervaloId = null;
    }
  },
};