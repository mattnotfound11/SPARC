/** Small capsule label that opens a section. */
export function Pill({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border border-line bg-surface/80 px-3 py-1.5 text-sm font-medium tracking-[-0.01em] text-ink-soft ${className}`}
    >
      {children}
    </span>
  );
}
