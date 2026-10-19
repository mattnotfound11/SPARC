import Image from "next/image";

/* Deterministic starfield: same output on server and client, so no hydration drift. */
function stars(count: number) {
  let seed = 20260923;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 100).toFixed(3)}%`,
    top: `${(rand() * 100).toFixed(3)}%`,
    size: rand() < 0.18 ? 2 : 1,
    opacity: 0.15 + rand() * 0.5,
    delay: `${(rand() * 6).toFixed(2)}s`,
  }));
}

const FIELD = stars(90);

/**
 * Hero backdrop: starfield, a crimson/gold bloom, and the University of
 * San Agustin seal sitting faintly inside the bloom. Decorative only.
 */
export function GlowField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Stars */}
      <div className="absolute inset-0">
        {FIELD.map((s, i) => (
          <span
            key={i}
            className="dot-pulse absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: s.delay,
              animationDuration: "5s",
            }}
          />
        ))}
      </div>

      {/* Crimson bloom with a gold core */}
      <div
        className="absolute left-1/2 top-[46%] h-[min(760px,92vw)] w-[min(760px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(245,179,1,0.16) 0%, rgba(224,69,94,0.18) 26%, rgba(142,15,31,0.22) 44%, rgba(142,15,31,0.06) 62%, transparent 72%)",
          filter: "blur(18px)",
        }}
      />

      {/* Seal inside the bloom */}
      <div className="absolute left-1/2 top-[46%] h-[min(430px,52vw)] w-[min(430px,52vw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]">
        <Image src="/brand/usa-seal.webp" alt="" fill sizes="52vw" loading="eager" className="object-contain" />
      </div>

      {/* Settle the bloom into the canvas at the fold */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}
