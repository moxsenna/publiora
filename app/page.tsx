import { MarketingShell } from "@/components/layout/MarketingShell";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Pricing } from "@/components/marketing/Pricing";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
    </MarketingShell>
  );
}
