import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { StarField } from "../components/StarField";
import { RAZAS, ORDEN_RAZAS, type RazaId } from "../game/types";
import { useGameStore } from "../game/store";
import { COLOR_TABLERO } from "../game/digital/board";
import { useOnline } from "../game/online/conexion";
import { LARGO_CODIGO, codigoValido, type Asiento, type VistaSala } from "../game/online/protocolo";
import { audioManager } from "../audio/audioManager";

/** Código que llegó en el enlace (?sala=ABCD), si lo hay. */
let codigoDelEnlace: string | null = null;
export function leerCodigoDelEnlace(): boolean {
  try {
    const url = new URL(window.location.href);
    const c = url.searchParams.get("sala")?.toUpperCase() ?? null;
    if (c && codigoValido(c)) {
      codigoDelEnlace = c;
      url.searchParams.delete("sala");
      window.history.replaceState(null, "", url.toString());
      return true;
    }
  } catch {
    /* sin URL válida */
  }
  return false;
}

const BOTON_PRINCIPAL =
  "rounded-sm border border-[color:var(--color-eclipse-gold)]/70 px-6 py-3 font-display text-sm tracking-wide text-[color:var(--color-eclipse-gold)] disabled:opacity-40";
const ESTILO_PRINCIPAL = { background: "linear-gradient(180deg, rgba(232,196,104,0.12) 0%, rgba(232,196,104,0.03) 100%)" };

export function OnlineScreen() {
  const irA = useGameStore((s) => s.irA);
  const { sala, conexion, error, nombre, setNombre, crearSala, unirse, salir, salaGuardada, limpiarError } = useOnline();
  const [codigo, setCodigo] = useState(codigoDelEnlace ?? "");

  useEffect(() => {
    audioManager.playMusicaAmbiental("/audio/musica/intro-loop.mp3");
  }, []);

  // Cuando el anfitrión empieza, todos pasan al tablero.
  useEffect(() => {
    if (sala?.partida) irA("digital");
  }, [sala?.partida, irA]);

  const volver = () => {
    audioManager.playSfxBoton();
    if (sala) salir();
    irA("preparacion");
  };

  return (
    <Fondo>
      {sala ? (
        <SalaDeEspera sala={sala} reconectando={conexion === "reconectando"} onSalir={volver} />
      ) : (
        <div className="flex w-full max-w-xs flex-col items-stretch gap-5">
          <div className="text-center">
            <h2 className="font-display text-xl tracking-wide text-[color:var(--color-parchment)]">Jugar en línea</h2>
            <p className="mt-2 text-xs text-[color:var(--color-muted)] sm:text-sm">Crea una sala privada y comparte el código con tus amigos.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Tu nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 20))}
              placeholder="Cómo te verán los demás"
              maxLength={20}
              className="rounded-sm border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-[color:var(--color-parchment)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-eclipse-gold)]/60"
            />
          </label>

          <motion.button
            onClick={() => {
              audioManager.playSfxBoton();
              void crearSala();
            }}
            disabled={!nombre.trim() || conexion === "conectando"}
            className={BOTON_PRINCIPAL}
            style={ESTILO_PRINCIPAL}
            whileTap={{ scale: 0.95 }}
          >
            {conexion === "conectando" ? "Conectando…" : "Crear sala privada"}
          </motion.button>

          <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-muted)]">
            <span className="h-px flex-1 bg-white/10" />o únete con un código<span className="h-px flex-1 bg-white/10" />
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!codigoValido(codigo) || !nombre.trim()) return;
              audioManager.playSfxBoton();
              unirse(codigo);
            }}
          >
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LARGO_CODIGO))}
              placeholder="ABCD"
              aria-label="Código de la sala"
              autoCapitalize="characters"
              className="w-0 flex-1 rounded-sm border border-white/15 bg-black/30 px-3 py-2.5 text-center font-display text-lg tracking-[0.4em] text-[color:var(--color-parchment)] outline-none placeholder:text-white/20 focus:border-[color:var(--color-eclipse-gold)]/60"
            />
            <button
              type="submit"
              disabled={!codigoValido(codigo) || !nombre.trim() || conexion === "conectando"}
              className="rounded-sm border border-white/20 px-4 font-display text-sm tracking-wide text-[color:var(--color-parchment)] disabled:opacity-40"
            >
              Unirse
            </button>
          </form>

          {salaGuardada && (
            <button
              onClick={() => {
                audioManager.playSfxBoton();
                unirse(salaGuardada);
              }}
              className="text-xs text-[color:var(--color-eclipse-gold)] underline-offset-4 hover:underline"
            >
              Volver a la sala {salaGuardada}
            </button>
          )}

          {error && (
            <p className="rounded-sm border border-red-400/30 bg-red-950/30 px-3 py-2 text-center text-xs text-red-200" onClick={limpiarError}>
              {error}
            </p>
          )}
          {!nombre.trim() && <p className="text-center text-[11px] text-[color:var(--color-muted)]">Escribe tu nombre para continuar.</p>}

          <button onClick={volver} className="py-2 text-xs text-[color:var(--color-muted)]">
            Volver
          </button>
        </div>
      )}
    </Fondo>
  );
}

