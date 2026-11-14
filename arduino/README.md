# Conexión con el hardware

La app (`src/hardware/arduinoConnection.ts`) siempre hace lo mismo: le pregunta
por HTTP a una IP, una vez por segundo, "¿ya hay ganador?" (`GET /estado`).
No le importa qué hay detrás de esa IP — por eso hay dos caminos posibles,
según el hardware que tengas:

## Camino A — ESP32 (WiFi directo)
Archivo: `reino_noche_eterna_esp32.ino`

El ESP32 tiene WiFi propio, así que corre el servidor `/estado` él mismo.
En la app, "IP del Arduino" = la IP que el ESP32 imprime por Serial al
conectarse (ej. `192.168.1.42`).

## Camino B — Arduino Uno (sin WiFi) + laptop puente
Archivos: `reino_noche_eterna_uno.ino` + carpeta `/arduino-bridge`

El Uno no tiene WiFi, así que:
1. Se conecta por cable USB a una laptop.
2. La laptop corre `/arduino-bridge` (ver el README de esa carpeta), que
   lee el Arduino por USB y expone `/estado` en la red WiFi.
3. En la app, "IP del Arduino" = la IP de la LAPTOP + el puerto, ej.
   `192.168.1.50:3000` (el `servidor.js` te la imprime al arrancar).

La laptop y el celular deben estar en la misma red WiFi. En ambos caminos,
la regla de "solo gana si las 4 fichas de UNA MISMA raza llegan a la meta"
vive en el firmware del Arduino/ESP32, agrupando los sensores por raza —
nunca se mezclan razas distintas.
