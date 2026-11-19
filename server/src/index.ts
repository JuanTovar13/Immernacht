/* ============================================================
   Servidor de Immernacht en línea (Cloudflare Worker).
   POST /api/salas              → crea una sala privada y devuelve su código
   GET  /api/salas/:codigo/ws   → conexión WebSocket con la sala
   ============================================================ */
import { ALFABETO_CODIGO, LARGO_CODIGO, codigoValido } from "../../src/game/online/protocolo";
import type { Env } from "./sala";

export { Sala } from "./sala";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(datos: unknown, status = 200) {
  return new Response(JSON.stringify(datos), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

function codigoAlAzar(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO));
  return [...bytes].map((b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    if (url.pathname === "/api/salas" && req.method === "POST") {
      // Prueba códigos hasta dar con uno libre.
      for (let intento = 0; intento < 8; intento++) {
        const codigo = codigoAlAzar();
        const sala = env.SALAS.get(env.SALAS.idFromName(codigo));
        const r = await sala.fetch("https://sala/crear", { method: "POST", body: codigo });
        if (r.ok) return json({ codigo });
      }
      return json({ error: "No se pudo crear la sala, intenta de nuevo." }, 503);
    }

    const m = url.pathname.match(/^\/api\/salas\/([A-Za-z]+)\/ws$/);
    if (m) {
      const codigo = m[1].toUpperCase();
      if (!codigoValido(codigo)) return json({ error: "Código no válido." }, 400);
      return env.SALAS.get(env.SALAS.idFromName(codigo)).fetch(req);
    }

    if (url.pathname === "/") return new Response("Immernacht en línea", { headers: CORS });
    return json({ error: "No encontrado." }, 404);
  },
};
