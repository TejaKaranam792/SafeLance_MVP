"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { Shield, ArrowLeft, Loader2, ExternalLink, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS, MILESTONE_STATUS, type MilestoneStatusKey, RPC_URL } from "@/lib/contract";
import { useWallet } from "@/components/WalletContext";
import MilestoneCard, { type MilestoneData } from "@/components/MilestoneCard";

interface JobOnChain {
  client: string;
  freelancer: string;
  title: string;
  description: string;
  totalFunded: bigint;
  createdAt: bigint;
  milestoneCount: number;
}

function buildProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export default function JobDetailPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const router = useRouter();
  const { account, connectWallet } = useWallet();

  const [job, setJob] = useState<JobOnChain | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [metaMilestones, setMetaMilestones] = useState<Record<number, { description?: string; deliverableUrl?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const numJobId = Number(jobId);

  const loadJobData = useCallback(async () => {
    if (!MILESTONE_CONTRACT_ADDRESS) {
      setError("NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS not set in .env.local");
      setLoading(false);
      return;
    }

    try {
      const provider = buildProvider();
      const contract = new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, provider);

      // Fetch job on-chain
      const [client, freelancer, title, description, totalFunded, createdAt, milestoneCount] =
        await contract.getJob(numJobId);

      const jobData: JobOnChain = {
        client,
        freelancer,
        title,
        description,
        totalFunded,
        createdAt,
        milestoneCount: Number(milestoneCount),
      };
      setJob(jobData);

      // Fetch each milestone on-chain
      const msPromises = Array.from({ length: Number(milestoneCount) }, (_, i) =>
        contract.getMilestone(numJobId, i).then(
          ([msTitle, amount, status, fundedAt, releasedAt]: [string, bigint, number, bigint, bigint]) => ({
            index: i,
            title: msTitle,
            amount,
            status: status as MilestoneStatusKey,
            fundedAt,
            releasedAt,
          } as MilestoneData)
        )
      );
      const msData = await Promise.all(msPromises);
      setMilestones(msData);

      // Fetch milestone metadata from Supabase
      const res = await fetch(`/api/milestones?jobId=${numJobId}`);
      if (res.ok) {
        const meta: Array<{ milestone_index: number; description?: string; deliverable_url?: string }> = await res.json();
        const metaMap: Record<number, { description?: string; deliverableUrl?: string }> = {};
        meta.forEach((m) => {
          metaMap[m.milestone_index] = {
            description: m.description,
            deliverableUrl: m.deliverable_url,
          };
        });
        setMetaMilestones(metaMap);
      }

      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load job. It may not exist on the MilestoneEscrow contract.");
    } finally {
      setLoading(false);
    }
  }, [numJobId]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  const isClient = account?.toLowerCase() === job?.client.toLowerCase();
  const isFreelancer = account?.toLowerCase() === job?.freelancer.toLowerCase();

  const totalEth = milestones.reduce((sum, ms) => sum + ms.amount, 0n);
  const fundedEth = milestones
    .filter((ms) => {
      const label = MILESTONE_STATUS[ms.status];
      return label === "Funded" || label === "Submitted" || label === "Approved";
    })
    .reduce((sum, ms) => sum + ms.amount, 0n);

  const completedCount = milestones.filter((ms) => MILESTONE_STATUS[ms.status] === "Approved").length;

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-sm text-zinc-500">Loading job from chain…</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-orange-400 mx-auto mb-4" />
        <p className="text-white font-semibold mb-2">Job Not Found</p>
        <p className="text-sm text-zinc-500 mb-6">{error ?? "This job doesn't exist on chain."}</p>
        <Link href="/dashboard" className="text-sm text-violet-400 hover:text-violet-300">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Job Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <span className="text-xs text-zinc-600 font-mono mb-1 block">Job #{numJobId}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{job.title}</h1>
            {job.description && (
              <p className="text-zinc-400 text-sm mt-2 max-w-lg leading-relaxed">{job.description}</p>
            )}
          </div>

          {/* Role badge */}
          {account && (
            <span className={`self-start inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border flex-shrink-0 ${
              isClient
                ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                : isFreelancer
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
            }`}>
              <Shield className="h-3 w-3" />
              {isClient ? "You're the Client" : isFreelancer ? "You're the Freelancer" : "Observer"}
            </span>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Value", value: `${ethers.formatEther(totalEth)} ETH` },
            { label: "Funded", value: `${ethers.formatEther(fundedEth)} ETH` },
            { label: "Milestones", value: `${completedCount} / ${job.milestoneCount} done` },
            { label: "Created", value: new Date(Number(job.createdAt) * 1000).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
              <p className="text-[11px] text-zinc-500 mb-1">{label}</p>
              <p className="text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-500">Progress</span>
            <span className="text-xs text-zinc-400">{completedCount}/{job.milestoneCount} milestones completed</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${job.milestoneCount > 0 ? (completedCount / job.milestoneCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Parties */}
        <div className="flex flex-col sm:flex-row gap-3">
          {[
            { role: "Client", address: job.client },
            { role: "Freelancer", address: job.freelancer },
          ].map(({ role, address }) => (
            <div key={role} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex-1">
              <div>
                <p className="text-[11px] text-zinc-500 mb-0.5">{role}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white">{shortAddr(address)}</span>
                  <button
                    onClick={() => copyAddress(address)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                    title="Copy address"
                  >
                    {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 hover:text-violet-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect wallet prompt */}
      {!account && (
        <div className="mb-6 rounded-xl border border-orange-500/20 bg-orange-500/5 px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-orange-300">Connect your wallet to interact with milestones</p>
          <button
            onClick={connectWallet}
            className="flex items-center gap-2 rounded-lg border border-orange-500/30 px-4 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/10 transition-all"
          >
            <span>🦊</span> Connect MetaMask
          </button>
        </div>
      )}

      {/* Milestones */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-4">
          Milestones · {job.milestoneCount}
        </h2>
        <div className="space-y-2">
          {milestones.map((ms) => (
            <MilestoneCard
              key={ms.index}
              jobId={numJobId}
              milestone={{
                ...ms,
                description: metaMilestones[ms.index]?.description,
                deliverableUrl: metaMilestones[ms.index]?.deliverableUrl,
              }}
              isClient={isClient}
              isFreelancer={isFreelancer}
              onRefresh={loadJobData}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
