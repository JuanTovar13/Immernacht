# Puente Arduino Uno ↔ App

Este es un programa aparte que corre en tu LAPTOP (no en el celular ni en
el Arduino). Traduce entre el cable USB del Arduino y el WiFi del celular.

## Instalación (una sola vez)

1. Necesitas [Node.js](https://nodejs.org) instalado en la laptop.
2. Abre una terminal DENTRO de esta carpeta (`arduino-bridge`) y corre:
   ```
   npm install
   ```

## Uso, cada vez que vayan a jugar

1. Conecta el Arduino Uno a la laptop por USB.
2. Sube el sketch `../arduino/reino_noche_eterna_uno.ino` al Arduino desde
   el IDE de Arduino (Sketch → Subir), y luego CIERRA el Monitor Serial del
   IDE si lo abriste — solo un programa a la vez puede usar el puerto.
3. Averigua el nombre del puerto:
   ```
   node listar-puertos.js
   ```
   Busca el que diga "Arduino" o "CH340" en el fabricante (ej. `COM3` en
   Windows, o `/dev/tty.usbmodem14101` en Mac).
4. Abre `servidor.js` y cambia la línea `const PUERTO_ARDUINO = "COM3";`
   por el puerto real que viste en el paso anterior.
5. Corre el servidor:
   ```
   npm start
   ```
   Va a imprimir algo como:
   ```
   ✅ Servidor puente corriendo en el puerto 3000
      En la app, en 'IP del Arduino', usa:
        192.168.1.50:3000
   ```
6. En el celular, en la pantalla de Partida, escribe esa IP (con el
   `:3000` incluido) en el campo "IP (o IP:puerto)" y toca "Conectar".

La laptop y el celular deben estar conectados a la misma red WiFi. Deja
la terminal con `npm start` abierta durante toda la partida.
