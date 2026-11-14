import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "./game/store";
import { IntroScreen } from "./screens/IntroScreen";
import { PreparationScreen } from "./screens/PreparationScreen";
import { GameScreen } from "./screens/GameScreen";
import { EventRevealScreen } from "./screens/EventRevealScreen";
import { FinalScreen } from "./screens/FinalScreen";

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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;