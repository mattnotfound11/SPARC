import Image from "next/image";

type SparcSealProps = {
  size: number;
  className?: string;
  priority?: boolean;
};

/** The circular SPARC / University of San Agustin seal. */
export function SparcSeal({ size, className = "", priority = false }: SparcSealProps) {
  return (
    <Image
      src="/brand/sparc-seal.webp"
      alt="SPARC — University of San Agustin seal"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full ${className}`}
    />
  );
}
