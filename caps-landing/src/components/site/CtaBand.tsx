import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SplitStage } from "@/components/ui/SplitStage";
import { IPhone } from "@/components/ui/IPhone";
import { RegisterPhone } from "@/components/screens/RegisterPhone";
import { PassPhone } from "@/components/screens/PassPhone";
import { SlotsPhone } from "@/components/screens/SlotsPhone";

/**
 * Closing section. The box pins to the viewport while the three phones
 * split apart, scrubbed by scroll, then releases — the same construction as
 * the reference: a tall track, a sticky viewport-height pane, and a box that
 * crops the phones at its bottom edge.
 */
export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="pin-track">
      <div className="pin-sticky">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="panel panel-lit relative overflow-hidden px-7 pt-14 text-center sm:px-12 sm:pt-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(245,179,1,0.14) 0%, rgba(142,15,31,0.16) 45%, transparent 70%)",
                filter: "blur(16px)",
              }}
            />

            <h2 id="cta-title" className="display relative text-[clamp(1.875rem,4.4vw,3rem)] text-ink">
              Register once, then just tap.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[1.0625rem] text-ink-muted">
              Pair your plate with your USA ID today and drive straight through the gate tomorrow.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className="btn btn-gold link-arrow px-6 py-3.5 text-[0.9375rem]">
                Register your vehicle
                <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
              </Link>
              <Link href="/login" className="btn btn-ghost px-6 py-3.5 text-[0.9375rem]">
                I already have an account
              </Link>
            </div>

            {/* Phones: stacked, then split across the pinned scroll, cropped by the box */}
            <SplitStage className="device-stack--cta relative mt-12 sm:mt-14">
              <div className="device device-left">
                <IPhone label="Creating a SPARC account on a phone, step 2 of 3">
                  <RegisterPhone />
                </IPhone>
              </div>
              <div className="device device-right">
                <IPhone label="Live campus slot availability by deck">
                  <SlotsPhone />
                </IPhone>
              </div>
              <div className="device device-front">
                <IPhone label="The SPARC campus gate pass with plate and recent entries">
                  <PassPhone />
                </IPhone>
              </div>
            </SplitStage>
          </div>
        </div>
      </div>
    </section>
  );
}
