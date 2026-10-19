import { AuthBackdrop } from "@/components/ui/AuthBackdrop";

type AuthShellProps = {
  children: React.ReactNode;
  /** Content rendered between the card and the footer. */
  below?: React.ReactNode;
  footer: React.ReactNode;
};

/**
 * Full-screen auth layout. Vertical rhythm is tied to viewport height so the
 * card, its companion pill and the footer fit one screen on laptops as well
 * as large monitors.
 */
export function AuthShell({ children, below, footer }: AuthShellProps) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center overflow-hidden px-4 py-[clamp(0.5rem,2vh,2rem)]">
      <AuthBackdrop />

      <main id="main-content" className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="panel panel-lit w-full max-w-[34rem] bg-surface/90 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          {children}
        </div>
        {below}
      </main>

      <footer className="mt-[clamp(0.5rem,1.6vh,1.5rem)] text-xs text-ink-muted">{footer}</footer>
    </div>
  );
}
