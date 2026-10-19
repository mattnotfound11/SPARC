import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ScrubStage } from "@/components/ui/ScrubStage";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { IPhone } from "@/components/ui/IPhone";
import { RegisterPhone } from "@/components/screens/RegisterPhone";
import { PassPhone } from "@/components/screens/PassPhone";
import { SlotsPhone } from "@/components/screens/SlotsPhone";

/**
 * Closing section, built to the reference's geometry: a tall track with a
 * sticky viewport-height pane; a box inset 48px with a 24px radius that crops
 * the phones at its bottom edge; and the split scrubbed by scroll. Below
 * 810px the reference drops the inset and the fan, so this does too.
 */
export function CtaBand() {
  return (
    <ScrubStage>
      <div className="cta-shell">
        <div className="cta-box panel-lit">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,179,1,0.14) 0%, rgba(142,15,31,0.16) 45%, transparent 70%)",
              filter: "blur(16px)",
            }}
          />

          <SparcSeal size={52} className="relative size-10 sm:size-13" />
          <p className="relative mt-3 text-[clamp(0.8125rem,1vw,0.9375rem)] text-ink-muted">Campus gate access</p>
          <h2 id="cta-title" className="display relative mt-3 px-6 text-[clamp(1.5rem,3.4vw,3rem)] text-ink">
            Register once, then just tap.
          </h2>
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-3 px-6">
            <Link href="/signup" className="btn btn-gold link-arrow px-6 py-3 text-[0.9375rem]">
              Register your vehicle
              <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
            </Link>
            <Link href="/login" className="btn btn-ghost px-6 py-3 text-[0.9375rem]">
              I already have an account
            </Link>
          </div>

          {/* Phones fill whatever height is left and are cropped by the box */}
          <div className="device-stack device-stack--cta scrub-stack">
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
          </div>
        </div>
      </div>
    </ScrubStage>
  );
}
