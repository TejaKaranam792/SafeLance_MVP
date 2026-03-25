import { Zap, Lock, Eye, Shield, Globe, Clock } from "lucide-react";

const features = [
  {
    icon: <Zap className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />,
    title: "Gasless Transactions",
    description:
      "Our relay network covers all gas fees. Users only sign messages — never spend ETH on fees.",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    hoverBorder: "hover:border-yellow-500/40",
  },
  {
    icon: <Lock className="h-6 w-6 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" />,
    title: "Secure Escrow",
    description:
      "Funds are locked in audited smart contracts. Both parties are protected from the moment ETH is deposited.",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    hoverBorder: "hover:border-purple-500/40",
  },
  {
    icon: <Eye className="h-6 w-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />,
    title: "Transparent Payments",
    description:
      "Every transaction is on-chain and visible. No hidden fees, no black-box intermediaries.",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    hoverBorder: "hover:border-indigo-500/40",
  },
  {
    icon: <Shield className="h-6 w-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />,
    title: "Web3-Powered Trust",
    description:
      "Code enforces agreements. No courts, no arbitrators, no waiting — just math and cryptography.",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    hoverBorder: "hover:border-green-500/40",
  },
  {
    icon: <Globe className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />,
    title: "Global & Borderless",
    description:
      "Pay anyone, anywhere in the world instantly. No banking restrictions or currency conversion headaches.",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    hoverBorder: "hover:border-blue-500/40",
  },
  {
    icon: <Clock className="h-6 w-6 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />,
    title: "Instant Settlement",
    description:
      "Payments clear in seconds, not days. No waiting for ACH transfers or wire confirmations.",
    bg: "bg-pink-500/5",
    border: "border-pink-500/20",
    hoverBorder: "hover:border-pink-500/40",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-bold uppercase tracking-widest text-green-400 mb-6 shadow-[0_0_10px_rgba(74,222,128,0.15)]">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            Everything you need.
            <br />
            <span className="text-zinc-500">Nothing you don&apos;t.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
            Built for the future of work — combining Web3 security with Web2 simplicity.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, description, bg, border, hoverBorder }) => (
            <div
              key={title}
              className={`rounded-3xl border ${border} ${bg} p-8 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${hoverBorder} backdrop-blur-sm`}
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a0a0c]/50 border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
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
