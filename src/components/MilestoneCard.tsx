"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  CheckCircle, Clock, AlertTriangle, XCircle, DollarSign,
  ChevronDown, ChevronUp, ExternalLink, Loader2, ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  clientAddress?: string;  // NEW: client wallet address for rating
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

// ── Star Rating Modal ─────────────────────────────────────────────────────────
interface RatingModalProps {
  milestoneTitle: string;
  onConfirm: (stars: number, comment: string) => void;
  onCancel: () => void;
}

function RatingModal({ milestoneTitle, onConfirm, onCancel }: RatingModalProps) {
  const [stars, setStars]     = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const displayStars = hovered || stars;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      padding: 24,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '32px 36px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>⭐</div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 6px' }}>
          Rate the Work
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          How was <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{milestoneTitle}</strong>?
        </p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n}
              onClick={() => setStars(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 36, lineHeight: 1, padding: '4px 2px',
                color: n <= displayStars ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                transform: n <= displayStars ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
                filter: n <= displayStars ? 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' : 'none',
              }}
            >★</button>
          ))}
        </div>

        {/* Star label */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 20, minHeight: 20 }}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][displayStars]}
        </p>

        {/* Optional comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Leave a review (optional)…"
          rows={3}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '12px 14px',
            color: '#fff', fontSize: 14, fontFamily: 'inherit',
            resize: 'none', outline: 'none', marginBottom: 24,
            boxSizing: 'border-box',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px 0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: 'rgba(255,255,255,0.6)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(stars, comment)} style={{
            flex: 2, padding: '12px 0',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
            fontFamily: 'inherit',
          }}>
            Approve & Release ⟠
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MilestoneCard({ jobId, milestone, isClient, clientAddress, freelancerStatus, onRefresh }: MilestoneCardProps) {
  const router = useRouter();
  const { provider, account } = useWallet();
  const isFreelancer = account?.toLowerCase() === milestone.freelancer.toLowerCase();
  const [expanded, setExpanded]       = useState(false);
  const [loading, setLoading]         = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState(milestone.deliverableUrl ?? "");
  const [error, setError]             = useState<string | null>(null);
  const [txHash, setTxHash]           = useState<string | null>(null);
  const [showRating, setShowRating]   = useState(false);  // ← NEW

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
    // Open rating modal — actual contract call happens in handleApproveConfirmed
    setShowRating(true);
  }

  async function handleApproveConfirmed(stars: number, comment: string) {
    setShowRating(false);
    await handleAction("approve", async () => {
      const contract = await getMilestoneContract();
      return contract.approveMilestone(jobId, milestone.index, stars);
    });

    // Mirror rating off-chain for fast profile reads
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freelancer_address: milestone.freelancer,
          client_address:     clientAddress ?? account ?? "",
          chain_job_id:       String(jobId),
          milestone_index:    milestone.index,
          stars,
          comment:            comment || undefined,
          eth_amount:         ethers.formatEther(milestone.amount),
        }),
      });
    } catch (e) {
      console.warn("[rating] off-chain save failed:", e);
    }
  }

  async function disputeMilestone() {
    await handleAction("dispute", async () => {
      const contract = await getMilestoneContract();
      return contract.disputeMilestone(jobId, milestone.index);
    });
    // On success, create off-chain dispute record and redirect
    try {
      await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain_job_id: String(jobId),
          milestone_index: milestone.index,
          client_address: clientAddress ?? account ?? "",
          freelancer_address: milestone.freelancer,
        }),
      });
      router.push(`/disputes/${jobId}/${milestone.index}`);
    } catch (e) {
      console.warn("[dispute] failed to create off-chain record", e);
    }
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

          {/* ─── Shared Actions ─── */}
          {statusLabel === "Disputed" && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-orange-400 font-bold text-sm mb-1">Milestone Disputed</h4>
                <p className="text-orange-400/70 text-xs">This milestone is currently under arbitration. Please submit your evidence in the Dispute Room.</p>
              </div>
              <button
                onClick={() => router.push(`/disputes/${jobId}/${milestone.index}`)}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-500 px-5 py-2.5 text-xs font-bold text-white transition-all whitespace-nowrap"
              >
                Go to Dispute Room <ArrowRight className="h-4 w-4" />
              </button>
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
      {/* Rating modal — rendered at root level for correct z-index */}
      {showRating && (
        <RatingModal
          milestoneTitle={milestone.title}
          onConfirm={handleApproveConfirmed}
          onCancel={() => setShowRating(false)}
        />
      )}
    </div>
  );
}
