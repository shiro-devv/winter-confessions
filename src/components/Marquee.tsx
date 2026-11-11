interface MarqueeProps {
  items: string[];
}

/** An endlessly scrolling ribbon of short phrases. Pauses on hover. */
export function Marquee({ items }: MarqueeProps) {
  const renderGroup = (hidden: boolean) => (
    <ul className="marquee-group" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className="marquee-item">
          <span className="marquee-dot" aria-hidden="true">
            ❄
          </span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee" role="region" aria-label="Things friends might send you">
      <div className="marquee-track">
        {renderGroup(false)}
        {renderGroup(true)}
      </div>
    </div>
  );
}
