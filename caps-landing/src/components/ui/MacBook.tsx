/**
 * MacBook mockup drawn entirely in CSS — no raster art, so it stays sharp at
 * any zoom or device pixel ratio. The screen hosts real DOM laid out at a
 * fixed 1200x750 design size and scaled down, which keeps text crisp.
 */
export function MacBook({
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
    <figure className={`macbook ${className}`} style={style}>
      <div className="macbook-lid">
        <div className="macbook-bezel">
          <span aria-hidden className="macbook-cam" />
          <div className="macbook-screen">
            <div className="macbook-screen-inner">{children}</div>
          </div>
        </div>
      </div>
      <div aria-hidden className="macbook-base">
        <span className="macbook-notch" />
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
