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
  isFreelancer: boolean;
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

export default function MilestoneCard({ jobId, milestone, isClient, isFreelancer, onRefresh }: MilestoneCardProps) {
  const { provider, account } = useWallet();
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
    <div className={`rounded-2xl border ${config.border} bg-white/2 overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-black text-white/20 flex-shrink-0 w-6">
            {String(milestone.index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{milestone.title}</p>
            {milestone.description && (
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{milestone.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium border rounded-full px-2.5 py-1 ${config.bg} ${config.border} ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          <span className="text-sm font-semibold text-white">{amountEth} ETH</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
          {/* Deliverable link (shown if submitted) */}
          {milestone.deliverableUrl && (
            <a
              href={milestone.deliverableUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Deliverable
            </a>
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
                  disabled={!!loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all"
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
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Deliverable Link (optional)
                </label>
                <input
                  type="url"
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
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
