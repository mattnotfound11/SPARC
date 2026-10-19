import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { StatStrip } from "@/components/site/StatStrip";
import { FeatureRows } from "@/components/site/FeatureRows";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { BenefitsGrid } from "@/components/site/BenefitsGrid";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { CtaBand } from "@/components/site/CtaBand";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <StatStrip />
        <FeatureRows />
        <ProcessSteps />
        <BenefitsGrid />
        <FaqAccordion />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
