import React from 'react';

interface OvenIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const OvenIcon: React.FC<OvenIconProps> = ({ size = 22, width, height, style, ...props }) => {
  const h = height ?? size;
  const w = width ?? Math.round(Number(size) * 1.26);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 48 38"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      {...props}
    >
      {/* Cuerpo principal del horno */}
      <rect x="2" y="3" width="44" height="30" rx="4" />
      {/* Ventana de vidrio del horno */}
      <rect x="6.5" y="8" width="27" height="20" rx="2" />
      {/* Rejilla */}
      <path d="M6.5 24h27" />

      {/* Pastelito 1 */}
      <path d="M9.5 24l.9-3.6h5.2l.9 3.6" />
      <path d="M10.4 20.4a2.6 2.6 0 0 1 5.2 0" />

      {/* Pastelito 2 */}
      <path d="M18 24l.9-3.6h5.2l.9 3.6" />
      <path d="M18.9 20.4a2.6 2.6 0 0 1 5.2 0" />

      {/* Pastelito 3 */}
      <path d="M26.5 24l.9-3.6h5.2l.9 3.6" />
      <path d="M27.4 20.4a2.6 2.6 0 0 1 5.2 0" />

      {/* Panel y controles del horno */}
      <rect x="37.5" y="8" width="5" height="8" rx="1" />
      <path d="M38.6 21h.1M41.2 21h.1M38.6 24h.1M41.2 24h.1" strokeWidth="2.4" />
      <circle cx="40" cy="29" r="0.1" strokeWidth="0" />
      {/* Patas del horno */}
      <path d="M8 33v3M40 33v3" />
    </svg>
  );
};

export default OvenIcon;

