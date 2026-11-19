/* ============================================================
   App instalable (PWA): registra el service worker y recuerda si
   el navegador ofrece instalar la app.
   ============================================================ */
import { create } from "zustand";

/** Evento que Chrome/Edge/Android lanzan cuando la app se puede instalar. */
interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const yaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

interface InstalarState {
  /** El navegador permite instalar con un toque (Android, Chrome y Edge en PC). */
  disponible: boolean;
  /** iPhone/iPad: se instala desde Safari → Compartir → Agregar a pantalla de inicio. */
  esIOS: boolean;
  instalada: boolean;
  instalar: () => Promise<void>;
}

let pedido: EventoInstalar | null = null;

export const useInstalar = create<InstalarState>((set) => ({
  disponible: false,
  esIOS,
  instalada: yaInstalada(),
  instalar: async () => {
    if (!pedido) return;
    await pedido.prompt();
    const { outcome } = await pedido.userChoice;
    pedido = null;
    set({ disponible: false, instalada: outcome === "accepted" });
  },
}));

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // se muestra con nuestro propio botón
  pedido = e as EventoInstalar;
  useInstalar.setState({ disponible: true });
});
window.addEventListener("appinstalled", () => useInstalar.setState({ disponible: false, instalada: true }));

/** Solo en la versión publicada: en desarrollo guardaría versiones viejas del código. */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin service worker el juego funciona igual, solo que necesita conexión */
    });
  });
}
