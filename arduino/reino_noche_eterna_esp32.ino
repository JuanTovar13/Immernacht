/*
 * El Reino de la Noche Eterna — firmware del tablero (ESP32)
 * =============================================================
 *
 * QUÉ HACE:
 * Cada una de las 4 razas tiene su propia meta con 4 casillas (una por
 * ficha). En cada casilla hay un sensor magnético (reed switch) que se
 * cierra cuando la ficha (con un imán) está puesta ahí.
 *
 * REGLA IMPORTANTE (la razón de este diseño):
 * Los sensores están agrupados POR RAZA. Solo se declara ganador cuando
 * las 4 casillas de LA MISMA raza están activas al mismo tiempo. Nunca se
 * suman imanes de razas distintas — 2 fichas de Elfos + 2 de Humanos en
 * sus metas NO activa ninguna victoria, porque cada grupo se revisa por
 * separado y ninguno de los dos llega a 4.
 *
 * CÓMO SE COMUNICA CON LA APP:
 * El ESP32 crea un servidor HTTP simple en la red WiFi. La app del
 * celular le pregunta cada 1 segundo "/estado" y el ESP32 responde con
 * la raza ganadora (o null si nadie ha ganado todavía). No hace falta
 * ninguna librería externa — todo viene incluido en el core de ESP32.
 *
 * CONEXIONES:
 * Cada sensor va entre su pin y GND. Usamos INPUT_PULLUP, así que:
 *   - Sin ficha  → el pin lee HIGH (circuito abierto)
 *   - Con ficha  → el reed switch cierra el circuito → el pin lee LOW
 * Ajusta los números de pin de abajo a los que uses realmente en tu
 * cableado (estos son solo un ejemplo de placas ESP32 comunes).
 */

#include <WiFi.h>
#include <WebServer.h>

// ------------------- CONFIGURA TU WIFI AQUÍ -------------------
const char* ssid     = "TU_RED_WIFI";
const char* password = "TU_CONTRASENA";
// ----------------------------------------------------------------

WebServer server(80);

// 4 pines por raza — uno por cada una de sus 4 fichas en la meta.
const int PINES_HUMANOS[4]   = {2, 4, 5, 18};
const int PINES_ELFOS[4]     = {19, 21, 22, 23};
const int PINES_ENANOS[4]    = {13, 12, 14, 27};
const int PINES_NOMUERTOS[4] = {26, 25, 33, 32};

struct GrupoRaza {
  const char* id;     // debe coincidir EXACTO con los ids de src/game/types.ts
  const int* pines;
};

GrupoRaza grupos[4] = {
  { "humanos",   PINES_HUMANOS },
  { "elfos",     PINES_ELFOS },
  { "enanos",    PINES_ENANOS },
  { "nomuertos", PINES_NOMUERTOS },
};

String ganadorActual = ""; // "" = nadie ha ganado todavía

/** true solo si las 4 fichas de ESTE grupo están en su meta al mismo tiempo. */
bool grupoCompleto(const int* pines) {
  for (int i = 0; i < 4; i++) {
    if (digitalRead(pines[i]) == HIGH) return false; // falta al menos una ficha de este equipo
  }
  return true;
}

/** Revisa los 4 grupos POR SEPARADO. Nunca mezcla sensores de razas distintas. */
void revisarGanador() {
  for (int g = 0; g < 4; g++) {
    if (grupoCompleto(grupos[g].pines)) {
      ganadorActual = grupos[g].id;
      return;
    }
  }
  ganadorActual = "";
}

void manejarEstado() {
  // Access-Control-Allow-Origin es necesario porque la app y el ESP32
  // corren en "orígenes" distintos — sin esto el navegador bloquea la
  // respuesta aunque la petición sí llegue.
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String json = "{\"ganador\":";
  json += (ganadorActual == "") ? "null" : ("\"" + ganadorActual + "\"");
  json += "}";
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);

  for (int g = 0; g < 4; g++) {
    for (int i = 0; i < 4; i++) {
      pinMode(grupos[g].pines[i], INPUT_PULLUP);
    }
  }

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Conectado. IP del tablero: ");
  Serial.println(WiFi.localIP());
  Serial.println("↑ Copia esta IP en la app (pantalla de Partida, campo 'IP del Arduino').");

  server.on("/estado", manejarEstado);
  server.begin();
}

void loop() {
  revisarGanador();
  server.handleClient();
  delay(50); // pequeño respiro también sirve como debounce por software
}
