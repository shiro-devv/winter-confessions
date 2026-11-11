interface SnowflakeProps {
  size?: number;
  className?: string;
}

/** Decorative six-armed snowflake icon. Inherits the current text color. */
export function Snowflake({ size = 28, className }: SnowflakeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {[0, 60, 120].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 24 24)`}>
            <line x1="24" y1="4" x2="24" y2="44" />
            <polyline points="18,10 24,16 30,10" />
            <polyline points="18,38 24,32 30,38" />
          </g>
        ))}
      </g>
    </svg>
  );
}
