import { Howl, Howler } from "howler";
import type { TipoEvento } from "../game/types";

/**
 * Gestor de audio central.
 *
 * Convención de archivos esperada (todo dentro de /public/audio/):
 *
 *   musica/intro-loop.mp3        → música de fondo del Estado 1 (Inicio) y Estado 2 (Preparación)
 *   musica/partida-loop.mp3      → música de fondo del Estado 3 (Partida)
 *
 *   sfx/boton.mp3                → click genérico de UI (todos los botones)
 *   sfx/activar-evento.mp3       → al presionar "Invocar Evento"
 *   sfx/victoria.mp3             → pantalla final
 *   sfx/nada-ocurre.mp3          → la mayoría de las veces que "no pasa nada"
 *
 *   sfx/tipos/celestial-reveal.mp3   → whoosh de revelación SEGÚN EL TIPO (4 archivos)
 *   sfx/tipos/natural-reveal.mp3
 *   sfx/tipos/arcano-reveal.mp3
 *   sfx/tipos/terrenal-reveal.mp3
 *
 *   sfx/eventos/<evento-id>.mp3      → sonido de la ACCIÓN de CADA evento (8 archivos,
 *                                       uno por evento — ver game/types.ts para los ids)
 *
 *   narracion/<evento-id>.mp3        → voz del narrador leyendo ese evento (8 archivos)
 *   narracion/historia.mp3           → voz del narrador leyendo la historia del juego
 *   narracion/raza-<raza-id>.mp3     → voz del narrador describiendo cada raza (4 archivos:
 *                                       raza-humanos, raza-elfos, raza-enanos, raza-nomuertos)
 *   narracion/nada-ocurre.mp3        → voz del narrador cuando "el portal guarda silencio"
 *   narracion/victoria.mp3           → voz del narrador en la pantalla final
 *
 * Mientras un archivo no exista, la función correspondiente falla en silencio
 * (solo un aviso en consola) — así puedes seguir probando la app sin tener
 * todos los audios listos todavía.
 */

let musicaActual: Howl | null = null;
let pistaActual: string | null = null;
let narracionActual: Howl | null = null;
const VOLUMEN_MUSICA_NORMAL = 0.35;
const VOLUMEN_MUSICA_CON_NARRACION = 0.12;
/** El volumen "normal" de LO QUE esté sonando ahora en `musicaActual` (música de
 *  fondo o el sonido de victoria) — para restaurarlo correctamente tras la
 *  narración, en vez de un valor fijo que no respeta el volumen de cada pista. */
let volumenMusicaBase = VOLUMEN_MUSICA_NORMAL;

const SFX_TIPO: Record<TipoEvento, string> = {
  celestial: "/audio/sfx/tipos/celestial-reveal.mp3",
  natural: "/audio/sfx/tipos/natural-reveal.mp3",
  arcano: "/audio/sfx/tipos/arcano-reveal.mp3",
  terrenal: "/audio/sfx/tipos/terrenal-reveal.mp3",
};

function playSafe(src: string, volumen = 0.6) {
  new Howl({
    src: [src],
    volume: volumen,
    onloaderror: () => console.warn(`[audio] Falta el archivo: ${src}`),
  }).play();
}

/** Sonidos de la pantalla de evento (whoosh de tipo, acción, "no pasa nada").
 *  Se rastrean para poder cortarlos al presionar "Continuar". */
const sfxEventoActivos = new Set<Howl>();

function playSfxRastreado(src: string, volumen = 0.6) {
  const h: Howl = new Howl({
    src: [src],
    volume: volumen,
    onend: () => sfxEventoActivos.delete(h),
    onstop: () => sfxEventoActivos.delete(h),
    onloaderror: () => {
      sfxEventoActivos.delete(h);
      console.warn(`[audio] Falta el archivo: ${src}`);
    },
  });
  sfxEventoActivos.add(h);
  h.play();
}

