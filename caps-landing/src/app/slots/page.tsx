import type { Metadata } from "next";
import Link from "next/link";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";
import { AvailabilityView } from "@/components/site/AvailabilityView";

export const metadata: Metadata = {
  title: "Available slots",
  description: "See how many parking slots are free on each floor of the University of San Agustin parking building.",
};

export default function SlotsPage() {
  return (
    <>
      <header className="sticky top-0 z-50 h-[var(--header-h)] border-b border-line bg-canvas/80 backdrop-blur-xl">
        <nav aria-label="Primary" className="mx-auto flex h-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="brand-mark flex items-center gap-2.5 rounded-lg" aria-label="SPARC home">
            <SparcSeal size={36} priority className="size-8 sm:size-9" />
            <SparcWordmark className="text-lg text-ink sm:text-xl" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost px-4 py-2 text-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-gold px-4 py-2 text-sm sm:px-5">
              Register vehicle
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <AvailabilityView />
      </main>
    </>
  );
}
