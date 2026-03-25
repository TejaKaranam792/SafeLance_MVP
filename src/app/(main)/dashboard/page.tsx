"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import JobCard, { type JobData } from "@/components/JobCard";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS, RPC_URL, MILESTONE_STATUS } from "@/lib/contract";
import { useWallet } from "@/components/WalletContext";
import { Plus, UserCircle, LayoutGrid, Wallet, Bell, Loader2 } from "lucide-react";

function buildProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

async function fetchAllJobs(): Promise<JobData[]> {
  const provider = buildProvider();
  const contract = new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, provider);

  const count: bigint = await contract.jobCount();
  if (count === 0n) return [];

  const jobs: JobData[] = [];
  const promises = Array.from({ length: Number(count) }, (_, i) =>
    contract
      .getJob(i)
      .then(
        ([client, title, description, totalFunded, createdAt, milestoneCount]: [
          string, string, string, bigint, bigint, number
        ]) => {
          jobs.push({ id: i, client, title, description, totalFunded, createdAt, milestoneCount: Number(milestoneCount) });
        }
      )
      .catch(() => null)
  );

  await Promise.all(promises);
  return jobs.sort((a, b) => Number(b.createdAt - a.createdAt));
}

// Fetch job metadata from Supabase for a specific wallet
async function fetchMyJobMeta(address: string): Promise<Record<number, string>> {
  const res = await fetch(`/api/jobs?address=${encodeURIComponent(address)}&_t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" }
  });
  if (!res.ok) return {};
  const data: Array<{ chain_job_id: string, freelancer_status: string }> = await res.json();
  
  const meta: Record<number, string> = {};
  data.forEach((j) => {
    meta[Number(j.chain_job_id)] = j.freelancer_status || "pending";
  });
  return meta;
}

// Fetch milestone statuses to detect if all are pending (unfunded)
async function fetchJobMilestoneStatuses(jobId: number): Promise<number[]> {
  if (!MILESTONE_CONTRACT_ADDRESS) return [];
  try {
    const provider = buildProvider();
    const contract = new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, provider);
    const [, , , , , , milestoneCount] = await contract.getJob(jobId);
    const promises = Array.from({ length: Number(milestoneCount) }, (_, i) =>
      contract.getMilestone(jobId, i).then(([, , status]: [string, bigint, number]) => status)
    );
    return await Promise.all(promises);
  } catch {
    return [];
  }
}

type DashTab = "my" | "all";

export default function DashboardPage() {
  const { account, connectWallet } = useWallet();

  const [activeTab, setActiveTab] = useState<DashTab>("my");
  const [allJobs, setAllJobs] = useState<JobData[]>([]);
  
  const [myJobsMeta, setMyJobsMeta] = useState<Record<number, string>>({});
  const [actionRequiredIds, setActionRequiredIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  // Load all on-chain jobs
  const loadJobs = useCallback(async () => {
    if (!MILESTONE_CONTRACT_ADDRESS) {
      setError("MILESTONE_CONTRACT_ADDRESS not set. Deploy the contract and update .env.local.");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllJobs();
      setAllJobs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load jobs. Check your RPC URL and contract address.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load "My Jobs" from Supabase + detect action required
  const loadMyJobs = useCallback(async () => {
    if (!account) return;
    setMyJobsLoading(true);
    try {
      const meta = await fetchMyJobMeta(account);
      setMyJobsMeta(meta);

      const actionIds = new Set<number>();
      await Promise.all(
        Object.keys(meta).map(async (key) => {
          const jobId = Number(key);
          const status = meta[jobId];
          const job = allJobs.find((j) => j.id === jobId);
          
          if (!job) return;
          const isMeClient = job.client.toLowerCase() === account.toLowerCase();
          const isMeFreelancer = !isMeClient; // if we are in this list and not the client, we are a freelancer

          // 1. Freelancer needs to Accept or Reject
          if (isMeFreelancer && status === "pending") {
            actionIds.add(jobId);
            return;
          }

          const statuses = await fetchJobMilestoneStatuses(jobId);
          const allPending = statuses.length > 0 && statuses.every((s) => MILESTONE_STATUS[s as keyof typeof MILESTONE_STATUS] === "Pending");

          // 2. Client Notifications
          if (isMeClient) {
            if (status === "rejected") {
              actionIds.add(jobId); // Need to acknowledge
            } else if (status === "accepted" && allPending) {
              actionIds.add(jobId); // Need to fundamentally fund
            }
          }
        })
      );
      setActionRequiredIds(actionIds);
    } finally {
      setMyJobsLoading(false);
    }
  }, [account, allJobs]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15_000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  useEffect(() => {
    if (account && allJobs.length >= 0) {
      loadMyJobs();
    }
  }, [account, allJobs, loadMyJobs]);


  useEffect(() => {
    if (!account) setActiveTab("all");
  }, [account]);

  const handleUpdateStatus = async (jobId: number, status: "accepted" | "rejected") => {
    if (!account) return;
    setUpdatingStatus(jobId);
    try {
      const res = await fetch("/api/jobs/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainJobId: jobId,
          status,
          freelancerAddress: account
        })
      });
      if (res.ok) {
        await loadMyJobs();
      } else {
        const errData = await res.json();
        alert(`Failed to update status: ${errData.error}`);
        console.error("Status Update Error:", errData);
      }
    } catch (err: any) {
      alert(`Network error updating status: ${err.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const myJobs = allJobs.filter((j) => myJobsMeta[j.id] !== undefined);
  const actionRequiredJobs = myJobs.filter((j) => actionRequiredIds.has(j.id));
  const otherMyJobs = myJobs.filter((j) => !actionRequiredIds.has(j.id));

  const displayJobs = activeTab === "my" ? myJobs : allJobs;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Job Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {loading
              ? "Loading…"
              : `${allJobs.length} job${allJobs.length !== 1 ? "s" : ""} on-chain · refreshes every 15 s`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app?tab=freelancer"
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-all duration-200"
          >
            <UserCircle className="h-4 w-4" />
            My Profile
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:-translate-y-0.5 border border-violet-500/30 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Create Job
          </Link>
        </div>
      </div>

      {/* Wallet CTA (if not connected) */}
      {!account && (
        <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">Connect your wallet to see your jobs</p>
              <p className="text-xs text-zinc-400">Freelancers: see jobs assigned to your address. Clients: track jobs you've created.</p>
            </div>
          </div>
          <button
            onClick={connectWallet}
            className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-500/20"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 flex rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur max-w-xs">
        {([
          { key: "my" as DashTab, label: "My Jobs", icon: <Wallet className="h-4 w-4" /> },
          { key: "all" as DashTab, label: "All Jobs", icon: <LayoutGrid className="h-4 w-4" /> },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            disabled={key === "my" && !account}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === key
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {icon}
            {label}
            {key === "my" && account && actionRequiredIds.size > 0 && (
              <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse">
                {actionRequiredIds.size}
              </span>
            )}
            {key === "my" && account && actionRequiredIds.size === 0 && myJobs.length > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                {myJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-violet-400" />
            <p className="text-sm text-zinc-500">Fetching jobs from chain…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : activeTab === "my" ? (
        /* ── MY JOBS ─────────────────────────────────── */
        myJobsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin h-6 w-6 text-violet-400" />
              <p className="text-xs text-zinc-500">Loading your jobs…</p>
            </div>
          </div>
        ) : myJobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-16 text-center flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-500 hover:border-white/20">
            <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-white/5 rounded-full p-4 mb-4 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <p className="text-3xl">🗂️</p>
            </div>
            <p className="text-base font-semibold text-white mb-1.5 relative z-10">No jobs yet</p>
            <p className="text-sm text-zinc-400 relative z-10 max-w-sm">
              You haven't created or been hired for any jobs yet. Start your journey by creating a new job.
            </p>
            <Link href="/app" className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all z-10">
              Create a job →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Required */}
            {actionRequiredJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
                    Action Required — {actionRequiredJobs.length} notification{actionRequiredJobs.length !== 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {actionRequiredJobs.map((job) => {
                    const isMeClient = job.client.toLowerCase() === account?.toLowerCase();
                    const isMeFreelancer = !isMeClient;
                    const status = myJobsMeta[job.id];
                    
                    return (
                      <div key={job.id} className="flex flex-col gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 relative">
                        {isMeFreelancer && status === "pending" && (
                          <div className="mb-2 text-xs text-orange-300">
                            <strong>New Gig Offer!</strong> The client has hired you. Please accept or reject below.
                          </div>
                        )}
                        {!isMeFreelancer && status === "accepted" && (
                          <div className="mb-2 text-xs text-emerald-400">
                            <strong>Offer Accepted!</strong> Click View Details to fund the milestones and begin work.
                          </div>
                        )}
                        {!isMeFreelancer && status === "rejected" && (
                          <div className="mb-2 text-xs text-red-400">
                            <strong>Offer Rejected.</strong> The freelancer declined your job offer.
                          </div>
                        )}
                        
                        <JobCard job={job} freelancerStatus={status} onRefresh={loadMyJobs} />
                        
                        {isMeFreelancer && status === "pending" && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                              onClick={() => handleUpdateStatus(job.id, "rejected")}
                              disabled={updatingStatus === job.id}
                              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition-all disabled:opacity-50"
                            >
                              {updatingStatus === job.id ? "Updating..." : "Reject Offer"}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(job.id, "accepted")}
                              disabled={updatingStatus === job.id}
                              className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all disabled:opacity-50"
                            >
                              {updatingStatus === job.id ? "Updating..." : "Accept Offer"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My other jobs */}
            {otherMyJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Your Jobs · {otherMyJobs.length}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {otherMyJobs.map((job) => (
                    <JobCard key={job.id} job={job} freelancerStatus={myJobsMeta[job.id]} onRefresh={loadMyJobs} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ── ALL JOBS ─────────────────────────────────── */
        displayJobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.01] p-16 text-center flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-500 hover:border-white/20">
            <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-white/5 rounded-full p-4 mb-4 ring-1 ring-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <p className="text-3xl">📋</p>
            </div>
            <p className="text-base font-semibold text-white mb-1.5 relative z-10">No jobs found</p>
            <p className="text-sm text-zinc-400 relative z-10 max-w-sm">
              There are currently no active jobs on the platform. Let's fix that!
            </p>
            <Link href="/app" className="mt-5 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20 transition-all z-10">
              Create your first job →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayJobs.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={loadJobs} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
