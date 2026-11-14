const { SerialPort, ReadlineParser } = require("serialport");
const http = require("http");
const os = require("os");

// ⚠️ CAMBIA ESTO por el puerto de tu Arduino.
// Para saberlo, corre primero: node listar-puertos.js
//   Windows → algo como "COM3", "COM5"...
//   Mac/Linux → algo como "/dev/tty.usbmodem14101"
const PUERTO_ARDUINO = "COM6";
const VELOCIDAD = 9600; // debe ser igual al Serial.begin(...) del Arduino

const PUERTO_HTTP = 3000;

let ganadorActual = null; // null = nadie ha ganado todavía

// --- Conexión con el Arduino ---
const puertoSerial = new SerialPort({ path: PUERTO_ARDUINO, baudRate: VELOCIDAD });
const parser = puertoSerial.pipe(new ReadlineParser({ delimiter: "\n" }));

parser.on("data", (linea) => {
  linea = linea.trim();
  console.log("Arduino dice:", linea);
  if (linea.startsWith("GANADOR:")) {
    const raza = linea.replace("GANADOR:", "").trim();
    ganadorActual = raza === "ninguno" ? null : raza;
  }
});

puertoSerial.on("error", (err) => {
  console.error("\n❌ No se pudo abrir el puerto serie:", err.message);
  console.error(`   Revisa que PUERTO_ARDUINO ("${PUERTO_ARDUINO}") sea correcto — corre "node listar-puertos.js" para verlo.\n`);
});

// --- Servidor HTTP que la app consulta (igual que /estado del ESP32) ---
const servidor = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // Respuesta a la "pregunta previa" (preflight) que hace el navegador
  // cuando la app envía el encabezado de ngrok.
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.url === "/estado") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ganador: ganadorActual }));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

servidor.listen(PUERTO_HTTP, () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);

  console.log(`\n✅ Servidor puente corriendo en el puerto ${PUERTO_HTTP}`);
  console.log("   En la app, en 'IP del Arduino', usa:");
  ips.forEach((ip) => console.log(`     ${ip}:${PUERTO_HTTP}`));
  console.log("   (la laptop y el celular deben estar en la misma red WiFi)\n");
});