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
        ([client, freelancer, title, description, totalFunded, createdAt, milestoneCount]: [
          string, string, string, string, bigint, bigint, number
        ]) => {
          jobs.push({ id: i, client, freelancer, title, description, totalFunded, createdAt, milestoneCount: Number(milestoneCount) });
        }
      )
      .catch(() => null)
  );

  await Promise.all(promises);
  return jobs.sort((a, b) => Number(b.createdAt - a.createdAt));
}

// Fetch jobs from Supabase meta for a specific wallet
async function fetchMyJobIds(address: string): Promise<Set<number>> {
  const res = await fetch(`/api/jobs?address=${encodeURIComponent(address)}`);
  if (!res.ok) return new Set();
  const data: Array<{ chain_job_id: string }> = await res.json();
  return new Set(data.map((j) => Number(j.chain_job_id)));
}

// Fetch milestone statuses to detect "action required" (all Pending = unfunded)
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
  const [myJobIds, setMyJobIds] = useState<Set<number>>(new Set());
  const [actionRequiredIds, setActionRequiredIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const ids = await fetchMyJobIds(account);
      setMyJobIds(ids);

      // Find jobs where the user is the freelancer and all milestones are still Pending (0)
      const actionIds = new Set<number>();
      await Promise.all(
        [...ids].map(async (jobId) => {
          const job = allJobs.find((j) => j.id === jobId);
          if (!job) return;
          if (job.freelancer.toLowerCase() !== account.toLowerCase()) return;
          const statuses = await fetchJobMilestoneStatuses(jobId);
          const allPending = statuses.length > 0 && statuses.every((s) => MILESTONE_STATUS[s as keyof typeof MILESTONE_STATUS] === "Pending");
          if (allPending) actionIds.add(jobId);
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

  // Auto-switch to "all" if no wallet is connected
  useEffect(() => {
    if (!account) setActiveTab("all");
  }, [account]);

  const myJobs = allJobs.filter((j) => myJobIds.has(j.id));
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
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200"
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
            {key === "my" && account && myJobs.length > 0 && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-xs font-bold">
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
          <div className="rounded-2xl border border-white/8 bg-white/3 p-16 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm font-medium text-white mb-1">No jobs yet</p>
            <p className="text-xs text-zinc-500">
              You haven't created or been hired for any jobs.{" "}
              <Link href="/app" className="text-violet-400 hover:text-violet-300 underline">
                Create a job →
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Action Required */}
            {actionRequiredJobs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                  <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
                    Action Required — {actionRequiredJobs.length} new job{actionRequiredJobs.length !== 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                  <p className="text-xs text-orange-300/80 mb-4">
                    A client has hired you for {actionRequiredJobs.length === 1 ? "this job" : "these jobs"}. 
                    Visit the job page to view the milestones — work begins once the client funds each milestone.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {actionRequiredJobs.map((job) => (
                      <JobCard key={job.id} job={job} onRefresh={loadMyJobs} />
                    ))}
                  </div>
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
                    <JobCard key={job.id} job={job} onRefresh={loadMyJobs} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ── ALL JOBS ─────────────────────────────────── */
        displayJobs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-16 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm font-medium text-white mb-1">No jobs found</p>
            <p className="text-xs text-zinc-500">
              No jobs yet.{" "}
              <Link href="/app" className="text-violet-400 hover:text-violet-300 underline">
                Create your first job →
              </Link>
            </p>
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
