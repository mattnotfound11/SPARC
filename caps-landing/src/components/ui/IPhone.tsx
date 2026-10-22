/**
 * iPhone mockup drawn entirely in CSS — no raster art, so it stays sharp at
 * any zoom or device pixel ratio. The screen hosts real DOM laid out at a
 * fixed 390x844 design size and scaled, which keeps text crisp.
 */
export function IPhone({
  children,
  label,
  className = "",
  style,
}: {
  children: React.ReactNode;
  /** Accessible name for the screen contents. */
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <figure className={`iphone ${className}`} style={style}>
      <span aria-hidden className="iphone-btn iphone-btn-silence" />
      <span aria-hidden className="iphone-btn iphone-btn-up" />
      <span aria-hidden className="iphone-btn iphone-btn-down" />
      <span aria-hidden className="iphone-btn iphone-btn-power" />
      <div className="iphone-band">
        <div className="iphone-screen">
          <div className="iphone-screen-inner">{children}</div>
          <span aria-hidden className="iphone-island" />
        </div>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
