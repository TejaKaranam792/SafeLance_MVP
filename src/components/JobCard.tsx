"use client";

import Link from "next/link";
import { ethers } from "ethers";

export interface JobData {
  id: number;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  totalFunded: bigint;
  createdAt: bigint;
  milestoneCount: number;
}

interface JobCardProps {
  job: JobData;
  freelancerStatus?: string;
  onRefresh: () => void;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function JobCard({ job, freelancerStatus }: JobCardProps) {
  const fundedEth = ethers.formatEther(job.totalFunded);

  return (
    <div className="group relative w-full h-full flex flex-col rounded-2xl border border-white/8 bg-white/3 p-5 backdrop-blur transition-all duration-300 hover:border-white/15 hover:bg-white/5 hover:shadow-2xl hover:shadow-black/30">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 max-w-[70%]">
          <span className="text-xs font-mono text-zinc-500">#{job.id}</span>
          <span className="text-sm font-semibold text-white truncate">{job.title || "Untitled Job"}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {job.totalFunded > 0n && (
            <span className="text-sm font-semibold text-white whitespace-nowrap">
              {fundedEth} ETH
            </span>
          )}
          {freelancerStatus === "pending" && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              Pending Acceptance
            </span>
          )}
          {freelancerStatus === "rejected" && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              Offer Rejected
            </span>
          )}
          {freelancerStatus === "accepted" && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
              Accepted
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-300 mb-4 line-clamp-2">
        {job.description}
      </p>

      {/* Addresses */}
      <div className="space-y-1.5 text-xs text-zinc-500 mb-4">
        <div className="flex justify-between">
          <span>Client</span>
          <span className="font-mono text-zinc-400">{truncate(job.client)}</span>
        </div>
        <div className="flex justify-between">
          <span>Freelancer</span>
          <span className="font-mono text-zinc-400">
            {truncate(job.freelancer)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Milestones</span>
          <span className="text-zinc-400">{job.milestoneCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Created</span>
          <span>
            {new Date(Number(job.createdAt) * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/jobs/${job.id}`}
          className="w-full text-center flex-none rounded-xl border border-violet-500/30 bg-violet-500/8 hover:bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-all duration-200"
        >
          View Details &amp; Milestones →
        </Link>
      </div>
    </div>
  );
}
