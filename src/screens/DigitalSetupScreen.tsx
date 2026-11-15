import { motion } from "framer-motion";
import { useState } from "react";
import { StarField } from "../components/StarField";
import { RAZAS, ORDEN_RAZAS, type RazaId } from "../game/types";
import { useGameStore } from "../game/store";
import { useDigitalStore } from "../game/digital/store";
import { COLOR_TABLERO } from "../game/digital/board";
import type { TipoJugador } from "../game/digital/engine";
import { audioManager } from "../audio/audioManager";

type Asiento = TipoJugador | "nadie";

const ETIQUETA: Record<Asiento, string> = { humano: "Jugador", ia: "Máquina", nadie: "No juega" };
const SIGUIENTE: Record<Asiento, Asiento> = { humano: "ia", ia: "nadie", nadie: "humano" };

export function DigitalSetupScreen() {
  const irA = useGameStore((s) => s.irA);
  const iniciar = useDigitalStore((s) => s.iniciar);
  const [asientos, setAsientos] = useState<Record<RazaId, Asiento>>({
    humanos: "humano",
    elfos: "humano",
    enanos: "ia",
    nomuertos: "ia",
  });

  const activos = ORDEN_RAZAS.filter((r) => asientos[r] !== "nadie");
  const valido = activos.length >= 2;

  const cambiar = (r: RazaId) => {
    audioManager.playSfxBoton();
    setAsientos((a) => ({ ...a, [r]: SIGUIENTE[a[r]] }));
  };

  const comenzar = () => {
    if (!valido) return;
    audioManager.playSfxBoton();
    iniciar(activos.map((r) => ({ raza: r, tipo: asientos[r] as TipoJugador })));
    irA("digital");
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(130% 90% at 50% 20%, #241a3c 0%, var(--color-void) 55%, var(--color-void-deep) 100%)" }}
      />
      <StarField count={40} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.75)" }} />

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-7 px-5 py-10">
          <div className="text-center">
            <h2 className="font-display text-xl tracking-wide text-[color:var(--color-parchment)]">Versión digital</h2>
            <p className="mx-auto mt-2 max-w-xs text-xs text-[color:var(--color-muted)] sm:text-sm">
              Elige quién controla cada facción. Toca una facción para cambiarla. Se necesitan al menos 2.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            {ORDEN_RAZAS.map((r, i) => {
              const a = asientos[r];
              const color = COLOR_TABLERO[r].base;
              return (
                <motion.button
                  key={r}
                  onClick={() => cambiar(r)}
                  className="flex flex-col items-center gap-2 rounded-md border px-3 py-4"
                  style={{
                    borderColor: a === "nadie" ? "rgba(255,255,255,0.1)" : `color-mix(in srgb, ${color} 70%, transparent)`,
                    background:
                      a === "nadie"
                        ? "rgba(255,255,255,0.02)"
                        : `linear-gradient(180deg, color-mix(in srgb, ${color} 22%, transparent), rgba(5,7,15,0.4))`,
                    opacity: a === "nadie" ? 0.45 : 1,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: a === "nadie" ? 0.45 : 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <img src={RAZAS[r].logo} alt="" className="h-14 w-14 object-contain" />
                  <span className="font-display text-sm tracking-wide" style={{ color }}>
                    {RAZAS[r].nombre}
                  </span>
                  <span
                    className="rounded-full border px-3 py-0.5 text-[11px]"
                    style={{ borderColor: "rgba(255,255,255,0.18)", color: "var(--color-parchment-dim)" }}
                  >
                    {a === "ia" ? "🤖 " : a === "humano" ? "👤 " : ""}
                    {ETIQUETA[a]}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <p className="max-w-sm text-center text-[11px] leading-relaxed text-[color:var(--color-muted)]">
            Se juega en un solo dispositivo: pásenlo de mano en mano en cada turno. Quién empieza se elige al azar.
          </p>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <motion.button
              onClick={comenzar}
              disabled={!valido}
              className="rounded-sm border px-6 py-3 font-display text-sm tracking-wide disabled:opacity-40"
              style={{
                borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 70%, transparent)",
                color: "var(--color-eclipse-gold)",
                background: "linear-gradient(180deg, rgba(232,196,104,0.12) 0%, rgba(232,196,104,0.03) 100%)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              Abrir el Portal
            </motion.button>
            <button
              onClick={() => {
                audioManager.playSfxBoton();
                irA("preparacion");
              }}
              className="py-2 text-xs text-[color:var(--color-muted)]"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
