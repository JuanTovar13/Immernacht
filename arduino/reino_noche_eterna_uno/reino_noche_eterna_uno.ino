/*
 * El Reino de la Noche Eterna — firmware para ARDUINO UNO (sin WiFi)
 * =====================================================================
 *
 * El Uno no tiene WiFi, así que no puede hablar directo con el celular.
 * En su lugar, se conecta por CABLE USB a una laptop, y la laptop corre
 * un pequeño programa "puente" (ver la carpeta /arduino-bridge) que:
 *   1. Lee lo que el Arduino manda por el Puerto Serie (este cable USB).
 *   2. Lo publica en la red WiFi para que el celular pregunte por HTTP —
 *      exactamente como ya hacía la app (src/hardware/arduinoConnection.ts
 *      no cambia nada, solo apunta a la IP de la laptop en vez de un ESP32).
 *
 * MISMA REGLA QUE ANTES:
 * Los 16 sensores están agrupados por raza (4 por raza). Solo se reporta
 * un ganador cuando las 4 fichas de LA MISMA raza están en su meta al
 * mismo tiempo — nunca se mezclan sensores de razas distintas.
 *
 * CONEXIONES:
 * Cada sensor va entre su pin y GND (usamos INPUT_PULLUP):
 *   - Sin ficha → el pin lee HIGH
 *   - Con ficha → el reed switch cierra el circuito → el pin lee LOW
 *
 * IMPORTANTE: los pines 0 y 1 del Uno se usan para el Puerto Serie (USB) —
 * por eso los sensores empiezan en el pin 2, no en el 0.
 */

const int PINES_HUMANOS[4]   = {2, 3, 4, 5};
const int PINES_ELFOS[4]     = {6, 7, 8, 9};
const int PINES_ENANOS[4]    = {10, 11, 12, 13};
const int PINES_NOMUERTOS[4] = {A0, A1, A2, A3};

struct GrupoRaza {
  const char* id; // debe coincidir EXACTO con los ids de src/game/types.ts
  const int* pines;
};

GrupoRaza grupos[4] = {
  { "humanos",   PINES_HUMANOS },
  { "elfos",     PINES_ELFOS },
  { "enanos",    PINES_ENANOS },
  { "nomuertos", PINES_NOMUERTOS },
};

String ganadorAnterior = ""; // para no repetir el mismo mensaje en cada vuelta del loop

/** true solo si las 4 fichas de ESTE grupo están en su meta al mismo tiempo. */
bool grupoCompleto(const int* pines) {
  for (int i = 0; i < 4; i++) {
    if (digitalRead(pines[i]) == HIGH) return false; // falta al menos una ficha de este equipo
  }
  return true;
}

/** Revisa los 4 grupos POR SEPARADO — nunca mezcla razas distintas. */
String calcularGanador() {
  for (int g = 0; g < 4; g++) {
    if (grupoCompleto(grupos[g].pines)) return grupos[g].id;
  }
  return "ninguno";
}

void setup() {
  Serial.begin(9600);
  for (int g = 0; g < 4; g++) {
    for (int i = 0; i < 4; i++) {
      pinMode(grupos[g].pines[i], INPUT_PULLUP);
    }
  }
}

void loop() {
  String ganador = calcularGanador();
  // Solo imprime cuando el resultado CAMBIA, no en cada vuelta del loop.
  if (ganador != ganadorAnterior) {
    Serial.println("GANADOR:" + ganador);
    ganadorAnterior = ganador;
  }
  delay(100); // pequeño respiro también sirve como debounce por software
}
