const steps = [
  {
    number: "01",
    title: "Create a Job",
    description:
      "Post a job with a title, description, and freelancer's wallet address. Sign with MetaMask — no gas required.",
    connector: true,
  },
  {
    number: "02",
    title: "Fund the Escrow",
    description:
      "Send ETH to the smart contract. Funds are locked and visible on-chain. Neither party can withdraw unilaterally.",
    connector: true,
  },
  {
    number: "03",
    title: "Complete the Work",
    description:
      "Freelancer delivers the work. Both parties can track milestone progress in the dashboard in real time.",
    connector: true,
  },
  {
    number: "04",
    title: "Release Payment",
    description:
      "Client approves and releases funds. Payment goes directly to the freelancer's wallet — instant and trustless.",
    connector: false,
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold uppercase tracking-widest text-blue-400 mb-6 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            From job post to payment
            <br />
            <span className="text-zinc-500">in four simple steps.</span>
          </h2>
        </div>

        {/* Steps: desktop horizontal flow, mobile vertical */}
        <div className="relative">
          <div className="hidden md:flex items-start justify-between gap-0">
            {steps.map(({ number, title, description, connector }) => (
              <div key={number} className="flex flex-1 items-start group">
                <div className="flex-1 flex flex-col items-center text-center px-4">
                  {/* Circle */}
                  <div className="relative mb-6">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                      <span className="text-xl font-black text-purple-400 drop-shadow-sm">{number}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
                </div>
                {connector && (
                  <div className="flex-shrink-0 mt-8 w-12 flex items-center">
                    <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/40 to-indigo-500/40" />
                    <div className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.8)]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile vertical */}
          <div className="flex flex-col gap-8 md:hidden">
            {steps.map(({ number, title, description, connector }) => (
              <div key={number} className="flex gap-5 group">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.15)] group-hover:scale-110 transition-transform duration-300">
                    <span className="text-base font-black text-purple-400">{number}</span>
                  </div>
                  {connector && <div className="w-0.5 flex-1 bg-gradient-to-b from-purple-500/30 to-indigo-500/30 mt-3 mb-0 min-h-[40px]" />}
                </div>
                <div className="pb-8 pt-1">
                  <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
