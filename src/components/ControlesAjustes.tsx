import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { audioManager } from "../audio/audioManager";
import { MODOS_EVENTOS, useAjustes, type ModoEventos } from "../game/ajustes";

/* ---------------- Íconos ---------------- */

function IconoParlante({ silenciado }: { silenciado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" fillOpacity={0.25} />
      {silenciado ? (
        <path d="M17 9l5 6M22 9l-5 6" />
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}

function IconoEngranaje() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function IconoLibro() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="currentColor" fillOpacity={0.15} />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
      <path d="M9 7.5h7M9 11h5" />
    </svg>
  );
}

function IconoModo({ modo }: { modo: ModoEventos }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" aria-hidden>
      {modo === "normal" && <path d="M7 5h3v14H7zM14 5h3v14h-3z" opacity={0.9} />}
      {modo === "auto" && <path d="M7 4l12 8-12 8z" />}
      {modo === "saltar" && <path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" />}
    </svg>
  );
}

const ETIQUETA_MODO: Record<ModoEventos, string> = { normal: "Normal", auto: "Auto", saltar: "Rápido" };

/* ---------------- Botones ---------------- */

/** Botones de 36 px en el celular y de 44 px en pantallas grandes. */
const estiloBoton =
  "flex h-9 sm:h-11 items-center justify-center gap-1.5 rounded-sm border border-white/15 bg-black/30 text-[color:var(--color-parchment-dim)] backdrop-blur-sm transition-colors hover:text-[color:var(--color-parchment)]";

/** Silencia o reactiva toda la aplicación. */
export function BotonSilencio() {
  const silenciado = useAjustes((s) => s.silenciado);
  const toggle = useAjustes((s) => s.toggleSilencio);
  return (
    <button
      onClick={() => {
        if (silenciado) {
          toggle();
          audioManager.playSfxBoton();
        } else toggle();
      }}
      className={`${estiloBoton} w-9 sm:w-11`}
      style={silenciado ? { color: "#f07d91", borderColor: "rgba(240,125,145,0.5)" } : undefined}
      aria-label={silenciado ? "Activar sonido" : "Silenciar todo"}
      title={silenciado ? "Activar sonido" : "Silenciar todo"}
    >
      <IconoParlante silenciado={silenciado} />
    </button>
  );
}

/** Abre el panel de ajustes (volúmenes y modo de eventos). */
export function BotonAjustes() {
  const abrir = useAjustes((s) => s.abrirPanel);
  return (
    <button
      onClick={() => {
        audioManager.playSfxBoton();
        abrir(true);
      }}
      className={`${estiloBoton} w-9 sm:w-11`}
      aria-label="Ajustes"
      title="Ajustes"
    >
      <IconoEngranaje />
    </button>
  );
}

/** Abre la ventana con las reglas del juego. */
export function BotonReglas() {
  const abrir = useAjustes((s) => s.abrirReglas);
  return (
    <button
      onClick={() => {
        audioManager.playSfxBoton();
        abrir(true);
      }}
      className={`${estiloBoton} w-9 sm:w-11`}
      aria-label="Reglas"
      title="Reglas"
    >
      <IconoLibro />
    </button>
  );
}

/** Cambia el modo de los eventos: Normal → Auto → Rápido. */
export function BotonModo() {
  const modo = useAjustes((s) => s.modoEventos);
  const siguiente = useAjustes((s) => s.siguienteModo);
  const info = MODOS_EVENTOS.find((m) => m.id === modo)!;
  return (
    <button
      onClick={() => {
        audioManager.playSfxBoton();
        siguiente();
      }}
      className={`${estiloBoton} px-2.5 font-display text-[11px] tracking-wide sm:px-4 sm:text-sm`}
      style={modo !== "normal" ? { color: "var(--color-eclipse-gold)", borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 50%, transparent)" } : undefined}
      aria-label={`Modo de eventos: ${info.nombre}. ${info.detalle} Toca para cambiar.`}
      title={`Eventos: ${info.nombre} — ${info.detalle}`}
    >
      <IconoModo modo={modo} />
      {ETIQUETA_MODO[modo]}
    </button>
  );
}

/** Controles fijos en la esquina superior derecha, iguales en todas las pantallas. */
export function ControlesFlotantes({ conModo, conReglas = true }: { conModo: boolean; conReglas?: boolean }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-40 flex sm:right-5 sm:top-5">
      <div className="pointer-events-auto flex gap-1.5 sm:gap-2">
        {conModo && <BotonModo />}
        {conReglas && <BotonReglas />}
        <BotonSilencio />
        <BotonAjustes />
      </div>
    </div>
  );
}

/* ---------------- Panel de ajustes ---------------- */

function Deslizador({ etiqueta, valor, onChange, onSoltar }: { etiqueta: string; valor: number; onChange: (v: number) => void; onSoltar?: () => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-xs text-[color:var(--color-parchment-dim)]">
        <span>{etiqueta}</span>
        <span className="tabular-nums text-[color:var(--color-muted)]">{Math.round(valor * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(valor * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onSoltar}
        onKeyUp={onSoltar}
        className="w-full accent-[color:var(--color-eclipse-gold)]"
      />
    </label>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">{titulo}</p>
      {children}
    </div>
  );
}

export function PanelAjustes() {
  const a = useAjustes();
  const cerrar = () => {
    audioManager.playSfxBoton();
    a.abrirPanel(false);
  };

  return (
    <AnimatePresence>
      {a.panelAbierto && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(2,3,8,0.72)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={cerrar}
        >
          <motion.div
            role="dialog"
            aria-label="Ajustes"
            className="relative flex max-h-[85vh] w-full max-w-sm flex-col gap-6 overflow-y-auto rounded-md border px-6 py-7"
            style={{ background: "rgba(9,11,22,0.96)", borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 40%, transparent)" }}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center font-display text-lg text-[color:var(--color-eclipse-gold)]">Ajustes</h3>

            <Seccion titulo="Sonido">
              <button
                onClick={() => {
                  const estabaSilenciado = a.silenciado;
                  a.toggleSilencio();
                  if (estabaSilenciado) audioManager.playSfxBoton();
                }}
                className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm"
                style={{
                  borderColor: a.silenciado ? "rgba(240,125,145,0.5)" : "rgba(255,255,255,0.12)",
                  color: a.silenciado ? "#f07d91" : "var(--color-parchment)",
                }}
              >
                <span className="flex items-center gap-2">
                  <IconoParlante silenciado={a.silenciado} />
                  {a.silenciado ? "Todo silenciado" : "Silenciar todo"}
                </span>
                <span
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{ background: a.silenciado ? "#d9566e" : "rgba(255,255,255,0.15)" }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    style={{ left: a.silenciado ? 18 : 2 }}
                  />
                </span>
              </button>
              <div className="flex flex-col gap-4" style={{ opacity: a.silenciado ? 0.45 : 1 }}>
                <Deslizador etiqueta="Música" valor={a.musica} onChange={(v) => a.setVolumen("musica", v)} />
                <Deslizador
                  etiqueta="Efectos de sonido"
                  valor={a.efectos}
                  onChange={(v) => a.setVolumen("efectos", v)}
                  onSoltar={() => audioManager.playSfxBoton()}
                />
                <Deslizador etiqueta="Voces del narrador" valor={a.voces} onChange={(v) => a.setVolumen("voces", v)} />
              </div>
            </Seccion>

            <Seccion titulo="Eventos del Portal">
              <div className="grid grid-cols-3 gap-1.5">
                {MODOS_EVENTOS.map((m) => {
                  const activo = a.modoEventos === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        audioManager.playSfxBoton();
                        a.setModoEventos(m.id);
                      }}
                      className="flex flex-col items-center gap-1 rounded-sm border px-1 py-2 font-display text-[11px] tracking-wide"
                      style={{
                        borderColor: activo ? "var(--color-eclipse-gold)" : "rgba(255,255,255,0.12)",
                        color: activo ? "var(--color-eclipse-gold)" : "var(--color-parchment-dim)",
                        background: activo ? "rgba(232,196,104,0.1)" : "transparent",
                      }}
                      aria-pressed={activo}
                    >
                      <IconoModo modo={m.id} />
                      {m.nombre}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-xs text-[color:var(--color-parchment-dim)]">
                {MODOS_EVENTOS.find((m) => m.id === a.modoEventos)!.detalle}
              </p>
            </Seccion>

            <button
              onClick={cerrar}
              className="w-full rounded-sm border px-4 py-2 font-display text-xs tracking-wide"
              style={{ borderColor: "color-mix(in srgb, var(--color-eclipse-gold) 55%, transparent)", color: "var(--color-eclipse-gold)" }}
            >
              Cerrar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
