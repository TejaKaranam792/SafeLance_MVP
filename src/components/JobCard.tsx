"use client";

import Link from "next/link";
import { ethers } from "ethers";

export interface JobData {
  id: number;
  client: string;
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
    <div className="group relative w-full h-full flex flex-col rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-white/10 hover:bg-zinc-900/60 hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)] overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-500/10 blur-[60px] pointer-events-none group-hover:bg-violet-500/20 transition-all duration-700" />
      
      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 mb-5 z-10">
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

      {/* Addresses and Stats */}
      <div className="relative space-y-2 text-xs text-zinc-500 mb-6 z-10">
        <div className="flex justify-between items-center bg-white/[0.02] rounded-lg px-3 py-2">
          <span className="uppercase tracking-widest text-[10px] font-semibold">Client</span>
          <span className="font-mono text-zinc-400 bg-black/20 px-2 py-0.5 rounded-md">{truncate(job.client)}</span>
        </div>
        <div className="flex justify-between items-center bg-white/[0.02] rounded-lg px-3 py-2">
          <span className="uppercase tracking-widest text-[10px] font-semibold">Milestones</span>
          <span className="text-zinc-300 font-bold">{job.milestoneCount} Phases</span>
        </div>
        <div className="flex justify-between items-center px-3 py-1">
          <span className="uppercase tracking-widest text-[10px] font-semibold text-zinc-600">Created</span>
          <span>
            {new Date(Number(job.createdAt) * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative flex flex-wrap gap-2 mt-auto pt-3 z-10">
        <Link
          href={`/jobs/${job.id}`}
          className="w-full text-center flex-none rounded-xl border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] px-3 py-3 text-xs font-bold text-violet-300 hover:text-white transition-all duration-300 group-hover:bg-violet-600 group-hover:text-white"
        >
          View Escrow Details →
        </Link>
      </div>
    </div>
  );
}
