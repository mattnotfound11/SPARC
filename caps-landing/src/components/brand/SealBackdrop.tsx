import Image from "next/image";

type SealBackdropProps = {
  /** Diameter of the watermark seal, as a CSS length. */
  size: string;
  /** Vertical position of the seal's center, as a CSS length from the top. */
  centerY: string;
  opacity?: number;
  blur?: number;
  className?: string;
};

/**
 * Oversized, darkened seal watermark with a crimson bloom behind it.
 * Purely decorative: hidden from assistive tech and clicks.
 */
export function SealBackdrop({
  size,
  centerY,
  opacity = 0.3,
  blur = 0,
  className = "",
}: SealBackdropProps) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Crimson bloom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          top: centerY,
          width: `calc(${size} * 1.15)`,
          height: `calc(${size} * 1.15)`,
          background:
            "radial-gradient(closest-side, rgba(142, 15, 31, 0.22), rgba(142, 15, 31, 0.07) 55%, transparent 100%)",
        }}
      />
      {/* Seal watermark */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          top: centerY,
          width: size,
          height: size,
          opacity,
          filter: blur ? `blur(${blur}px)` : undefined,
          maskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(closest-side, #000 62%, transparent 100%)",
        }}
      >
        <Image src="/brand/sparc-seal-bg.webp" alt="" fill sizes="100vw" loading="eager" fetchPriority="high" className="object-contain" />
      </div>
    </div>
  );
}
