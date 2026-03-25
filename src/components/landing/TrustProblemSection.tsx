import { AlertTriangle, XCircle, MessageSquareX } from "lucide-react";

const problems = [
  {
    icon: <XCircle className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />,
    title: "Freelancers get scammed",
    description:
      "Clients disappear after work is delivered. No way to enforce payment without going through costly legal systems.",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    hoverBorder: "hover:border-red-500/40",
    shadow: "hover:shadow-[0_10px_30px_rgba(248,113,113,0.1)]",
  },
  {
    icon: <AlertTriangle className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />,
    title: "Clients don't receive work",
    description:
      "Freelancers take the upfront payment and vanish. You have no recourse and no way to reclaim your funds.",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    hoverBorder: "hover:border-yellow-500/40",
    shadow: "hover:shadow-[0_10px_30px_rgba(250,204,21,0.1)]",
  },
  {
    icon: <MessageSquareX className="h-7 w-7 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />,
    title: "Payment disputes are endless",
    description:
      "Platforms charge high fees and take weeks to resolve conflicts — often with no clear outcome for either side.",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    hoverBorder: "hover:border-orange-500/40",
    shadow: "hover:shadow-[0_10px_30px_rgba(251,146,60,0.1)]",
  },
];

export default function TrustProblemSection() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-6xl px-6 relative z-10">
        {/* Section label */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold uppercase tracking-widest text-red-400 mb-6 shadow-[0_0_10px_rgba(248,113,113,0.1)]">
            The Problem
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            Freelancing is broken.
            <br />
            <span className="text-zinc-500">Trust shouldn't be a requirement.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
            Millions of dollars are lost every year to payment fraud, disputes, and
            broken promises in the freelance economy.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map(({ icon, title, description, bg, border, hoverBorder, shadow }) => (
            <div
              key={title}
              className={`rounded-3xl border ${border} ${bg} p-8 transition-all duration-300 hover:-translate-y-2 ${shadow} ${hoverBorder} backdrop-blur-sm`}
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a0a0c]/50 border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                {icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
