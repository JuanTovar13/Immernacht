import { motion } from "framer-motion";
import { COLOR_DEBILITADO, IconoDebilitado } from "./IconoDebilitado";

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

export function Dado({
  valor,
  efectivo,
  usado,
  tirada,
  color,
}: {
  valor: number | null;
  efectivo: number | null;
  usado: boolean;
  tirada: number;
  color: string;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <motion.svg
        key={tirada}
        viewBox="0 0 100 100"
        className="h-12 w-12 sm:h-14 sm:w-14"
        initial={{ rotate: -200, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: usado ? 0.3 : 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <rect x={5} y={5} width={90} height={90} rx={18} fill="#f1ead8" stroke={color} strokeWidth={6} />
        {valor !== null ? (
          PIPS[valor].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={8.5} fill="#1b1426" />)
        ) : (
          <text x={50} y={54} textAnchor="middle" dominantBaseline="middle" fontSize={40} fill="#1b1426" opacity={0.25}>
            ?
          </text>
        )}
      </motion.svg>
      {valor !== null && efectivo !== null && efectivo !== valor && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px]" style={{ color: COLOR_DEBILITADO }} title="Dados a la mitad">
          <IconoDebilitado className="h-2.5 w-2.5" titulo="Dados a la mitad" /> {efectivo}
        </span>
      )}
    </div>
  );
}
