import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { GateAccessCta } from "@/components/landing/GateAccessCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main id="main-content" className="flex-1">
        <LandingHero />
        <FeatureGrid />
        <GateAccessCta />
      </main>
      <LandingFooter />
    </>
  );
}
