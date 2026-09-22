import { AmbientBlobs } from "@/components/brand/AmbientBlobs";
import { SealBackdrop } from "@/components/brand/SealBackdrop";

type AuthShellProps = {
  children: React.ReactNode;
  /** Content rendered between the card and the footer. */
  below?: React.ReactNode;
  footer: React.ReactNode;
  /** Card width in px; the signup card is a touch narrower than login. */
  width?: number;
};

export function AuthShell({ children, below, footer, width = 446 }: AuthShellProps) {
  return (
    <div className="fade-in relative isolate flex min-h-svh flex-col items-center overflow-hidden px-4 pt-5 pb-6 font-jakarta sm:pt-5">
      <AmbientBlobs darker />
      <SealBackdrop size="min(810px, 150vw)" opacity={0.05} blur={1.5} className="inset-0 -z-10" />

      <main id="main-content" className="flex w-full flex-1 flex-col items-center justify-center">
        <div
          className="w-full rounded-[28px] border border-line-strong bg-[#11141c]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm"
          style={{ maxWidth: width }}
        >
          {children}
        </div>
        {below}
      </main>

      <footer className="mt-6 font-grotesk text-[0.6875rem] text-ink-muted">{footer}</footer>
    </div>
  );
}
