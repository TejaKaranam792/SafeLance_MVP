"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import JobCard, { type JobData } from "@/components/JobCard";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS, RPC_URL } from "@/lib/contract";
import { Plus, UserCircle } from "lucide-react";

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
          string,
          string,
          string,
          string,
          bigint,
          bigint,
          number
        ]) => {
          jobs.push({
            id: i,
            client,
            freelancer,
            title,
            description,
            totalFunded,
            createdAt,
            milestoneCount: Number(milestoneCount),
          });
        }
      )
      .catch(() => null) // skip individual failures
  );

  await Promise.all(promises);
  return jobs.sort((a, b) => Number(b.createdAt - a.createdAt));
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!MILESTONE_CONTRACT_ADDRESS) {
      setError("MILESTONE_CONTRACT_ADDRESS not set. Deploy the contract and update .env.local.");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load jobs. Check your RPC URL and contract address.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    // Poll every 15 seconds
    const interval = setInterval(loadJobs, 15_000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const filtered = jobs;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Job Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {loading
              ? "Loading…"
              : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} on-chain · refreshes every 15 s`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick actions */}
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-violet-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <p className="text-sm text-zinc-500">Fetching jobs from chain…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
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
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} onRefresh={loadJobs} />
          ))}
        </div>
      )}
    </div>
  );
}
