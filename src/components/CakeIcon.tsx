import React from 'react';

interface CakeIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Icono de Torta Artesanal Sablée (Sin Velas).
 * Diseñado a mano en SVG para mantener las proporciones exactas del sistema de iconos
 * eliminando las 3 velas de cumpleaños de Lucide para un aspecto de pastelería artesanal elegante.
 */
export const CakeIcon: React.FC<CakeIconProps> = ({
  size = 24,
  color = 'currentColor',
  strokeWidth = 2.4,
  style,
  className
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {/* Base / Plato de presentación */}
      <path d="M2 21h20" />
      {/* Cuerpo de la torta artesanal (sin velas) */}
      <path d="M20 21v-12a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12" />
      {/* Glaseado artesanal ondulado */}
      <path d="M4 15s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
    </svg>
  );
};

export default CakeIcon;

