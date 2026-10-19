import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/ui/Spotlight";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="px-5 pb-20 sm:px-8 sm:pb-24">
      <Reveal className="mx-auto block max-w-6xl">
        <Spotlight className="panel panel-lit relative block overflow-hidden px-7 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,179,1,0.14) 0%, rgba(142,15,31,0.16) 45%, transparent 70%)",
              filter: "blur(16px)",
            }}
          />
          <h2 id="cta-title" className="display relative text-[clamp(1.875rem,4.2vw,2.875rem)] text-ink">
            Register once, then just tap.
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-[1.0625rem] text-ink-muted">
            Pair your plate with your USA ID today and drive straight through the gate tomorrow.
          </p>
          <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn btn-gold link-arrow px-6 py-3.5 text-[0.9375rem]">
              Register your vehicle
              <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
            </Link>
            <Link href="/login" className="btn btn-ghost px-6 py-3.5 text-[0.9375rem]">
              I already have an account
            </Link>
          </div>
        </Spotlight>
      </Reveal>
    </section>
  );
}
