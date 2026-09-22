import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { GateAccessCta } from "@/components/landing/GateAccessCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AmbientBlobs } from "@/components/brand/AmbientBlobs";

export default function LandingPage() {
  return (
    <div className="page-enter relative isolate flex flex-1 flex-col">
      <AmbientBlobs />
      <LandingHeader />
      <main id="main-content" className="flex-1">
        <LandingHero />
        <div className="fade-in delay-3">
          <FeatureGrid />
          <GateAccessCta />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
