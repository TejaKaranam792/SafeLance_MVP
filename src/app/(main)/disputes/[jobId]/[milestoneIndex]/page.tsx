"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { DisputeTimeline } from "@/components/disputes/DisputeTimeline";
import { DisputeEvidenceCard } from "@/components/disputes/DisputeEvidenceCard";

type Dispute = {
  id: string;
  chain_job_id: string;
  milestone_index: number;
  client_address: string;
  freelancer_address: string;
  client_statement: string | null;
  client_evidence_url: string | null;
  freelancer_statement: string | null;
  freelancer_evidence_url: string | null;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default function DisputeRoomPage() {
  const { jobId, milestoneIndex } = useParams() as {
    jobId: string;
    milestoneIndex: string;
  };
  const router = useRouter();

  const [address, setAddress] = useState<string | undefined>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user wallet address (matches what other pages do)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (eth) {
      eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) setAddress(accounts[0]);
      });
    }
  }, []);

  const fetchDispute = useCallback(async () => {
    const res = await fetch(
      `/api/disputes?chain_job_id=${jobId}&milestone_index=${milestoneIndex}`
    );
    if (!res.ok) {
      setError("Dispute not found.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setDispute(data);
    setLoading(false);
  }, [jobId, milestoneIndex]);

  useEffect(() => {
    fetchDispute();
  }, [fetchDispute]);

  async function handleEvidenceSubmit(
    role: "client" | "freelancer",
    statement: string,
    evidenceUrl: string
  ) {
    const res = await fetch("/api/disputes/evidence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chain_job_id: jobId,
        milestone_index: Number(milestoneIndex),
        role,
        statement,
        evidence_url: evidenceUrl,
        wallet_address: address,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to submit evidence");
    }
    await fetchDispute();
  }

  if (loading) {
    return (
      <div className="dr-loading">
        <div className="dr-spinner-lg" />
        <p>Loading Dispute Room…</p>
        <style jsx>{`
          .dr-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 16px;
            color: rgba(255,255,255,0.5);
          }
          .dr-spinner-lg {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.1);
            border-top-color: #ef4444;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="dr-error">
        <p>⚠️ {error ?? "Dispute not found."}</p>
        <button onClick={() => router.back()}>Go Back</button>
        <style jsx>{`
          .dr-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 16px;
            color: rgba(255,255,255,0.6);
          }
          .dr-error button {
            padding: 10px 24px;
            border-radius: 8px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            color: white;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  const isResolved = dispute.status.startsWith("resolved");
  const releasedToFreelancer = dispute.status === "resolved_freelancer";
  const walletLower = address?.toLowerCase();
  const isClient = walletLower === dispute.client_address;
  const isFreelancer = walletLower === dispute.freelancer_address;

  return (
    <div className="dr-root">
      {/* ── Resolution Banner ─────────────────────────────────── */}
      {isResolved && (
        <div className={`dr-resolution-banner ${releasedToFreelancer ? "win-freelancer" : "win-client"}`}>
          <span className="drb-emoji">{releasedToFreelancer ? "🏆" : "🔄"}</span>
          <div>
            <p className="drb-title">
              {releasedToFreelancer ? "Awarded to Freelancer" : "Refunded to Client"}
            </p>
            {dispute.admin_notes && (
              <p className="drb-notes">Admin note: {dispute.admin_notes}</p>
            )}
          </div>
          <span className="drb-resolved">
            Resolved {dispute.resolved_at ? new Date(dispute.resolved_at).toLocaleDateString() : ""}
          </span>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="dr-header">
        <button className="dr-back" onClick={() => router.push(`/app/jobs/${jobId}`)}>
          ← Back to Job
        </button>

        <div className="dr-header-content">
          <div className="dr-badge-disputed">
            <div className="dr-badge-dot" />
            DISPUTED
          </div>
          <h1 className="dr-title">
            Dispute Room
            <span className="dr-title-sub">Job #{jobId} · Milestone #{Number(milestoneIndex) + 1}</span>
          </h1>
        </div>

        <div className="dr-meta-pills">
          <div className="dr-pill">
            <span className="dr-pill-label">Status</span>
            <span className="dr-pill-val">{dispute.status.replace(/_/g, " ")}</span>
          </div>
          <div className="dr-pill">
            <span className="dr-pill-label">Opened</span>
            <span className="dr-pill-val">{new Date(dispute.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────── */}
      <div className="dr-body">
        {/* Timeline sidebar */}
        <aside className="dr-sidebar">
          <div className="dr-sidebar-card">
            <h3 className="dr-sidebar-title">Progress</h3>
            <DisputeTimeline
              status={dispute.status}
              resolvedAt={dispute.resolved_at}
            />
          </div>

          {/* Parties */}
          <div className="dr-sidebar-card">
            <h3 className="dr-sidebar-title">Parties</h3>
            <div className="dr-party">
              <span className="dr-party-role client">Client</span>
              <span className="dr-party-addr">
                {dispute.client_address.slice(0, 6)}…{dispute.client_address.slice(-4)}
                {isClient && <span className="dr-you">you</span>}
              </span>
            </div>
            <div className="dr-party">
              <span className="dr-party-role freelancer">Freelancer</span>
              <span className="dr-party-addr">
                {dispute.freelancer_address.slice(0, 6)}…{dispute.freelancer_address.slice(-4)}
                {isFreelancer && <span className="dr-you">you</span>}
              </span>
            </div>
          </div>

          {/* How it works */}
          <div className="dr-sidebar-card dr-how">
            <h3 className="dr-sidebar-title">How It Works</h3>
            <p>Both parties submit their evidence. An admin reviews and issues a binding ruling — funds are released on-chain instantly.</p>
          </div>
        </aside>

        {/* Evidence cards */}
        <main className="dr-main">
          <h2 className="dr-evidence-title">Evidence</h2>
          <p className="dr-evidence-sub">
            {isResolved
              ? "This dispute has been resolved. Evidence is now read-only."
              : "Submit your statement and any supporting links. Once submitted, your evidence is locked."}
          </p>
          <div className="dr-evidence-grid">
            <DisputeEvidenceCard
              role="client"
              address={dispute.client_address}
              statement={dispute.client_statement}
              evidenceUrl={dispute.client_evidence_url}
              isOwner={isClient}
              disputeStatus={dispute.status}
              onSubmit={(s, u) => handleEvidenceSubmit("client", s, u)}
            />
            <DisputeEvidenceCard
              role="freelancer"
              address={dispute.freelancer_address}
              statement={dispute.freelancer_statement}
              evidenceUrl={dispute.freelancer_evidence_url}
              isOwner={isFreelancer}
              disputeStatus={dispute.status}
              onSubmit={(s, u) => handleEvidenceSubmit("freelancer", s, u)}
            />
          </div>

          {/* Not a party warning */}
          {!isClient && !isFreelancer && address && (
            <div className="dr-observer">
              👁 You&apos;re viewing as an observer — your wallet is not a party to this dispute.
            </div>
          )}
          {!address && (
            <div className="dr-observer">
              Connect your wallet to participate in this dispute.
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        .dr-root {
          min-height: 100vh;
          background: radial-gradient(ellipse at 20% 0%, rgba(239,68,68,0.08) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 100%, rgba(124,58,237,0.08) 0%, transparent 50%),
                      #0a0a14;
          padding: 0 0 60px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          color: white;
        }

        /* Resolution Banner */
        .dr-resolution-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 40px;
          font-size: 14px;
        }
        .win-freelancer {
          background: linear-gradient(90deg, rgba(124,58,237,0.3), rgba(167,139,250,0.1));
          border-bottom: 1px solid rgba(124,58,237,0.3);
        }
        .win-client {
          background: linear-gradient(90deg, rgba(245,158,11,0.25), rgba(251,191,36,0.08));
          border-bottom: 1px solid rgba(245,158,11,0.3);
        }
        .drb-emoji { font-size: 24px; }
        .drb-title {
          font-weight: 700;
          font-size: 15px;
          margin: 0;
          color: white;
        }
        .drb-notes {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
          margin: 2px 0 0;
        }
        .drb-resolved {
          margin-left: auto;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        /* Header */
        .dr-header {
          padding: 32px 40px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dr-back {
          align-self: flex-start;
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.2s;
        }
        .dr-back:hover {
          border-color: rgba(255,255,255,0.25);
          color: white;
        }
        .dr-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .dr-badge-disputed {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.4);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 800;
          color: #f87171;
          letter-spacing: 0.1em;
          flex-shrink: 0;
        }
        .dr-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ef4444;
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .dr-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          line-height: 1.2;
        }
        .dr-title-sub {
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.4);
        }
        .dr-meta-pills {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .dr-pill {
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 6px 14px;
        }
        .dr-pill-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .dr-pill-val {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.8);
          text-transform: capitalize;
        }

        /* Body layout */
        .dr-body {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          padding: 28px 40px 0;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Sidebar */
        .dr-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dr-sidebar-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px;
        }
        .dr-sidebar-title {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 0 0 14px 0;
        }
        .dr-party {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          gap: 8px;
        }
        .dr-party:last-child { border-bottom: none; }
        .dr-party-role {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .dr-party-role.client {
          background: rgba(59,130,246,0.15);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.25);
        }
        .dr-party-role.freelancer {
          background: rgba(168,85,247,0.15);
          color: #c084fc;
          border: 1px solid rgba(168,85,247,0.25);
        }
        .dr-party-addr {
          font-size: 12px;
          font-family: monospace;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dr-you {
          font-family: 'Inter', sans-serif;
          font-size: 10px;
          background: rgba(74,222,128,0.15);
          border: 1px solid rgba(74,222,128,0.25);
          color: #4ade80;
          border-radius: 999px;
          padding: 1px 6px;
        }
        .dr-how p {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          line-height: 1.6;
          margin: 0;
        }

        /* Main */
        .dr-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .dr-evidence-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        .dr-evidence-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          margin: 0;
          line-height: 1.5;
        }
        .dr-evidence-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .dr-observer {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 18px;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          text-align: center;
        }

        /* Responsiveness */
        @media (max-width: 900px) {
          .dr-body {
            grid-template-columns: 1fr;
            padding: 20px 16px 0;
          }
          .dr-header { padding: 20px 16px 0; }
          .dr-evidence-grid { grid-template-columns: 1fr; }
          .dr-resolution-banner { padding: 14px 16px; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
