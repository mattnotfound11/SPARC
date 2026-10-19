import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { StatStrip } from "@/components/site/StatStrip";
import { FeatureRows } from "@/components/site/FeatureRows";
import { PhoneShowcase } from "@/components/site/PhoneShowcase";
import { ProcessSteps } from "@/components/site/ProcessSteps";
import { BenefitsGrid } from "@/components/site/BenefitsGrid";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { CtaBand } from "@/components/site/CtaBand";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <Hero />
        <StatStrip />
        <FeatureRows />
        <PhoneShowcase
          titleId="screens-title"
          eyebrow="In your pocket"
          title="Your pass, your slots, your record"
          body="Register from your phone, carry the gate pass on it, and check which deck has room before you turn in off General Luna."
        />
        <ProcessSteps />
        <BenefitsGrid />
        <FaqAccordion />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
