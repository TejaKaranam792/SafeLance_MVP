"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Briefcase, DollarSign, AlertTriangle, CheckCircle2,
  Star, LogOut, RefreshCw, Shield, TrendingUp, Clock,
  ChevronRight, XCircle, Activity, Layers
} from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────
interface Stats {
  freelancerCount: number;
  jobCount: number;
  distinctClients: number;
  milestoneCount: number;
  openDisputes: number;
  resolvedDisputes: number;
  totalDisputes: number;
  ratingCount: number;
}

interface Job {
  id: string;
  chain_job_id: string;
  title: string;
  client_address: string;
  freelancer_address: string;
  created_at: string;
}

interface Freelancer {
  id: string;
  full_name: string;
  email: string;
  eth_address: string;
  skills: string;
  created_at: string;
}

interface Dispute {
  id: string;
  chain_job_id: string;
  milestone_index: number;
  client_address: string;
  freelancer_address: string;
  status: string;
  created_at: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
function short(addr: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusColor(status: string) {
  if (status.startsWith("resolved_freelancer")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  if (status.startsWith("resolved_client")) return "bg-blue-500/15 text-blue-400 border-blue-500/25";
  if (status === "evidence_complete") return "bg-amber-500/15 text-amber-400 border-amber-500/25";
  if (["client_submitted", "freelancer_submitted"].includes(status)) return "bg-orange-500/15 text-orange-400 border-orange-500/25";
  return "bg-red-500/15 text-red-400 border-red-500/25"; // open
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    open: "Open",
    client_submitted: "Client Submitted",
    freelancer_submitted: "FL Submitted",
    evidence_complete: "Evidence Ready",
    resolved_freelancer: "Resolved → FL",
    resolved_client: "Resolved → Client",
  };
  return map[status] ?? status;
}

// ───────────────────────────────────────────────────────────────────────────
// Stat Card
// ───────────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, gradient, sub,
}: {
  label: string; value: number | string; icon: React.ElementType;
  gradient: string; sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5 flex flex-col gap-3 group hover:border-white/15 transition-all duration-300">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
      {/* glow */}
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Section header
// ───────────────────────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
        <Icon className="h-4 w-4 text-violet-400" />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto text-xs font-medium text-zinc-500 bg-white/5 border border-white/8 rounded-full px-2.5 py-0.5">
          {count}
        </span>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main component
// ───────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "freelancers" | "disputes">("overview");

  // Guard
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_session") !== "true") {
      router.replace("/admin");
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json();
      setStats(data.stats);
      setJobs(data.recentJobs);
      setFreelancers(data.recentFreelancers);
      setDisputes(data.disputes);
      setLastRefresh(new Date());
    } catch {
      // silent — will show skeleton
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function logout() {
    sessionStorage.removeItem("admin_session");
    router.push("/admin");
  }

  // ── Skeleton placeholder ──────────────────────────────────────────────────
  const pulse = "animate-pulse bg-white/5 rounded-xl";

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-violet-700/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-indigo-700/8 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Shield className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-none">
                Safe<span className="text-violet-400">Lance</span>
              </div>
              <div className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest mt-0.5">
                Admin Console
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-600">
                <Clock className="h-3 w-3" />
                {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:border-white/15 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Monitor platform activity, users, and disputes in real time.
          </p>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${pulse} h-36`} />
            ))
          ) : stats ? (
            <>
              <StatCard
                label="Freelancers"
                value={stats.freelancerCount}
                icon={Users}
                gradient="from-violet-500 to-violet-700"
                sub="registered on platform"
              />
              <StatCard
                label="Clients"
                value={stats.distinctClients}
                icon={Briefcase}
                gradient="from-indigo-500 to-indigo-700"
                sub="unique wallet addresses"
              />
              <StatCard
                label="Total Jobs"
                value={stats.jobCount}
                icon={Layers}
                gradient="from-cyan-500 to-cyan-700"
                sub="posted on-chain"
              />
              <StatCard
                label="Milestones"
                value={stats.milestoneCount}
                icon={TrendingUp}
                gradient="from-emerald-500 to-emerald-700"
                sub="escrow milestones"
              />
              <StatCard
                label="Open Disputes"
                value={stats.openDisputes}
                icon={AlertTriangle}
                gradient="from-red-500 to-red-700"
                sub="awaiting resolution"
              />
              <StatCard
                label="Resolved Disputes"
                value={stats.resolvedDisputes}
                icon={CheckCircle2}
                gradient="from-teal-500 to-teal-700"
                sub="successfully closed"
              />
              <StatCard
                label="Total Disputes"
                value={stats.totalDisputes}
                icon={Activity}
                gradient="from-amber-500 to-amber-700"
                sub="all time"
              />
              <StatCard
                label="Reviews Given"
                value={stats.ratingCount}
                icon={Star}
                gradient="from-pink-500 to-pink-700"
                sub="on-chain ratings"
              />
            </>
          ) : (
            <div className="col-span-full text-center text-zinc-600 py-8">
              Failed to load stats. Check your Supabase connection.
            </div>
          )}
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1.5 mb-6 border-b border-white/6 pb-0">
          {(["overview", "jobs", "freelancers", "disputes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? "bg-violet-600/20 text-violet-300 border-b-2 border-violet-500"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab}
              {tab === "disputes" && stats && stats.openDisputes > 0 && (
                <span className="ml-1.5 text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                  {stats.openDisputes}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Recent Jobs */}
            <div className="rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl p-5">
              <SectionHead icon={Layers} title="Recent Jobs" count={jobs.length} />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`${pulse} h-12`} />)}
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-8">No jobs found.</p>
              ) : (
                <div className="space-y-2">
                  {jobs.slice(0, 5).map((j) => (
                    <div key={j.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-3 hover:border-white/10 transition-all group">
                      <div className="h-2 w-2 rounded-full bg-violet-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{j.title || `Job #${j.chain_job_id}`}</p>
                        <p className="text-xs text-zinc-600">{short(j.client_address)} → {short(j.freelancer_address)}</p>
                      </div>
                      <span className="text-xs text-zinc-600 flex-shrink-0">{fmt(j.created_at)}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Freelancers */}
            <div className="rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl p-5">
              <SectionHead icon={Users} title="Recent Freelancers" count={freelancers.length} />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`${pulse} h-12`} />)}
                </div>
              ) : freelancers.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-8">No freelancers registered.</p>
              ) : (
                <div className="space-y-2">
                  {freelancers.slice(0, 5).map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-3 hover:border-white/10 transition-all">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {(f.full_name || "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{f.full_name}</p>
                        <p className="text-xs text-zinc-600 truncate">{f.email}</p>
                      </div>
                      <span className="text-xs text-zinc-600 flex-shrink-0">{fmt(f.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disputes summary */}
            <div className="xl:col-span-2 rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl p-5">
              <SectionHead icon={AlertTriangle} title="Open Disputes" count={disputes.filter(d => !d.status.startsWith("resolved")).length} />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`${pulse} h-14`} />)}
                </div>
              ) : disputes.filter(d => !d.status.startsWith("resolved")).length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">No open disputes — platform is healthy!</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {disputes.filter(d => !d.status.startsWith("resolved")).slice(0, 5).map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">Job #{d.chain_job_id} · Milestone {d.milestone_index}</p>
                        <p className="text-xs text-zinc-600">{short(d.client_address)} vs {short(d.freelancer_address)}</p>
                      </div>
                      <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 uppercase tracking-wider ${statusColor(d.status)}`}>
                        {statusLabel(d.status)}
                      </span>
                      <span className="text-xs text-zinc-600">{fmt(d.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Jobs Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "jobs" && (
          <div className="rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6">
              <SectionHead icon={Layers} title="All Jobs" count={jobs.length} />
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`${pulse} h-14`} />)}
              </div>
            ) : jobs.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-12">No jobs found in the database.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {["Job ID", "Title", "Client", "Freelancer", "Created"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j, i) => (
                      <tr key={j.id} className={`border-b border-white/4 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "bg-white/1" : ""}`}>
                        <td className="px-5 py-3 font-mono text-xs text-violet-400">#{j.chain_job_id}</td>
                        <td className="px-5 py-3 text-white font-medium max-w-[200px] truncate">{j.title || "—"}</td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-400">{short(j.client_address)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-400">{short(j.freelancer_address)}</td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">{fmt(j.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Freelancers Tab ───────────────────────────────────────────────── */}
        {activeTab === "freelancers" && (
          <div className="rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6">
              <SectionHead icon={Users} title="Registered Freelancers" count={freelancers.length} />
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className={`${pulse} h-14`} />)}
              </div>
            ) : freelancers.length === 0 ? (
              <p className="text-center text-zinc-600 text-sm py-12">No freelancers registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {["Name", "Email", "Wallet", "Skills", "Joined"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {freelancers.map((f, i) => (
                      <tr key={f.id} className={`border-b border-white/4 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "bg-white/1" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0">
                              <span className="text-[10px] font-bold text-white">{(f.full_name || "?")[0].toUpperCase()}</span>
                            </div>
                            <span className="text-white font-medium">{f.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs">{f.email}</td>
                        <td className="px-5 py-3 font-mono text-xs text-violet-400">{short(f.eth_address)}</td>
                        <td className="px-5 py-3 text-zinc-400 text-xs max-w-[180px] truncate">{f.skills}</td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">{fmt(f.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Disputes Tab ─────────────────────────────────────────────────── */}
        {activeTab === "disputes" && (
          <div className="rounded-2xl border border-white/8 bg-white/2 backdrop-blur-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/6">
              <SectionHead icon={AlertTriangle} title="All Disputes" count={disputes.length} />
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`${pulse} h-16`} />)}
              </div>
            ) : disputes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-zinc-600">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="text-sm">No disputes on record. The platform is clean! ✨</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/6">
                      {["Job ID", "Milestone", "Client", "Freelancer", "Status", "Date", "Action"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.map((d, i) => (
                      <tr key={d.id} className={`border-b border-white/4 hover:bg-white/3 transition-colors ${i % 2 === 0 ? "bg-white/1" : ""}`}>
                        <td className="px-5 py-3 font-mono text-xs text-violet-400">#{d.chain_job_id}</td>
                        <td className="px-5 py-3 text-zinc-300 text-center">{d.milestone_index}</td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-400">{short(d.client_address)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-zinc-400">{short(d.freelancer_address)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 uppercase tracking-wider ${statusColor(d.status)}`}>
                            {statusLabel(d.status)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">{fmt(d.created_at)}</td>
                        <td className="px-5 py-3">
                          {d.status.startsWith("resolved") ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-500">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Done
                            </span>
                          ) : (
                            <a
                              href={`/admin/disputes?job=${d.chain_job_id}&ms=${d.milestone_index}`}
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              <ChevronRight className="h-3.5 w-3.5" /> Resolve
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Dispute legend */}
            <div className="px-5 py-4 border-t border-white/6 flex flex-wrap gap-3">
              {[
                { label: "Open", cls: "bg-red-500/15 text-red-400 border-red-500/25" },
                { label: "Submitted", cls: "bg-orange-500/15 text-orange-400 border-orange-500/25" },
                { label: "Evidence Ready", cls: "bg-amber-500/15 text-amber-400 border-amber-500/25" },
                { label: "Resolved → FL", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
                { label: "Resolved → Client", cls: "bg-blue-500/15 text-blue-400 border-blue-500/25" },
              ].map((item) => (
                <span key={item.label} className={`text-[10px] font-medium border rounded-full px-2.5 py-1 uppercase tracking-wider ${item.cls}`}>
                  {item.label}
                </span>
              ))}
              <span className="text-[10px] text-zinc-600 self-center ml-1">— Status legend</span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-6 mt-4 border-t border-white/4">
        <div className="flex items-center justify-between text-[11px] text-zinc-700">
          <span>SafeLance Admin Console · Restricted Access</span>
          <button onClick={logout} className="flex items-center gap-1 text-red-700 hover:text-red-500 transition-colors">
            <XCircle className="h-3.5 w-3.5" /> End session
          </button>
        </div>
      </footer>
    </div>
  );
}
