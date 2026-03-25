import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-purple-600/10 blur-[100px]" />

      <div className="mx-auto max-w-5xl px-6 relative z-10">
        <div className="rounded-3xl border border-purple-500/30 bg-[#0a0a0c]/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 md:p-16 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/30 mb-8 mx-auto shadow-[0_0_15px_rgba(147,51,234,0.2)]">
            <Briefcase className="h-8 w-8 text-purple-400" />
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Start using SafeLance{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
              today.
            </span>
          </h2>
          <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Join thousands of freelancers and clients building a more trustworthy
            future of work — powered by smart contracts.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/app"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:-translate-y-1"
            >
              Create a Job
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/freelancers"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
              Join as Freelancer
            </Link>
          </div>

          <p className="text-sm text-zinc-500 mt-10 font-medium">
            No credit card required · Non-custodial · Audited contracts
          </p>
        </div>
      </div>
    </section>
  );
}