export const audioManager = {
  setMuted(muted: boolean) {
    Howler.mute(muted);
  },

  /** Reproduce música de fondo en loop. Si ya es la pista actual, no la reinicia
   *  (evita que la música "salte" al volver de un estado a otro). */
  playMusicaAmbiental(src: string, volumen = VOLUMEN_MUSICA_NORMAL) {
    if (pistaActual === src && musicaActual?.playing()) return;
    musicaActual?.stop();
    musicaActual = new Howl({
      src: [src],
      loop: true,
      volume: volumen,
      onloaderror: () => console.warn(`[audio] Falta el archivo de música: ${src}`),
    });
    pistaActual = src;
    volumenMusicaBase = volumen;
    musicaActual.play();
  },

  /** Detiene lo que esté sonando en el canal de música/ambiente (incluye el
   *  sonido de victoria, que usa este mismo canal — ver playSfxVictoria). */
  detenerMusica() {
    musicaActual?.stop();
    musicaActual = null;
    pistaActual = null;
  },

  /** Click genérico — llamar en el onClick de CUALQUIER botón de la app. */
  playSfxBoton() {
    playSafe("/audio/sfx/boton.mp3", 0.5);
  },

  playSfxActivarEvento() {
    playSafe("/audio/sfx/activar-evento.mp3", 0.6);
  },

  /** El sonido/música de victoria se trata como la "música" de esta pantalla:
   *  usa el mismo canal que playMusicaAmbiental, así se puede detener al salir
   *  (detenerMusica) y baja de volumen automáticamente si habla el narrador. */
  playSfxVictoria(volumen = 0.6) {
    musicaActual?.stop();
    musicaActual = new Howl({
      src: ["/audio/sfx/victoria.mp3"],
      loop: false,
      volume: volumen,
      onloaderror: () => console.warn("[audio] Falta el archivo: /audio/sfx/victoria.mp3"),
    });
    pistaActual = "/audio/sfx/victoria.mp3";
    volumenMusicaBase = volumen;
    musicaActual.play();
  },

  /** Sonido para la mayoría de las veces en que "no pasa nada" — distinto al whoosh de un tipo real. */
  playSfxNadaOcurre() {
    playSfxRastreado("/audio/sfx/nada-ocurre.mp3", 0.5);
  },

  /** Whoosh temático de revelación — depende del TIPO (celestial/natural/arcano/terrenal). */
  playSfxRevelacion(tipo: TipoEvento) {
    playSfxRastreado(SFX_TIPO[tipo], 0.6);
  },

  /** Sonido de la ACCIÓN concreta de ESE evento (no del tipo) — ej. el rugido
   *  del lobo en "Ataque de Bestia", el crujido de rocas en "Derrumbe de Rocas". */
  playSfxEvento(eventoId: string) {
    playSfxRastreado(`/audio/sfx/eventos/${eventoId}.mp3`, 0.7);
  },

  /** Corta los sonidos de la pantalla de evento que sigan sonando (llamar al presionar "Continuar"). */
  detenerSfxEvento() {
    sfxEventoActivos.forEach((h) => h.stop());
    sfxEventoActivos.clear();
  },

  /** Narración pre-grabada. Baja el volumen de la música mientras habla
   *  y lo restaura automáticamente al terminar. */
  playNarracion(eventoId: string) {
    narracionActual?.stop();
    if (musicaActual) musicaActual.fade(musicaActual.volume(), VOLUMEN_MUSICA_CON_NARRACION, 500);
    narracionActual = new Howl({
      src: [`/audio/narracion/${eventoId}.mp3`],
      volume: 0.95,
      onend: () => {
        if (musicaActual) musicaActual.fade(musicaActual.volume(), volumenMusicaBase, 700);
      },
      onloaderror: () => {
        console.warn(`[audio] Falta el clip de narración para "${eventoId}"`);
        if (musicaActual) musicaActual.fade(musicaActual.volume(), volumenMusicaBase, 700);
      },
    });
    narracionActual.play();
  },

  detenerNarracion() {
    narracionActual?.stop();
    if (musicaActual) musicaActual.fade(musicaActual.volume(), volumenMusicaBase, 500);
  },
};
