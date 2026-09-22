import { AmbientBlobs } from "@/components/brand/AmbientBlobs";
import { SealBackdrop } from "@/components/brand/SealBackdrop";

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
    <div className="fade-in relative isolate flex min-h-svh flex-col items-center overflow-hidden px-4 py-[clamp(0.5rem,2vh,2rem)] font-jakarta">
      <AmbientBlobs darker />
      <SealBackdrop size="min(clamp(620px, 60vw, 1050px), 150vw)" opacity={0.05} blur={1.5} className="inset-0 -z-10" />

      <main id="main-content" className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-[34rem] rounded-[28px] border border-line-strong bg-[#11141c]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          {children}
        </div>
        {below}
      </main>

      <footer className="mt-[clamp(0.5rem,1.6vh,1.5rem)] font-grotesk text-xs text-ink-muted">{footer}</footer>
    </div>
  );
}
