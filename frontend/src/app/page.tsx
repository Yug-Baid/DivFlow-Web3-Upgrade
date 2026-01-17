import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { MarketplaceSection } from "@/components/landing/MarketplaceSection";
import { SecuritySection } from "@/components/landing/SecuritySection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <MarketplaceSection />
        <FeaturesSection />
        <HowItWorksSection />
        <SecuritySection />
      </main>
      <Footer />
    </div>
  );
}
