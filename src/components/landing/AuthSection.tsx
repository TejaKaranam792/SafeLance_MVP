import Link from "next/link";
import { ArrowRight, Shield, Zap, Lock } from "lucide-react";

const highlights = [
  { icon: <Shield className="h-5 w-5 text-purple-400" />, text: "Non-custodial" },
  { icon: <Zap className="h-5 w-5 text-yellow-400" />, text: "Gasless transactions" },
  { icon: <Lock className="h-5 w-5 text-green-400" />, text: "Audited contracts" },
];

export default function AuthCtaSection() {
  return (
    <section id="auth" className="py-24 md:py-32 relative">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="rounded-3xl border border-purple-500/30 bg-[#0a0a0c]/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 md:p-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold uppercase tracking-widest text-purple-400 mb-6 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                Get Started
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
                Your on-chain workspace
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
                  starts here.
                </span>
              </h2>
              <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-lg font-medium">
                Sign up with email or connect your MetaMask wallet. No KYC,
                no lengthy onboarding — just connect and start working securely.
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6">
                {highlights.map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                    <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{icon}</span>
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Buttons */}
            <div className="flex flex-col gap-5 lg:pl-10">
              <Link
                href="/auth?tab=signup"
                className="group relative w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:-translate-y-1"
              >
                Create Free Account
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/auth?tab=login"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
              >
                Log In to SafeLance
              </Link>

              <Link
                href="/auth"
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 px-8 py-4 text-base font-bold text-orange-400 transition-all duration-300 hover:-translate-y-1 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
              >
                <span className="text-xl drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" role="img" aria-label="fox">🦊</span>
                Continue with MetaMask
              </Link>

              <p className="text-center text-sm text-zinc-500 mt-3 font-medium">
                Free forever for freelancers · No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
