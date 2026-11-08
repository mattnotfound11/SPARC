import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { BrandPanel } from "./BrandPanel";

function BackLink() {
  return (
    <Link
      href="/"
      className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 font-medium text-ink transition-colors hover:text-gold"
    >
      <ChevronLeft aria-hidden className="size-5" strokeWidth={2} />
      Back
    </Link>
  );
}

/**
 * Shared layout for Log in and Sign up.
 *  - phone:   one column, primary button pinned in the thumb zone
 *  - tablet:  the form sits in a bordered card
 *  - desktop: brand panel on the left, form centered on the right
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-canvas lg:grid lg:grid-cols-[minmax(24rem,5fr)_7fr]">
      <BrandPanel>
        <BackLink />
      </BrandPanel>

      <main
        id="main-content"
        className="flex min-h-svh justify-center sm:items-center sm:p-6 lg:px-[clamp(2.5rem,7vw,7.5rem)] lg:py-10"
      >
        <div className="flex w-full flex-1 flex-col px-5 sm:max-w-[36.25rem] sm:flex-none sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:px-11 lg:max-w-[30rem] lg:border-0 lg:bg-transparent lg:px-0">
          <div className="flex h-[3.75rem] items-center justify-between sm:h-[4.5rem] lg:hidden">
            <BackLink />
            <SparcSeal
              size={34}
              className="size-[2.125rem] ring-2 ring-[#f6eee0] shadow-[0_0_0_4px_rgba(245,179,1,0.14)]"
            />
          </div>

          {children}

          <footer className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 pb-[max(1.125rem,env(safe-area-inset-bottom))] text-xs text-ink-muted sm:mt-2 sm:border-t sm:border-line lg:mt-5 lg:border-0 lg:pb-0">
            <span>
              © {new Date().getFullYear()} University of San Agustin <span aria-hidden>•</span> SPARC System
            </span>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1.5">
              <a href="#" className="underline underline-offset-2 hover:text-ink">Privacy Policy</a>
              <a href="#" className="underline underline-offset-2 hover:text-ink">Terms of Access</a>
              <a href="#" className="underline underline-offset-2 hover:text-ink">Support Desk</a>
            </nav>
          </footer>
        </div>
      </main>
    </div>
  );
}
