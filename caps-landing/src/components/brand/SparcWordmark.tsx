type SparcWordmarkProps = {
  className?: string;
};

/** "SPARC" set in the display face, with the gold C from the mockups. */
export function SparcWordmark({ className = "" }: SparcWordmarkProps) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      SPAR<span className="text-gold">C</span>
    </span>
  );
}
