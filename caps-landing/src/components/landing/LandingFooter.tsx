import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

export function LandingFooter() {
  return (
    <footer className="border-t border-line px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SparcSeal size={22} />
          <SparcWordmark className="text-[0.8125rem] text-ink" />
          <span aria-hidden className="text-ink-faint">•</span>
          <span>University of San Agustin, Iloilo City</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>© {new Date().getFullYear()} University of San Agustin. All rights reserved.</span>
          <span aria-hidden className="text-ink-faint">|</span>
          <a href="#" className="font-medium text-gold underline-offset-4 hover:underline">
            Privacy
          </a>
          <span aria-hidden className="text-ink-faint">·</span>
          <a href="#" className="font-medium text-gold underline-offset-4 hover:underline">
            Transit Bylaws
          </a>
        </div>
      </div>
    </footer>
  );
}
