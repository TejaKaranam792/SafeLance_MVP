import { CheckCircle, Clock, DollarSign, ChevronRight, ExternalLink } from "lucide-react";

const jobs = [
  {
    id: "J-0041",
    title: "Build a DeFi Analytics Dashboard",
    client: "0x3a4f...d91c",
    amount: "2.0 ETH",
    status: "Funded",
    statusColor: "text-green-400",
    statusBg: "bg-green-500/15 border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.15)]",
    statusIcon: <CheckCircle className="h-3 w-3" />,
    milestones: ["UI Design", "API Integration", "Testing"],
    progress: 33,
  },
  {
    id: "J-0038",
    title: "Smart Contract Audit",
    client: "0xb82e...a4f1",
    amount: "3.5 ETH",
    status: "In Progress",
    statusColor: "text-purple-400",
    statusBg: "bg-purple-500/15 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]",
    statusIcon: <Clock className="h-3 w-3" />,
    milestones: ["Review Codebase", "Report", "Final Sign-off"],
    progress: 66,
  },
  {
    id: "J-0035",
    title: "NFT Marketplace Landing Page",
    client: "0xf129...77cb",
    amount: "0.8 ETH",
    status: "Completed",
    statusColor: "text-zinc-400",
    statusBg: "bg-white/10 border-white/20",
    statusIcon: <DollarSign className="h-3 w-3" />,
    milestones: ["Design", "Development"],
    progress: 100,
  },
];

export default function DashboardPreviewSection() {
  return (
    <section className="py-24 md:py-32 relative">
      {/* Background elements */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute left-0 top-1/3 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold uppercase tracking-widest text-blue-400 mb-6 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
            Dashboard
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
            Track every job.
            <br />
            <span className="text-zinc-500">In real time. On-chain.</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
            Your personalized dashboard shows every job, milestone, and payment — live,
            secure, and transparent.
          </p>
        </div>

        {/* Dashboard mock */}
        <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 pointer-events-none" />
          
          {/* Mock title bar */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80 shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
            <div className="h-3 w-3 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="ml-4 text-xs font-medium text-zinc-500">SafeLance — Workspace</span>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-px bg-white/10 border-b border-white/10">
            {[
              { label: "Active Jobs", value: "3" },
              { label: "In Escrow", value: "6.3 ETH" },
              { label: "Earned Total", value: "14.2 ETH" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0a0a0c]/80 px-6 py-5">
                <p className="text-2xl font-black text-white drop-shadow-sm">{value}</p>
                <p className="text-sm font-medium text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Job list */}
          <div className="divide-y divide-white/10 bg-[#0a0a0c]/90">
            {jobs.map(({ id, title, client, amount, status, statusColor, statusBg, statusIcon, milestones, progress }) => (
              <div key={id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 hover:bg-white/5 transition-all duration-300 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono font-medium text-zinc-500">{id}</span>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${statusBg} ${statusColor}`}>
                      {statusIcon}
                      {status}
                    </span>
                  </div>
                  <p className="text-base font-bold text-white truncate mb-1">{title}</p>
                  <p className="text-xs font-medium text-zinc-500">Client: <span className="font-mono text-zinc-400">{client}</span></p>

                  {/* Milestone pills */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {milestones.map((m, i) => (
                      <span
                        key={m}
                        className={`text-[10px] font-bold rounded-full px-2.5 py-1 border ${
                          (i / milestones.length) * 100 < progress
                            ? "bg-green-500/10 border-green-500/30 text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.1)]"
                            : "bg-white/5 border-white/10 text-zinc-500"
                        }`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  {/* Progress ring */}
                  <div className="hidden sm:block relative h-14 w-14 group-hover:scale-105 transition-transform duration-300">
                    <svg className="rotate-[-90deg] drop-shadow-[0_0_5px_rgba(168,85,247,0.3)]" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="14" fill="none"
                        stroke="rgb(168,85,247)"
                        strokeWidth="3"
                        strokeDasharray={`${(progress / 100) * 87.96} 87.96`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                      {progress}%
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-white">{amount}</p>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-0.5">locked</p>
                  </div>

                  <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:border-purple-500/30 group-hover:text-purple-400 transition-all duration-300 shadow-sm">
                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
            <span className="text-sm font-medium text-zinc-500">Showing 3 of 12 jobs</span>
            <button className="flex items-center gap-1.5 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors group">
              View all jobs <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
