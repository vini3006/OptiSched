import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

import { HeroSection } from "@/components/landing/HeroSection";
import { AboutSection } from "@/components/landing/AboutSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";

export function LandingPage() {
  return (
    <>
      <Navbar />

      <main>
        <HeroSection />
        <FeaturesSection />
        <AboutSection />
        <PricingSection />
      </main>

      <Footer />
    </>
  );
}