function SalaDeEspera({ sala, reconectando, onSalir }: { sala: VistaSala; reconectando: boolean; onSalir: () => void }) {
  const { jugadorId, enviar, error } = useOnline();
  const soyAnfitrion = sala.anfitrion === jugadorId;
  const [copiado, setCopiado] = useState(false);
  const activos = ORDEN_RAZAS.filter((r) => sala.asientos[r].tipo === "humano" || sala.asientos[r].tipo === "ia");
  const puedeEmpezar = activos.length >= 2;

  const enlace = `${window.location.origin}${window.location.pathname}?sala=${sala.codigo}`;
  const compartir = async () => {
    audioManager.playSfxBoton();
    const texto = `¡Únete a mi partida de Immernacht! Código: ${sala.codigo}`;
    try {
      if (navigator.share) await navigator.share({ title: "Immernacht", text: texto, url: enlace });
      else {
        await navigator.clipboard.writeText(enlace);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }
    } catch {
      /* el jugador canceló */
    }
  };

  const nombreDe = (id: string) => sala.jugadores.find((j) => j.id === id)?.nombre ?? "Jugador";

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">Código de la sala</p>
        <p className="mt-1 font-display text-4xl tracking-[0.35em] text-[color:var(--color-eclipse-gold)]" style={{ paddingLeft: "0.35em" }}>
          {sala.codigo}
        </p>
        <button
          onClick={() => void compartir()}
          className="mt-2 rounded-full border border-white/15 px-4 py-1 text-xs text-[color:var(--color-parchment-dim)] hover:text-[color:var(--color-parchment)]"
        >
          {copiado ? "¡Enlace copiado!" : "Compartir invitación"}
        </button>
        {reconectando && <p className="mt-2 text-xs text-amber-300">Reconectando…</p>}
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {ORDEN_RAZAS.map((r) => (
          <AsientoCard
            key={r}
            raza={r}
            asiento={sala.asientos[r]}
            mio={sala.asientos[r].tipo === "humano" && (sala.asientos[r] as { jugadorId: string }).jugadorId === jugadorId}
            nombre={sala.asientos[r].tipo === "humano" ? nombreDe((sala.asientos[r] as { jugadorId: string }).jugadorId) : ""}
            conectado={
              sala.asientos[r].tipo !== "humano" ||
              !!sala.jugadores.find((j) => j.id === (sala.asientos[r] as { jugadorId: string }).jugadorId)?.conectado
            }
            soyAnfitrion={soyAnfitrion}
            onElegir={() => enviar({ t: "elegirRaza", raza: r })}
            onCambiar={() => enviar({ t: "cambiarAsiento", raza: r })}
          />
        ))}
      </div>

      <div className="w-full max-w-xs text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">En la sala</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1">
          {sala.jugadores.map((j) => (
            <span key={j.id} className="text-sm text-[color:var(--color-parchment-dim)]">
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle ${j.conectado ? "bg-emerald-400" : "bg-white/25"}`} />
              {j.nombre}
              {j.id === sala.anfitrion && " 👑"}
              {j.id === jugadorId && " (tú)"}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="text-center text-xs text-red-200">{error}</p>}

      <div className="flex w-full max-w-xs flex-col gap-3">
        {soyAnfitrion ? (
          <>
            <motion.button
              onClick={() => {
                audioManager.playSfxBoton();
                enviar({ t: "empezar" });
              }}
              disabled={!puedeEmpezar}
              className={BOTON_PRINCIPAL}
              style={ESTILO_PRINCIPAL}
              whileTap={{ scale: 0.95 }}
            >
              Abrir el Portal
            </motion.button>
            <p className="text-center text-[11px] leading-relaxed text-[color:var(--color-muted)]">
              {puedeEmpezar
                ? "Los asientos libres no jugarán. Usa «Poner máquina» para llenarlos."
                : "Se necesitan al menos 2 facciones: espera a otro jugador o pon una máquina."}
            </p>
          </>
        ) : (
          <p className="text-center text-xs text-[color:var(--color-parchment-dim)]">Esperando a que el anfitrión abra el Portal…</p>
        )}
        <button onClick={onSalir} className="py-2 text-xs text-[color:var(--color-muted)]">
          Salir de la sala
        </button>
      </div>
    </div>
  );
}

const ETIQUETA_CAMBIO: Record<"libre" | "ia" | "nadie", string> = { libre: "Poner máquina", ia: "Cerrar asiento", nadie: "Abrir asiento" };

function AsientoCard({
  raza,
  asiento,
  mio,
  nombre,
  conectado,
  soyAnfitrion,
  onElegir,
  onCambiar,
}: {
  raza: RazaId;
  asiento: Asiento;
  mio: boolean;
  nombre: string;
  conectado: boolean;
  soyAnfitrion: boolean;
  onElegir: () => void;
  onCambiar: () => void;
}) {
  const color = COLOR_TABLERO[raza].base;
  const cerrado = asiento.tipo === "nadie";
  const elegible = !mio && (asiento.tipo === "libre" || asiento.tipo === "ia");
  const etiqueta =
    asiento.tipo === "humano" ? `👤 ${nombre}${mio ? " (tú)" : ""}${conectado ? "" : " · sin conexión"}` : asiento.tipo === "ia" ? "🤖 Máquina" : asiento.tipo === "libre" ? "Libre" : "No juega";

  return (
    <div
      className="flex flex-col items-center gap-2 rounded-md border px-3 py-4"
      style={{
        borderColor: cerrado ? "rgba(255,255,255,0.1)" : mio ? COLOR_TABLERO[raza].claro : `color-mix(in srgb, ${color} 55%, transparent)`,
        background: cerrado ? "rgba(255,255,255,0.02)" : `linear-gradient(180deg, color-mix(in srgb, ${color} ${mio ? 30 : 16}%, transparent), rgba(5,7,15,0.4))`,
        opacity: cerrado ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => {
          if (!elegible) return;
          audioManager.playSfxBoton();
          onElegir();
        }}
        disabled={!elegible}
        className="flex flex-col items-center gap-2 disabled:cursor-default"
        aria-label={elegible ? `Jugar con ${RAZAS[raza].nombre}` : RAZAS[raza].nombre}
      >
        <img src={RAZAS[raza].logo} alt="" className="h-12 w-12 object-contain" />
        <span className="font-display text-sm tracking-wide" style={{ color }}>
          {RAZAS[raza].nombre}
        </span>
      </button>
      <span className="max-w-full truncate rounded-full border border-white/15 px-3 py-0.5 text-[11px] text-[color:var(--color-parchment-dim)]">{etiqueta}</span>
      {elegible && <span className="text-[10px] text-[color:var(--color-muted)]">Toca para elegir</span>}
      {soyAnfitrion && asiento.tipo !== "humano" && (
        <button
          onClick={() => {
            audioManager.playSfxBoton();
            onCambiar();
          }}
          className="text-[10px] text-[color:var(--color-eclipse-gold)] underline-offset-2 hover:underline"
        >
          {ETIQUETA_CAMBIO[asiento.tipo]}
        </button>
      )}
    </div>
  );
}

function Fondo({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-noise" style={{ background: "var(--color-void-deep)" }}>
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(130% 90% at 50% 20%, #241a3c 0%, var(--color-void) 55%, var(--color-void-deep) 100%)" }}
      />
      <StarField count={40} />
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 140px 40px rgba(0,0,0,0.75)" }} />
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-none">
        <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center px-5 pb-10 pt-16">{children}</div>
      </div>
    </div>
  );
}
