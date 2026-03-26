"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { Shield, ArrowLeft, Loader2, ExternalLink, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS, MILESTONE_STATUS, type MilestoneStatusKey, RPC_URL } from "@/lib/contract";
import { useWallet } from "@/components/WalletContext";
import MilestoneCard, { type MilestoneData } from "@/components/MilestoneCard";
import ChatBox from "@/components/ChatBox";

interface JobOnChain {
  client: string;
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

  const [freelancerStatuses, setFreelancerStatuses] = useState<Record<string, string>>({});
  const [updatingStatus, setUpdatingStatus] = useState(false);

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
      const [client, title, description, totalFunded, createdAt, milestoneCount] =
        await contract.getJob(numJobId);

      const jobData: JobOnChain = {
        client,
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
          ([freelancer, msTitle, amount, status, fundedAt, releasedAt]: [string, string, bigint, number, bigint, bigint]) => ({
            index: i,
            freelancer,
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

      // Fetch milestone from Supabase
      const msRes = await fetch(`/api/milestones?jobId=${numJobId}`);

      if (msRes.ok) {
        const meta: Array<{ milestone_index: number; description?: string; deliverable_url?: string }> = await msRes.json();
        const metaMap: Record<number, { description?: string; deliverableUrl?: string }> = {};
        meta.forEach((m) => {
          metaMap[m.milestone_index] = {
            description: m.description,
            deliverableUrl: m.deliverable_url,
          };
        });
        setMetaMilestones(metaMap);
      }

      // Fetch job metadata with cache busting
      const metaRes2 = await fetch(`/api/jobs/meta?jobId=${numJobId}&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (metaRes2.ok) {
        const jobMeta = await metaRes2.json();
        if (jobMeta && jobMeta.freelancer_status) {
          if (jobMeta.freelancer_status.startsWith("{")) {
            try {
              setFreelancerStatuses(JSON.parse(jobMeta.freelancer_status));
            } catch (e) {
              console.error("Failed to parse freelancer_status JSON", e);
            }
          } else {
            // Fallback for legacy global string
            const legacyObj: Record<string, string> = {};
            uniqueFreelancers.forEach(f => {
              legacyObj[f.toLowerCase()] = jobMeta.freelancer_status;
            });
            setFreelancerStatuses(legacyObj);
          }
        }
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
  
  // A user is a freelancer if they are assigned to AT LEAST one milestone in this job
  const isFreelancer = milestones.some(m => m.freelancer.toLowerCase() === account?.toLowerCase());
  const uniqueFreelancers = Array.from(new Set(milestones.map(m => m.freelancer)));
  const myStatus = account ? (freelancerStatuses[account.toLowerCase()] || "pending") : "pending";

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
        
        {/* Status Banner for Freelancers */}
        {isFreelancer && myStatus !== "accepted" && (
          <div className={`mb-6 rounded-xl border px-5 py-4 ${
            myStatus === "rejected" 
              ? "border-red-500/30 bg-red-500/10" 
              : "border-orange-500/30 bg-orange-500/10"
          }`}>
            <h3 className={`text-sm font-bold mb-1 ${
              myStatus === "rejected" ? "text-red-400" : "text-orange-400"
            }`}>
              {myStatus === "rejected" ? "Offer Rejected" : "Pending Acceptance"}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className={`text-sm ${
                myStatus === "rejected" ? "text-red-300" : "text-orange-300"
              }`}>
                {myStatus === "rejected"
                  ? "You have rejected this job offer. You cannot perform work on it unless the client issues a new offer."
                  : "The client has offered you this job. Please accept or reject it before beginning work."}
              </p>
              
              {/* Freelancer Accept/Reject Actions Inline */}
              {myStatus === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      setUpdatingStatus(true);
                      const res = await fetch("/api/jobs/status", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ chainJobId: numJobId, status: "rejected", freelancerAddress: account }) });
                      if (res.ok) {
                        await loadJobData();
                      } else {
                        const ed = await res.json();
                        alert("Error: " + ed.error);
                      }
                      setUpdatingStatus(false);
                    }}
                    disabled={updatingStatus}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-400 transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={async () => {
                      setUpdatingStatus(true);
                      const res = await fetch("/api/jobs/status", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ chainJobId: numJobId, status: "accepted", freelancerAddress: account }) });
                      if (res.ok) {
                        await loadJobData();
                      } else {
                        const ed = await res.json();
                        alert("Error: " + ed.error);
                      }
                      setUpdatingStatus(false);
                    }}
                    disabled={updatingStatus}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    Accept Offer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status for Client */}
        {isClient && Object.values(freelancerStatuses).some(s => s === "pending" || s === "rejected") && (
          <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-4">
             <h3 className="text-sm font-bold text-orange-400 mb-1">Awaiting Freelancers</h3>
             <p className="text-sm text-orange-300">Wait for your assigned freelancers to accept your offer before they begin work.</p>
          </div>
        )}

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
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex-1">
            <div>
              <p className="text-[11px] text-zinc-500 mb-0.5">Client</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white">{shortAddr(job.client)}</span>
                <button
                  onClick={() => copyAddress(job.client)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Copy address"
                >
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${job.client}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 hover:text-violet-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex-1">
            <p className="text-[11px] text-zinc-500 mb-0.5">Freelancers</p>
            {uniqueFreelancers.map((addr) => (
              <div key={addr} className="flex items-center gap-2">
                <span className="text-xs font-mono text-white">{shortAddr(addr)}</span>
                <button
                  onClick={() => copyAddress(addr)}
                  className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Copy address"
                >
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-600 hover:text-violet-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {/* SHOW INDIVIDUAL STATUS HERE */}
                {(() => {
                  const s = freelancerStatuses[addr.toLowerCase()] || "pending";
                  if (s === "accepted") return <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Accepted</span>;
                  if (s === "rejected") return <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Rejected</span>;
                  return <span className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">Pending</span>;
                })()}
              </div>
            ))}
          </div>
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
              freelancerStatus={freelancerStatuses[ms.freelancer.toLowerCase()] || "pending"}
              onRefresh={loadJobData}
            />
          ))}
        </div>
      </div>

      {/* Chat System (All assigned freelancers form a group chat with the Client) */}
      <ChatBox jobId={numJobId} clientAddress={job.client} freelancerAddresses={uniqueFreelancers} />
    </div>
  );
}
