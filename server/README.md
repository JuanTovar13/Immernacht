# Servidor en línea de Immernacht

Servidor de salas privadas en Cloudflare Workers + Durable Objects. Cada sala es un
Durable Object que guarda la partida y usa el mismo motor de reglas de la app
(`src/game/digital/engine.ts`) y el mismo bot (`src/game/digital/bot.ts`): el servidor
tira los dados, valida cada jugada y juega los turnos de las máquinas y de los
jugadores desconectados.

## Probar en local

```bash
cd server
npm install
npm run dev          # http://localhost:8787
```

En otra terminal, en la raíz del proyecto, `npm run dev`. La app usa
`http://localhost:8787` si no se configura otra dirección.

## Publicar

1. Crear una cuenta gratis en Cloudflare.
2. En `server/`: `npx wrangler login` (abre el navegador para iniciar sesión) y luego `npm run deploy`.
3. Wrangler muestra la dirección del servidor, algo como `https://immernacht-online.<tu-subdominio>.workers.dev`.
4. En Vercel → Settings → Environment Variables, agregar `VITE_SERVIDOR_ONLINE` con esa dirección
   y volver a desplegar la app.

## Cómo funciona

- `POST /api/salas` crea una sala y devuelve un código de 4 letras.
- `GET /api/salas/:codigo/ws` abre el WebSocket con la sala.
- Los mensajes están en `src/game/online/protocolo.ts` (compartido con la app).
- Las salas sin nadie conectado se borran solas a las 24 h.

## Tiempos (en `src/sala.ts`)

| Constante | Valor | Para qué |
|---|---|---|
| `RITMO_MAQUINA` | 0.9 s | Pausa entre jugadas de las máquinas |
| `ESPERA_DESCONECTADO` | 10 s | Si un jugador se desconecta en su turno, una máquina juega por él |
| `EVENTO_HUMANO` | 30 s | El evento se cierra solo si quien tiene el turno no pulsa Continuar |
| `EVENTO_MAQUINA` | 9 s | Tiempo de lectura de los eventos de las máquinas |
