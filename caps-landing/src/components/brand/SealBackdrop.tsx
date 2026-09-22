type SealBackdropProps = {
  /** Rendered width of the seal, as a CSS length (reference: 810px). */
  size: string;
  opacity: number;
  blur: number;
  className?: string;
};

/**
 * University of San Agustin eagle seal as a faint, full-color watermark,
 * centered in its box. Treatment follows the lsgph-pharmatrack.com reference.
 * Purely decorative: hidden from assistive tech and clicks.
 */
export function SealBackdrop({ size, opacity, blur, className = "" }: SealBackdropProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute bg-center bg-no-repeat ${className}`}
      style={{
        backgroundImage: "url(/brand/usa-seal.webp)",
        backgroundSize: size,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    />
  );
}
