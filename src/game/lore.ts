import type { EfectoMatriz, RazaId } from "./types";

/** Historia completa — se muestra en el modal "Historia" y se narra en voz alta. */
export const HISTORIA_JUEGO = `El Reino de la Noche Eterna no es un lugar terrenal; es un paraíso fantástico donde la decadencia no existe, los pesares de la vida mortal se disuelven y el tiempo carece de sentido. Es un refugio de belleza pura, luz estelar y paz inmutable. Llegar al Reino de la Noche Eterna es reconfigurar la realidad misma.

Sin embargo, el acceso a este paraíso está estrictamente sellado. Solo durante una única noche especial en el siglo, el Portal del Eclipse se abre en el Santuario Atávico, un lugar remoto en el que abundan desastres naturales y bestias. Su entrada permanece abierta únicamente hasta el primer rayo del amanecer. Para cruzar el umbral no basta con alcanzar el centro: el portal exige la resonancia de 4 voluntades idénticas. Solo cuando cuatro guerreros que comparten el mismo deseo se reúnen en el portal, la puerta se abre para su pueblo.

Cada facción busca reclamar el Reino de la Noche Eterna para hacer realidad su mayor anhelo. Sin embargo, los deseos de una facción significan la ruina o el fin absoluto para las demás.`;

/** Descripción corta de cada raza (su Deseo) — se muestra al tocar su emblema en Preparación. */
export const RAZA_DESCRIPCION: Record<RazaId, string> = {
  humanos:
    "Sociedad jerárquica y disciplinada que habita en ciudadelas de piedra amuralladas, guiada por el honor, la ley y la memoria de sus héroes. Amantes de la arquitectura monumental, la elegancia y la vida comunitaria, centran su existencia en dejar legados duraderos mientras lidian con el constante temor a la enfermedad y la decadencia. Impulsados por esta fragilidad, marchan hacia el Portal Atavico con la intención de alcanzar la inmortalidad y la juventud eterna, sin importar que consolidar un dominio perpetuo termine por agotar los recursos de las demás razas.",
  elfos:
    "Comunidad pacífica que vive integrada en las copas de bosques ancestrales, dedicada a la botánica mística y al estudio de las estrellas. Su cultura es pausada y poética, guiada por ancianos y druidas que valoran la música suave y la contemplación en armonía con el entorno. Ante el desgaste del mundo exterior, buscan cruzar el Umbral del Reino para que la naturaleza y la vida silvestre florezcan de forma infinita y descontrolada, sin importar que esta marea verde devore y sepulte las ciudades, ingenios y minas de los demás pueblos.",
  enanos:
    "Civilización subterránea organizada en clanes leales que tallan imponentes ciudades en las entrañas de las montañas al compás de la forja. Maestros de la ingeniería y la minería, valoran la palabra dada, la cerveza fuerte y la maestría técnica, celebrando el arte de moldear la roca con inquebrantable orgullo. Su ambición al cruzar el Portal es reclamar la riqueza absoluta en joyas astrales y oro inagotable, sin importar que esa codicia desmedida drena la prosperidad y los minerales del mundo terrenal, dejando a los demás en la ruina.",
  nomuertos:
    "Pobladores de valles brumosos y ruinas olvidadas que llevan una existencia solemne y contemplativa tras haber perdido la vida terrenal. Cultivan un estilo refinado y melancólico lleno de música arcaica, incienso y silencio, dedicando sus días a la magia oscura y a la preservación de vestigios del pasado. Convencidos de que solo cobrando venganza contra los vivos hallarán la paz que se les ha negado, avanzan hacia el Portal para desencadenar una onda que extinga la chispa de los vivos, asegurando así el reposo y el silencio eterno para todas las almas.",
};

export const EFECTO_INFO: Record<EfectoMatriz, { label: string; color: string }> = {
  positivo: { label: "Avanza 1 casilla", color: "#8fbf6a" },
  negativo: { label: "Retrocede 1 casilla", color: "#c96a6a" },
  neutral: { label: "Sin efecto adicional", color: "#9aa0b8" },
  inmune: { label: "Inmune al evento", color: "#e8c468" },
};
