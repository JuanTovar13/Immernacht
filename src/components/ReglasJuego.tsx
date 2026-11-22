import { useState, type ReactNode } from "react";
import { MATRIZ_EFECTOS, RAZAS, TIPOS_EVENTO, type EfectoMatriz, type TipoEvento } from "../game/types";
import { EFECTO_INFO } from "../game/lore";
import { BONO_CAPTURA, BONO_META, FORTALEZAS, PARES_MAGIA_NEGRA } from "../game/digital/engine";
import { useAjustes } from "../game/ajustes";
import { audioManager } from "../audio/audioManager";
import { InfoModal } from "./InfoModal";

type Pestana = "reglas" | "matriz";

const PESTANAS: { id: Pestana; icono: string; nombre: string }[] = [
  { id: "reglas", icono: "📜", nombre: "Reglas" },
  { id: "matriz", icono: "🔮", nombre: "Matriz de eventos" },
];

const SIMBOLO: Record<EfectoMatriz, string> = { positivo: "+1", negativo: "−1", neutral: "—" };

/** Reglas del juego y matriz de eventos, en dos pestañas laterales. */
export function ReglasJuego() {
  const [pestana, setPestana] = useState<Pestana>("reglas");
  return (
    <div className="flex min-h-0 flex-1 text-sm text-[color:var(--color-parchment)]">
      {/* Pestañas laterales */}
      <nav className="flex w-16 shrink-0 flex-col gap-1.5 border-r border-white/10 py-4 pl-2 pr-1.5 sm:w-24" aria-label="Secciones de las reglas">
        {PESTANAS.map((t) => {
          const activa = t.id === pestana;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (activa) return;
                audioManager.playSfxBoton();
                setPestana(t.id);
              }}
              aria-current={activa ? "page" : undefined}
              className="flex flex-col items-center gap-1 rounded-sm border px-1 py-2 text-center font-display text-[10px] leading-tight tracking-wide transition-colors sm:text-[11px]"
              style={{
                borderColor: activa ? "color-mix(in srgb, var(--color-eclipse-gold) 60%, transparent)" : "transparent",
                background: activa ? "color-mix(in srgb, var(--color-eclipse-gold) 12%, transparent)" : "transparent",
                color: activa ? "var(--color-eclipse-gold)" : "var(--color-muted)",
              }}
            >
              <span className="text-lg leading-none">{t.icono}</span>
              {t.nombre}
            </button>
          );
        })}
      </nav>

      {/* Contenido */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">{pestana === "reglas" ? <Reglas /> : <Matriz />}</div>
    </div>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 font-display text-lg text-[color:var(--color-eclipse-gold)]">{children}</h3>;
}

function Seccion({ icono, titulo, children }: { icono: string; titulo: string; children: ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h4 className="mb-1.5 flex items-center gap-2 border-b border-white/10 pb-1 font-display text-[13px] tracking-wide text-[color:var(--color-parchment)]">
        <span aria-hidden>{icono}</span>
        {titulo}
      </h4>
      <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-snug text-[color:var(--color-parchment-dim)]">{children}</ul>
    </section>
  );
}

