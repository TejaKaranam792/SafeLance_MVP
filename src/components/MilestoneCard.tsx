"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  CheckCircle, Clock, AlertTriangle, XCircle, DollarSign,
  ChevronDown, ChevronUp, ExternalLink, Loader2,
} from "lucide-react";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS, MILESTONE_STATUS, type MilestoneStatusKey } from "@/lib/contract";
import { useWallet } from "@/components/WalletContext";

export interface MilestoneData {
  index: number;
  freelancer: string;
  title: string;
  amount: bigint;       // wei
  status: MilestoneStatusKey;
  fundedAt: bigint;
  releasedAt: bigint;
  description?: string;
  deliverableUrl?: string;
}

interface MilestoneCardProps {
  jobId: number;
  milestone: MilestoneData;
  isClient: boolean;
  freelancerStatus?: string;
  onRefresh: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Pending:   { label: "Pending",   color: "text-zinc-400",   bg: "bg-zinc-500/10",   border: "border-zinc-500/20",   icon: <Clock className="h-3 w-3" /> },
  Funded:    { label: "Funded",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   icon: <DollarSign className="h-3 w-3" /> },
  Submitted: { label: "Submitted", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Clock className="h-3 w-3" /> },
  Approved:  { label: "Approved",  color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",icon: <CheckCircle className="h-3 w-3" /> },
  Disputed:  { label: "Disputed",  color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <AlertTriangle className="h-3 w-3" /> },
  Refunded:  { label: "Refunded",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: <XCircle className="h-3 w-3" /> },
};

export default function MilestoneCard({ jobId, milestone, isClient, freelancerStatus, onRefresh }: MilestoneCardProps) {
  const { provider, account } = useWallet();
  const isFreelancer = account?.toLowerCase() === milestone.freelancer.toLowerCase();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState(milestone.deliverableUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const statusLabel = MILESTONE_STATUS[milestone.status] as string;
  const config = STATUS_CONFIG[statusLabel] ?? STATUS_CONFIG["Pending"];
  const amountEth = ethers.formatEther(milestone.amount);

  async function getMilestoneContract() {
    if (!provider) throw new Error("Connect your wallet first");
    if (!MILESTONE_CONTRACT_ADDRESS) throw new Error("MILESTONE_CONTRACT_ADDRESS not set in .env.local");
    const signer = await provider.getSigner();
    return new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, signer);
  }

  async function handleAction(actionName: string, action: () => Promise<ethers.ContractTransactionResponse>) {
    setLoading(actionName);
    setError(null);
    setTxHash(null);
    try {
      const tx = await action();
      await tx.wait();
      setTxHash(tx.hash);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(null);
    }
  }

  async function fundMilestone() {
    await handleAction("fund", async () => {
      const contract = await getMilestoneContract();
      return contract.fundMilestone(jobId, milestone.index, { value: milestone.amount });
    });
  }

  async function submitMilestone() {
    // Save deliverable URL to Supabase
    if (deliverableInput) {
      await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainJobId: jobId,
          milestones: [{ title: milestone.title, description: milestone.description }],
          deliverableUrls: { [milestone.index]: deliverableInput },
        }),
      });
    }
    await handleAction("submit", async () => {
      const contract = await getMilestoneContract();
      return contract.submitMilestone(jobId, milestone.index);
    });
  }

  async function approveMilestone() {
    await handleAction("approve", async () => {
      const contract = await getMilestoneContract();
      return contract.approveMilestone(jobId, milestone.index);
    });
  }

  async function disputeMilestone() {
    await handleAction("dispute", async () => {
      const contract = await getMilestoneContract();
      return contract.disputeMilestone(jobId, milestone.index);
    });
  }

  async function refundMilestone() {
    await handleAction("refund", async () => {
      const contract = await getMilestoneContract();
      return contract.refundMilestone(jobId, milestone.index);
    });
  }

  return (
    <div className={`group relative rounded-2xl border ${config.border} bg-zinc-900/40 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]`}>
      {/* Status Glow Edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg} opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors relative z-10 gap-4"
      >
        <div className="flex items-start sm:items-center gap-4 min-w-0 pl-2">
          <span className={`flex items-center justify-center h-8 w-8 rounded-full ${config.bg} ${config.color} text-xs font-black flex-shrink-0 border ${config.border}`}>
            {String(milestone.index + 1)}
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-white tracking-tight truncate">{milestone.title}</p>
            {milestone.description && (
              <p className="text-xs text-zinc-500 mt-1 truncate max-w-md">{milestone.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0 sm:ml-4 pl-14 sm:pl-0 w-full sm:w-auto">
          <span className={`inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-widest font-bold border rounded-lg px-3 py-1.5 ${config.bg} ${config.border} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-white ml-auto sm:ml-0">{amountEth} ETH</span>
          <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center ml-2">
            {expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-5 space-y-6 relative z-10">
          {/* Deliverable link (shown if submitted) */}
          {milestone.deliverableUrl && (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Freelancer Deliverable</span>
              <a
                href={milestone.deliverableUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                {milestone.deliverableUrl}
              </a>
            </div>
          )}

          {/* Error / success feedback */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          )}
          {txHash && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <p className="text-xs font-medium text-emerald-400 mb-1">✓ Transaction confirmed</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-400/70 hover:text-emerald-400 underline break-all"
              >
                {txHash}
              </a>
            </div>
          )}

          {/* ─── Client Actions ─── */}
          {isClient && account && (
            <div className="flex flex-wrap gap-2">
              {/* Fund — when pending */}
              {statusLabel === "Pending" && (
                <button
                  onClick={fundMilestone}
                  disabled={!!loading || freelancerStatus !== "accepted"}
                  title={freelancerStatus !== "accepted" ? "Freelancer must accept first" : ""}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all disabled:cursor-not-allowed"
                >
                  {loading === "fund" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Fund {amountEth} ETH
                </button>
              )}

              {/* Approve — when funded or submitted */}
              {(statusLabel === "Funded" || statusLabel === "Submitted") && (
                <button
                  onClick={approveMilestone}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
                >
                  {loading === "approve" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Approve &amp; Release
                </button>
              )}

              {/* Dispute — when funded or submitted */}
              {(statusLabel === "Funded" || statusLabel === "Submitted") && (
                <button
                  onClick={disputeMilestone}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
                >
                  {loading === "dispute" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Dispute
                </button>
              )}

              {/* Refund — when disputed or funded */}
              {(statusLabel === "Disputed" || statusLabel === "Funded") && (
                <button
                  onClick={refundMilestone}
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
                >
                  {loading === "refund" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Refund
                </button>
              )}
            </div>
          )}

          {/* ─── Freelancer Actions ─── */}
          {isFreelancer && account && statusLabel === "Funded" && (
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 mb-2 uppercase tracking-widest">
                  Deliverable Link (Public URL)
                </label>
                <input
                  type="url"
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  placeholder="e.g. https://github.com/... or Google Drive link"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:bg-black/40 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
              <button
                onClick={submitMilestone}
                disabled={!!loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
              >
                {loading === "submit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit Work
              </button>
            </div>
          )}

          {/* Timestamp info */}
          {milestone.fundedAt > 0n && (
            <p className="text-[11px] text-zinc-600">
              Funded {new Date(Number(milestone.fundedAt) * 1000).toLocaleDateString()}
              {milestone.releasedAt > 0n && (
                <> · Released {new Date(Number(milestone.releasedAt) * 1000).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
