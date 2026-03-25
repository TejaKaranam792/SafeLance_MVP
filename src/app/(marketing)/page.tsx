import HeroSection from "@/components/landing/HeroSection";
import TrustProblemSection from "@/components/landing/TrustProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AuthSection from "@/components/landing/AuthSection";
import DashboardPreviewSection from "@/components/landing/DashboardPreviewSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <HeroSection />

      {/* Subtle section divider */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* Trust Problem */}
      <TrustProblemSection />

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* Solution */}
      <SolutionSection />

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* How It Works */}
      <section id="how-it-works">
        <HowItWorksSection />
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* Features */}
      <section id="features">
        <FeaturesSection />
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* Auth */}
      <section id="auth">
        <AuthSection />
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* Dashboard Preview */}
      <DashboardPreviewSection />

      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      {/* CTA */}
      <CtaSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
