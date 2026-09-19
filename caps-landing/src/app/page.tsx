/**
 * SPARC Landing Page — root route ( / )
 *
 * Full public informational page explaining SPARC to any visitor.
 * Login portals are below the fold as a secondary action.
 *
 * Page flow:
 *   1. Hero — cinematic intro with live telemetry widget + radar bg
 *   2. SubNav — sticky section navigation with active glow
 *   3. Stats — animated counters bar
 *   4. Overview — the challenge & solution
 *   5. Features — bento grid with SVG illustrations
 *   6. How It Works — 4-step flow with connector path
 *   7. Live Event Feed — scrolling access log
 *   8. Login Cards — Guard Console | Admin Dashboard
 *   9. Tech Stack — what it's built with
 *  10. Team — proponents & university credit
 */

import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { SubNav } from "@/components/SubNav";
import { OverviewSection } from "@/components/OverviewSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { LoginEntryCards } from "@/components/LoginEntryCards";
import { TechStackSection } from "@/components/TechStackSection";
import { TeamSection } from "@/components/TeamSection";
import { SiteFooter } from "@/components/SiteFooter";
import { Component as GradientBackground } from "@/components/ui/gradient-background-4";
import { FloatingTelemetry } from "@/components/FloatingTelemetry";
import { TelemetryProvider } from "@/components/TelemetryProvider";

/** Animated section divider — red to gold gradient line */
function SectionDivider() {
  return (
    <div className="relative mx-auto max-w-6xl px-8 lg:px-12">
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(204,27,43,0.3), rgba(212,175,55,0.4), rgba(204,27,43,0.3), transparent)",
          boxShadow: "0 0 12px rgba(204,27,43,0.15)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <TelemetryProvider>
      <SiteHeader />

      <main id="main-content" className="flex-1 relative z-10">
        {/* 1. Hero with ambient gradient + radar background */}
        <div className="relative w-full overflow-hidden">
          <GradientBackground />
          <Hero />
        </div>

        {/* 2. Secondary Navigation */}
        <SubNav />


        {/* 4. Overview */}
        <OverviewSection />

        <SectionDivider />

        {/* 5. Features */}
        <FeaturesSection />

        <SectionDivider />

        {/* 6. How it works */}
        <HowItWorksSection />

        {/* 7. Access Portals */}
        <LoginEntryCards />

        {/* 8. Tech Stack */}
        <TechStackSection />

        {/* 9. Team */}
        <TeamSection />
      </main>

      <SiteFooter />
      <FloatingTelemetry />
    </TelemetryProvider>
  );
}
