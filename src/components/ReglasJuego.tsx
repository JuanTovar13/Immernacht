import { MATRIZ_EFECTOS, RAZAS, TIPOS_EVENTO, type TipoEvento } from "../game/types";
import { EFECTO_INFO } from "../game/lore";
import { BONO_CAPTURA, BONO_META } from "../game/digital/engine";
import { useAjustes } from "../game/ajustes";
import { audioManager } from "../audio/audioManager";
import { InfoModal } from "./InfoModal";

/** Resumen de las reglas y matriz de efectos (se abre desde el botón Reglas en cualquier pantalla). */
export function ReglasJuego() {
  const tipos = Object.keys(TIPOS_EVENTO) as TipoEvento[];
  return (
    <div className="text-sm text-[color:var(--color-parchment)]">
      <h3 className="mb-3 text-center font-display text-lg text-[color:var(--color-eclipse-gold)]">Cómo jugar</h3>
      <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-snug text-[color:var(--color-parchment-dim)]">
        <li>Los turnos van en sentido horario alrededor del tablero.</li>
        <li>Para sacar una ficha necesitas un 5: en un dado o sumando los dos. Con doble 5 sacas dos fichas. Si no tienes fichas en el recorrido, tienes 3 intentos.</li>
        <li>Mueve una ficha con la suma de los dados, o dos fichas con un dado cada una. Con pares vuelves a lanzar.</li>
        <li>Máximo 2 fichas por casilla. Si tu Salida está llena, mueve primero con el otro dado y luego saca con el 5.</li>
        <li>Si caes donde hay fichas rivales, las atacas y vuelven a su base, salvo en una Salida o Refugio. Al sacar una ficha te comes una ficha rival que esté en tu Salida.</li>
        <li>Cada ficha que comes te da un premio de {BONO_CAPTURA} casillas para la ficha que elijas (no provoca eventos).</li>
        <li>La primera vez que una ficha llega a una de las 4 casillas de su carril final ganas un premio de {BONO_META} casillas. No cuenta la casilla de seguro de la entrada ni moverse dentro del carril.</li>
        <li>Al terminar tu turno puede ocurrir un evento del Portal sobre tu última ficha movida. Nunca si no tienes fichas en el recorrido o si tienes alguna en tu carril final.</li>
        <li>Un Derrumbe de Rocas o unas Cadenas Sagradas tapan dos casillas durante 2 turnos: nadie puede entrar en ellas y las fichas atrapadas no se mueven. Las inmunes no quedan atrapadas. Si cae en tu Salida, puedes seguir sacando fichas, pero se quedan ahí hasta que pase.</li>
        <li>Los efectos que duran 2 turnos (quedar atrapado o tirar con los dados a la mitad) duran solo 1 si tu raza tiene el efecto a favor (+1).</li>
        <li>Gana quien ubique sus 4 fichas en las 4 casillas de su carril final.</li>
      </ul>
      <p className="mb-2 mt-4 text-xs tracking-wide text-[color:var(--color-muted)]">Matriz de efectos</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th />
              {tipos.map((t) => (
                <th key={t} className="px-1 pb-1 font-normal text-[color:var(--color-muted)]">
                  {TIPOS_EVENTO[t].icono}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(MATRIZ_EFECTOS) as (keyof typeof MATRIZ_EFECTOS)[]).map((r) => (
              <tr key={r} className="border-t border-white/5">
                <td className="py-1 pr-1">
                  <img src={RAZAS[r].logo} alt={RAZAS[r].nombre} className="h-5 w-5 object-contain" />
                </td>
                {tipos.map((t) => {
                  const e = MATRIZ_EFECTOS[r][t];
                  return (
                    <td key={t} className="px-1 text-center" style={{ color: EFECTO_INFO[e].color }}>
                      {e === "positivo" ? "+1" : e === "negativo" ? "−1" : e === "inmune" ? "Inmune" : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/** Ventana de reglas compartida por toda la app. */
export function PanelReglas() {
  const abiertas = useAjustes((s) => s.reglasAbiertas);
  const abrir = useAjustes((s) => s.abrirReglas);
  return (
    <InfoModal
      open={abiertas}
      capa="z-50"
      onClose={() => {
        audioManager.playSfxBoton();
        abrir(false);
      }}
    >
      <ReglasJuego />
    </InfoModal>
  );
}
