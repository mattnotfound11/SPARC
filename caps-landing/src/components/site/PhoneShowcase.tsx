import { IPhone } from "@/components/ui/IPhone";
import { SplitStage } from "@/components/ui/SplitStage";
import { Reveal } from "@/components/ui/Reveal";
import { Pill } from "@/components/ui/Pill";
import { RegisterPhone } from "@/components/screens/RegisterPhone";
import { PassPhone } from "@/components/screens/PassPhone";
import { SlotsPhone } from "@/components/screens/SlotsPhone";

/**
 * Sits under the registration form: three phones that start stacked and fan
 * apart as the section arrives — sign up, carry the pass, check the slots.
 */
export function PhoneShowcase() {
  return (
    <section aria-labelledby="after-register-title" className="relative overflow-hidden px-5 pt-16 pb-20 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <Reveal>
            <Pill>After you register</Pill>
          </Reveal>
          <Reveal delay={80}>
            <h2 id="after-register-title" className="display mt-6 max-w-2xl text-[clamp(1.75rem,4vw,2.625rem)] text-ink">
              Sign up once, then carry your gate pass
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">
              Finish the form above and your card becomes the key. Check free bays before you drive in and see
              every entry on your own record.
            </p>
          </Reveal>
        </div>

        <SplitStage className="mt-14 sm:mt-16">
          {/* Left — registering */}
          <div className="device device-left">
            <IPhone label="Creating a SPARC account on a phone, step 2 of 3">
              <RegisterPhone />
            </IPhone>
          </div>

          {/* Right — live slots */}
          <div className="device device-right">
            <IPhone label="Live campus slot availability by deck">
              <SlotsPhone />
            </IPhone>
          </div>

          {/* Front — the pass */}
          <div className="device device-front">
            <IPhone label="The SPARC campus gate pass with plate and recent entries">
              <PassPhone />
            </IPhone>
          </div>
        </SplitStage>

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-ink-muted sm:mt-14">
          {["Register · 3 steps", "Gate pass · always on you", "Slots · live by deck"].map((label) => (
            <li key={label} className="flex items-center gap-2.5">
              <span aria-hidden className="size-1 rounded-full bg-gold/70" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
