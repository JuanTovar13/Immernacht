import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "./game/store";
import { IntroScreen } from "./screens/IntroScreen";
import { PreparationScreen } from "./screens/PreparationScreen";
import { GameScreen } from "./screens/GameScreen";
import { EventRevealScreen } from "./screens/EventRevealScreen";
import { FinalScreen } from "./screens/FinalScreen";
import { DigitalSetupScreen } from "./screens/DigitalSetupScreen";
import { DigitalGameScreen } from "./screens/DigitalGameScreen";
import { ControlesFlotantes, PanelAjustes } from "./components/ControlesAjustes";
import "./game/ajustes"; // aplica los ajustes de audio guardados desde el arranque

function App() {
  const estado = useGameStore((s) => s.estado);

  return (
    <div className="app-root relative w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={estado}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {estado === "inicio" && <IntroScreen />}
          {estado === "preparacion" && <PreparationScreen />}
          {estado === "partida" && <GameScreen />}
          {estado === "evento" && <EventRevealScreen />}
          {estado === "final" && <FinalScreen />}
          {estado === "configDigital" && <DigitalSetupScreen />}
          {estado === "digital" && <DigitalGameScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Sonido, modo de eventos y ajustes: siempre en la esquina superior derecha */}
      <ControlesFlotantes conModo={estado === "partida" || estado === "evento" || estado === "digital"} />
      <PanelAjustes />
    </div>
  );
}

export default App;