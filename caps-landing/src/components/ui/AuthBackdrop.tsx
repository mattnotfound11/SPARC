import Image from "next/image";

/* Same seeded starfield as the hero, quieter, for the auth screens. */
function stars(count: number) {
  let seed = 76543219;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 100).toFixed(3)}%`,
    top: `${(rand() * 100).toFixed(3)}%`,
    size: rand() < 0.15 ? 2 : 1,
    opacity: 0.12 + rand() * 0.38,
    delay: `${(rand() * 6).toFixed(2)}s`,
  }));
}

const FIELD = stars(60);

export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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

      <div
        className="absolute left-1/2 top-1/2 h-[min(820px,120vw)] w-[min(820px,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(245,179,1,0.10) 0%, rgba(224,69,94,0.12) 28%, rgba(142,15,31,0.16) 46%, transparent 70%)",
          filter: "blur(22px)",
        }}
      />

      <div className="absolute left-1/2 top-1/2 h-[min(420px,64vw)] w-[min(420px,64vw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.09]">
        <Image src="/brand/usa-seal.webp" alt="" fill sizes="64vw" loading="eager" className="object-contain" />
      </div>
    </div>
  );
}
