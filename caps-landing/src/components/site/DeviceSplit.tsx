import { MacBook } from "@/components/ui/MacBook";
import { SplitStage } from "@/components/ui/SplitStage";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RegisterScreen } from "@/components/screens/RegisterScreen";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { GateConsoleScreen } from "@/components/screens/GateConsoleScreen";

/**
 * Three laptops that start stacked and fan apart as the section arrives —
 * registration on the left, the admin dashboard in front, the gate console
 * on the right.
 */
export function DeviceSplit() {
  return (
    <section id="screens" aria-labelledby="screens-title" className="overflow-hidden px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="screens-title"
          eyebrow="On screen"
          title="Register in minutes, run the campus from one dashboard"
          body="The same system from both sides: what a driver fills in once, and what marshals and administrators watch all day."
        />

        <SplitStage className="mt-16 sm:mt-20">
          {/* Left — registration */}
          <div className="device device-left">
            <MacBook label="SPARC vehicle registration, step 2 of 3">
              <RegisterScreen />
            </MacBook>
          </div>

          {/* Right — gate console */}
          <div className="device device-right">
            <MacBook label="SPARC gate console showing a granted entry">
              <GateConsoleScreen />
            </MacBook>
          </div>

          {/* Front — dashboard */}
          <div className="device device-front">
            <MacBook label="SPARC admin dashboard with live gate feed and occupancy">
              <DashboardScreen />
            </MacBook>
          </div>
        </SplitStage>

        <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-ink-muted sm:mt-16">
          {["Registration · 3 steps", "Dashboard · live feed", "Gate console · 0.41s decisions"].map((label) => (
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
