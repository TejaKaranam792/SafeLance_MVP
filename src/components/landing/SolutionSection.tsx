import { Lock, Milestone, Zap } from "lucide-react";

const solutions = [
  {
    icon: <Lock className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />,
    title: "Smart Contract Escrow",
    description:
      "Funds are locked in an audited, tamper-proof smart contract. Neither party can access them until the agreed conditions are met.",
    highlight: "Funds go in. Rules come out.",
    gradient: "from-purple-500/10 to-transparent",
    border: "border-purple-500/30",
    iconBg: "bg-purple-500/10 shadow-[inset_0_2px_10px_rgba(168,85,247,0.2)]",
    shadow: "hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)]",
  },
  {
    icon: <Milestone className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />,
    title: "Milestone Payments",
    description:
      "Break projects into milestones. Each phase gets funded independently — reducing risk and ensuring both parties stay aligned.",
    highlight: "Pay as work progresses.",
    gradient: "from-blue-500/10 to-transparent",
    border: "border-blue-500/30",
    iconBg: "bg-blue-500/10 shadow-[inset_0_2px_10px_rgba(96,165,250,0.2)]",
    shadow: "hover:shadow-[0_10px_30px_rgba(96,165,250,0.15)]",
  },
  {
    icon: <Zap className="h-6 w-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />,
    title: "Gasless Transactions",
    description:
      "Our meta-transaction relay handles all gas fees. Clients and freelancers interact with Web3 without ever paying for gas.",
    highlight: "Zero gas. Full Web3.",
    gradient: "from-green-500/10 to-transparent",
    border: "border-green-500/30",
    iconBg: "bg-green-500/10 shadow-[inset_0_2px_10px_rgba(74,222,128,0.2)]",
    shadow: "hover:shadow-[0_10px_30px_rgba(74,222,128,0.15)]",
  },
];

export default function SolutionSection() {
  return (
    <section className="py-24 md:py-32 relative">
      {/* Divider gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-bold uppercase tracking-widest text-purple-400 mb-6 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
            The Solution
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            SafeLance removes the need
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm">
              to trust anyone.
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
            Every interaction is enforced by code, not contracts or handshakes.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map(({ icon, title, description, highlight, gradient, border, iconBg, shadow }) => (
            <div
              key={title}
              className={`relative overflow-hidden rounded-3xl border ${border} bg-[#0a0a0c]/80 backdrop-blur-sm p-8 group transition-all duration-300 hover:-translate-y-2 ${shadow}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${gradient} pointer-events-none opacity-50`} />
              
              <div className={`relative inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} border border-white/10 mb-6`}>
                {icon}
              </div>
              <h3 className="relative text-xl font-bold text-white mb-3">{title}</h3>
              <p className="relative text-sm text-zinc-400 leading-relaxed mb-6 font-medium">{description}</p>
              <p className="relative text-xs font-bold tracking-wide text-zinc-300 border-t border-white/10 pt-4 mt-auto uppercase">
                {highlight}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