/** Término clave del juego (casillas especiales, estados, eventos…): en negrita. */
function T({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[color:var(--color-parchment)]">{children}</strong>;
}

function Reglas() {
  return (
    <>
      <Titulo>Cómo jugar</Titulo>

      <Seccion icono="🏆" titulo="Objetivo">
        <li>
          Gana quien ubique sus 4 fichas en las 4 casillas de su <T>carril final</T>.
        </li>
      </Seccion>

      <Seccion icono="🎲" titulo="Turnos y dados">
        <li>Los turnos van en sentido horario alrededor del tablero.</li>
        <li>Mueve una ficha con la suma de los dados, o dos fichas con un dado cada una.</li>
        <li>
          Con <T>pares</T> vuelves a lanzar.
        </li>
        <li>
          Sacar <T>pares</T> {PARES_MAGIA_NEGRA} veces seguidas delata el uso de <T>magia negra</T>: esa tirada no se juega, tu última ficha
          movida regresa directamente a la <T>base</T> y tu turno termina. Si esa ficha está en el <T>carril final</T>, está a salvo.
        </li>
      </Seccion>

      <Seccion icono="🚪" titulo="Sacar fichas">
        <li>
          Para sacar una ficha de la <T>base</T> necesitas un 5: en un dado o sumando los dos. Con <T>doble 5</T> sacas dos fichas.
        </li>
        <li>
          Si no tienes fichas en el <T>recorrido</T> (todas en la <T>base</T> o en el <T>carril final</T>), tienes 3 intentos, y en ellos los{" "}
          <T>pares</T> no dan otro lanzamiento.
        </li>
        <li>
          Si tu <T>Salida</T> está llena, mueve primero con el otro dado y luego saca con el 5.
        </li>
      </Seccion>

      <Seccion icono="⚔️" titulo="Casillas y capturas">
        <li>Máximo 2 fichas por casilla.</li>
        <li>
          Si caes donde hay fichas rivales, las atacas y vuelven a su <T>base</T>, salvo en una <T>Salida</T> o un <T>Refugio</T>.
        </li>
        <li>
          Al sacar una ficha te comes una ficha rival que esté en tu <T>Salida</T>.
        </li>
        <li>
          Cada ficha que comes te da un <T>premio de {BONO_CAPTURA} casillas</T> para la ficha que elijas (no provoca eventos).
        </li>
        {FORTALEZAS.activo && (
          <li>
            Dos fichas de tu raza en una misma casilla forman una <T>fortaleza</T>: no se pueden comer y nadie puede caer en ella ni cruzarla
            {FORTALEZAS.bloqueaPropia ? "" : " (tus otras fichas sí pueden pasar)"}. En tu siguiente turno debes abandonarla moviendo una de sus
            fichas. No se forma en la <T>Salida</T> de otra raza, y sobre un <T>Derrumbe</T> o unas <T>Cadenas</T> no tiene efecto.
          </li>
        )}
      </Seccion>

      <Seccion icono="🏁" titulo="Carril final">
        <li>
          Las fichas del <T>carril final</T> están a salvo de ataques y eventos.
        </li>
        <li>
          La primera vez que una ficha llega a una de las 4 casillas de su <T>carril final</T> ganas un <T>premio de {BONO_META} casillas</T>. No
          cuenta la <T>casilla de seguro</T> de la entrada ni moverse dentro del carril.
        </li>
      </Seccion>

      <Seccion icono="🌀" titulo="Eventos del Portal">
        <li>
          Al terminar tu turno puede ocurrir un <T>evento del Portal</T> sobre tu última ficha movida (si ya llegó al <T>carril final</T>, sobre
          tu ficha más adelantada del <T>recorrido</T>). No hay eventos si no tienes fichas en el <T>recorrido</T>.
        </li>
        <li>
          Un <T>Derrumbe de Rocas</T> o unas <T>Cadenas Sagradas</T> tapan dos casillas durante 2 turnos: nadie puede entrar en ellas y las fichas{" "}
          <T>atrapadas</T> no se mueven. Si cae en tu <T>Salida</T>, puedes seguir sacando fichas, pero se quedan ahí hasta que pase.
        </li>
        <li>
          Hay eventos que otorgan el estado <T>ralentizado</T>: un jugador ralentizado verá el valor de sus dados reducido a la mitad, redondeado
          hacia arriba.
        </li>
        <li>
          Cada raza recibe cada tipo de evento <T>a favor</T>, <T>en contra</T> o <T>sin cambio</T>: lo verás en la pestaña{" "}
          <T>Matriz de eventos</T>.
        </li>
      </Seccion>
    </>
  );
}

function Matriz() {
  const tipos = Object.keys(TIPOS_EVENTO) as TipoEvento[];
  const razas = Object.keys(MATRIZ_EFECTOS) as (keyof typeof MATRIZ_EFECTOS)[];
  return (
    <>
      <Titulo>Matriz de eventos</Titulo>
      <p className="mb-3 text-[12px] leading-snug text-[color:var(--color-parchment-dim)]">
        Cada <T>evento del Portal</T> es de un tipo. Según tu raza, ese tipo te llega <T>a favor</T>, <T>en contra</T> o <T>sin cambio</T>.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr>
              <th />
              {tipos.map((t) => (
                <th key={t} className="px-1 pb-1.5 text-center font-normal text-[color:var(--color-muted)]">
                  <div className="text-base leading-none">{TIPOS_EVENTO[t].icono}</div>
                  <div className="mt-1 text-[9px] tracking-wide">{TIPOS_EVENTO[t].nombre}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {razas.map((r) => (
              <tr key={r} className="border-t border-white/5">
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <img src={RAZAS[r].logo} alt="" className="h-5 w-5 object-contain" />
                    <span className="text-[11px] text-[color:var(--color-parchment-dim)]">{RAZAS[r].nombre}</span>
                  </div>
                </td>
                {tipos.map((t) => {
                  const e = MATRIZ_EFECTOS[r][t];
                  return (
                    <td key={t} className="px-1 text-center font-semibold" style={{ color: EFECTO_INFO[e].color }}>
                      {SIMBOLO[e]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mb-2 mt-5 border-b border-white/10 pb-1 font-display text-[13px] tracking-wide">Tipos de evento</h4>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-[color:var(--color-parchment-dim)]">
        {tipos.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="text-base leading-none">{TIPOS_EVENTO[t].icono}</span>
            {TIPOS_EVENTO[t].nombre}
          </li>
        ))}
      </ul>

      <h4 className="mb-2 mt-5 border-b border-white/10 pb-1 font-display text-[13px] tracking-wide">Qué significa cada símbolo</h4>
      <dl className="space-y-2.5 text-[12px] leading-snug text-[color:var(--color-parchment-dim)]">
        <Convencion e="positivo" nombre="A favor">
          Si el evento te hace avanzar, avanzas 1 casilla más; si te hace retroceder, 1 menos. Si no mueve la ficha (<T>escudos</T> e <T>intercambios</T>), avanzas 1.
          Quedar <T>atrapado</T> o <T>ralentizado</T> dura 1 turno en lugar de 2.
        </Convencion>
        <Convencion e="negativo" nombre="En contra">
          Si el evento te hace avanzar, avanzas 1 casilla menos; si te hace retroceder, 1 más. Si no la mueve (<T>escudos</T>, <T>intercambios</T> y <T>ralentizado</T>), retrocedes 1.
        </Convencion>
        <Convencion e="neutral" nombre="Sin cambio">
          El evento se aplica tal cual.
        </Convencion>
      </dl>
      <p className="mt-3 text-[11px] leading-snug text-[color:var(--color-muted)]">
        En los eventos que afectan a varias fichas, cada una usa la matriz de su propia raza. En la tarjeta del evento los números ya vienen
        ajustados y en color.
      </p>
    </>
  );
}

function Convencion({ e, nombre, children }: { e: EfectoMatriz; nombre: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-8 shrink-0 text-center text-sm font-semibold" style={{ color: EFECTO_INFO[e].color }}>
        {SIMBOLO[e]}
      </dt>
      <dd>
        <span className="font-semibold" style={{ color: EFECTO_INFO[e].color }}>
          {nombre}.
        </span>{" "}
        {children}
      </dd>
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
      ancho
      onClose={() => {
        audioManager.playSfxBoton();
        abrir(false);
      }}
    >
      <ReglasJuego />
    </InfoModal>
  );
}
