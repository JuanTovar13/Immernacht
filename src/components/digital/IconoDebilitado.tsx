/** Color del estado "debilitado" (dados a la mitad o cualquier pérdida de velocidad o fuerza). */
export const COLOR_DEBILITADO = "#e58a6f";

/**
 * Icono genérico de debilitamiento: una flecha que baja hacia una línea de suelo.
 * Sirve para la Maldición de Polimorfia, el Pantano de Lianas y cualquier otro
 * efecto que reste velocidad o fuerza, sin atarse a la imagen de un sapo.
 */
export function IconoDebilitado({ className = "h-3 w-3", titulo = "ralentizado" }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block shrink-0 align-[-0.15em] ${className}`} role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <circle cx={8} cy={8} r={7.2} fill="none" stroke={COLOR_DEBILITADO} strokeWidth={1.4} />
      <path d="M8 3.6 V9.6 M5.2 7 L8 9.8 L10.8 7" fill="none" stroke={COLOR_DEBILITADO} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 12.2 H11.2" stroke={COLOR_DEBILITADO} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
