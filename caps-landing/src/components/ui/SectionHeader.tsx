import { Reveal } from "./Reveal";
import { Pill } from "./Pill";

type SectionHeaderProps = {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  align?: "center" | "left";
  id?: string;
};

export function SectionHeader({ eyebrow, title, body, align = "center", id }: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <div className={`flex flex-col ${centered ? "items-center text-center" : "items-start"}`}>
      <Reveal>
        <Pill>{eyebrow}</Pill>
      </Reveal>
      <Reveal delay={80}>
        <h2
          id={id}
          className={`display mt-6 text-[clamp(2rem,4.6vw,3.125rem)] text-ink ${centered ? "max-w-3xl" : "max-w-2xl"}`}
        >
          {title}
        </h2>
      </Reveal>
      {body && (
        <Reveal delay={140}>
          <p className={`mt-5 text-[1.0625rem] leading-relaxed text-ink-muted ${centered ? "max-w-2xl" : "max-w-xl"}`}>
            {body}
          </p>
        </Reveal>
      )}
    </div>
  );
}
