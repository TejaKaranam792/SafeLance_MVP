"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { MILESTONE_ABI } from "@/lib/contract";

const MILESTONE_CONTRACT = process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS as string;

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_COLORS: Record<string, string> = {
  open: "#f59e0b",
  client_submitted: "#3b82f6",
  freelancer_submitted: "#a855f7",
  evidence_complete: "#06b6d4",
  resolved_freelancer: "#10b981",
  resolved_client: "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  client_submitted: "Client Submitted",
  freelancer_submitted: "Freelancer Submitted",
  evidence_complete: "Evidence Complete",
  resolved_freelancer: "Resolved → Freelancer",
  resolved_client: "Resolved → Client",
};

export default function AdminDisputesPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState<"freelancer" | "client" | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });
    setDisputes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchDisputes();
  }, [authenticated, fetchDisputes]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!secret.trim()) return;
    setAuthenticated(true);
    setAuthError("");
  }

  async function handleResolve(direction: "freelancer" | "client") {
    if (!selectedDispute) return;
    setResolving(direction);
    setTxPending(true);
    try {
      const releaseToFreelancer = direction === "freelancer";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MILESTONE_CONTRACT, MILESTONE_ABI, signer);
      const tx = await contract.adminResolveMilestone(
        BigInt(selectedDispute.chain_job_id),
        selectedDispute.milestone_index,
        releaseToFreelancer
      );
      setTxHash(tx.hash);
      await tx.wait();

      // Mark resolved in DB
      await fetch("/api/disputes/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          chain_job_id: selectedDispute.chain_job_id,
          milestone_index: selectedDispute.milestone_index,
          ruling: direction,
          admin_notes: adminNotes,
        }),
      });

      setResolving(null);
      setTxHash(null);
      setTxPending(false);
      setSelectedDispute(null);
      setAdminNotes("");
      await fetchDisputes();
    } catch (err: unknown) {
      console.error(err);
      setResolving(null);
      setTxPending(false);
    }
  }

  // ── Login Gate ─────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="ad-gate">
        <div className="ad-gate-card">
          <div className="ad-gate-icon">🛡</div>
          <h1 className="ad-gate-title">Admin Access Required</h1>
          <p className="ad-gate-sub">Enter your admin secret to access the dispute arbitration dashboard.</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="ad-gate-input"
              placeholder="Admin secret…"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            {authError && <p className="ad-gate-error">{authError}</p>}
            <button type="submit" className="ad-gate-btn">Access Dashboard →</button>
          </form>
        </div>
        <style jsx>{`
          .ad-gate {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #0a0a14;
          }
          .ad-gate-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 48px 40px;
            max-width: 420px;
            width: 90%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            box-shadow: 0 0 80px rgba(124,58,237,0.15);
            text-align: center;
          }
          .ad-gate-icon { font-size: 40px; }
          .ad-gate-title {
            font-size: 22px;
            font-weight: 800;
            color: white;
            margin: 0;
            font-family: 'Inter', sans-serif;
          }
          .ad-gate-sub {
            font-size: 14px;
            color: rgba(255,255,255,0.45);
            margin: 0;
            line-height: 1.5;
            font-family: 'Inter', sans-serif;
          }
          .ad-gate-input {
            width: 100%;
            box-sizing: border-box;
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            padding: 12px 16px;
            font-size: 14px;
            color: white;
            outline: none;
            font-family: monospace;
            transition: border-color 0.2s;
            margin-top: 4px;
          }
          .ad-gate-input:focus { border-color: rgba(124,58,237,0.6); }
          .ad-gate-error { color: #f87171; font-size: 13px; margin: 0; font-family: 'Inter', sans-serif; }
          .ad-gate-btn {
            width: 100%;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            border: none;
            border-radius: 10px;
            padding: 13px;
            font-size: 14px;
            font-weight: 700;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Inter', sans-serif;
            margin-top: 4px;
          }
          .ad-gate-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(124,58,237,0.4); }
        `}</style>
      </div>
    );
  }

  const openCount = disputes.filter((d) => !d.status.startsWith("resolved")).length;

  return (
    <div className="ad-root">
      {/* Header */}
      <div className="ad-header">
        <div>
          <div className="ad-header-eyebrow">Admin Arbitration</div>
          <h1 className="ad-header-title">Dispute Dashboard</h1>
        </div>
        <div className="ad-header-stats">
          <div className="ad-stat">
            <span className="ad-stat-num">{openCount}</span>
            <span className="ad-stat-label">Open</span>
          </div>
          <div className="ad-stat">
            <span className="ad-stat-num">{disputes.filter((d) => d.status === "evidence_complete").length}</span>
            <span className="ad-stat-label">Ready to Rule</span>
          </div>
          <div className="ad-stat">
            <span className="ad-stat-num">{disputes.filter((d) => d.status.startsWith("resolved")).length}</span>
            <span className="ad-stat-label">Resolved</span>
          </div>
        </div>
        <button className="ad-logout" onClick={() => router.push("/app")}>← Exit Admin</button>
      </div>

      <div className="ad-body">
        {/* ── Table ── */}
        <div className="ad-table-wrap">
          {loading ? (
            <div className="ad-loading">Loading disputes…</div>
          ) : disputes.length === 0 ? (
            <div className="ad-empty">
              <p>🎉 No disputes yet. The platform is thriving.</p>
            </div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Job / Milestone</th>
                  <th>Status</th>
                  <th>Client</th>
                  <th>Freelancer</th>
                  <th>Opened</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr
                    key={d.id}
                    className={selectedDispute?.id === d.id ? "selected-row" : ""}
                    onClick={() => {
                      setSelectedDispute(d);
                      setAdminNotes(d.admin_notes ?? "");
                    }}
                  >
                    <td>
                      <span className="ad-job-id">#{d.chain_job_id}</span>
                      <span className="ad-ms-idx">· Milestone {d.milestone_index + 1}</span>
                    </td>
                    <td>
                      <span
                        className="ad-status-badge"
                        style={{
                          background: STATUS_COLORS[d.status] + "22",
                          color: STATUS_COLORS[d.status],
                          borderColor: STATUS_COLORS[d.status] + "55",
                        }}
                      >
                        {STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="ad-addr">{d.client_address.slice(0, 6)}…{d.client_address.slice(-4)}</td>
                    <td className="ad-addr">{d.freelancer_address.slice(0, 6)}…{d.freelancer_address.slice(-4)}</td>
                    <td className="ad-date">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="ad-view-btn" onClick={() => router.push(`/disputes/${d.chain_job_id}/${d.milestone_index}`)}>
                        View Room ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Detail Panel ── */}
        {selectedDispute && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2 className="ad-panel-title">
                Job #{selectedDispute.chain_job_id}
                <span> · Milestone {selectedDispute.milestone_index + 1}</span>
              </h2>
              <button className="ad-panel-close" onClick={() => setSelectedDispute(null)}>✕</button>
            </div>

            {/* Evidence */}
            <div className="ad-panel-evidence">
              <div className="ad-ev-side client">
                <div className="ad-ev-role">Client Evidence</div>
                <p className="ad-ev-statement">
                  {selectedDispute.client_statement || <em>Not submitted yet</em>}
                </p>
                {selectedDispute.client_evidence_url && (
                  <a href={selectedDispute.client_evidence_url} target="_blank" rel="noopener noreferrer" className="ad-ev-link">
                    📎 Client Evidence
                  </a>
                )}
              </div>
              <div className="ad-ev-side freelancer">
                <div className="ad-ev-role">Freelancer Evidence</div>
                <p className="ad-ev-statement">
                  {selectedDispute.freelancer_statement || <em>Not submitted yet</em>}
                </p>
                {selectedDispute.freelancer_evidence_url && (
                  <a href={selectedDispute.freelancer_evidence_url} target="_blank" rel="noopener noreferrer" className="ad-ev-link">
                    📎 Freelancer Evidence
                  </a>
                )}
              </div>
            </div>

            {/* Admin Notes */}
            <div className="ad-panel-section">
              <label className="ad-panel-label">Admin Notes</label>
              <textarea
                className="ad-panel-textarea"
                placeholder="Internal notes for this ruling…"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                disabled={selectedDispute.status.startsWith("resolved")}
              />
            </div>

            {/* Ruling Buttons */}
            {!selectedDispute.status.startsWith("resolved") ? (
              <div className="ad-ruling-buttons">
                <button
                  className="ad-rule-btn freelancer"
                  onClick={() => handleResolve("freelancer")}
                  disabled={!!resolving}
                >
                  {resolving === "freelancer" ? (
                    <><span className="ad-spinner" /> Executing…</>
                  ) : (
                    <>🏆 Release to Freelancer</>
                  )}
                </button>
                <button
                  className="ad-rule-btn client"
                  onClick={() => handleResolve("client")}
                  disabled={!!resolving}
                >
                  {resolving === "client" ? (
                    <><span className="ad-spinner" /> Executing…</>
                  ) : (
                    <>🔄 Refund to Client</>
                  )}
                </button>
              </div>
            ) : (
              <div className="ad-resolved-label">
                <span>✅ Resolved — {STATUS_LABELS[selectedDispute.status]}</span>
                {selectedDispute.admin_notes && (
                  <p className="ad-resolved-notes">{selectedDispute.admin_notes}</p>
                )}
              </div>
            )}

            {txHash && txPending && (
              <p className="ad-tx-waiting">
                ⏳ Waiting for on-chain confirmation…
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ad-ev-link"
                >
                  View on Etherscan
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .ad-root {
          min-height: 100vh;
          background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 60%), #0a0a14;
          color: white;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          padding-bottom: 60px;
        }

        /* Header */
        .ad-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px 40px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .ad-header-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: #a78bfa;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .ad-header-title {
          font-size: 26px;
          font-weight: 800;
          margin: 0;
        }
        .ad-header-stats {
          display: flex;
          gap: 24px;
          margin-left: auto;
        }
        .ad-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .ad-stat-num {
          font-size: 24px;
          font-weight: 800;
          color: white;
          line-height: 1;
        }
        .ad-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .ad-logout {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.2s;
        }
        .ad-logout:hover { border-color: rgba(255,255,255,0.25); color: white; }

        /* Body */
        .ad-body {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          padding: 24px 40px;
        }

        /* Table */
        .ad-table-wrap {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
        }
        .ad-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ad-table thead tr {
          background: rgba(255,255,255,0.04);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ad-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .ad-table tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: pointer;
          transition: background 0.15s;
        }
        .ad-table tbody tr:hover { background: rgba(255,255,255,0.04); }
        .ad-table tbody tr.selected-row { background: rgba(124,58,237,0.1); }
        .ad-table td { padding: 14px 16px; font-size: 13px; }
        .ad-job-id { font-weight: 700; color: white; }
        .ad-ms-idx { color: rgba(255,255,255,0.4); margin-left: 4px; }
        .ad-addr { font-family: monospace; font-size: 12px; color: rgba(255,255,255,0.5); }
        .ad-date { font-size: 12px; color: rgba(255,255,255,0.4); }
        .ad-status-badge {
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
          border-radius: 999px;
          padding: 3px 10px;
          display: inline-block;
        }
        .ad-view-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .ad-view-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .ad-loading, .ad-empty {
          padding: 48px;
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-size: 15px;
        }

        /* Detail Panel */
        .ad-panel {
          margin-top: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ad-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ad-panel-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .ad-panel-title span { font-weight: 400; color: rgba(255,255,255,0.45); }
        .ad-panel-close {
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          width: 30px;
          height: 30px;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 14px;
        }
        .ad-panel-evidence {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .ad-ev-side {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 14px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ad-ev-side.client { border-color: rgba(59,130,246,0.2); }
        .ad-ev-side.freelancer { border-color: rgba(168,85,247,0.2); }
        .ad-ev-role {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 8px;
        }
        .ad-ev-side.client .ad-ev-role { color: #60a5fa; }
        .ad-ev-side.freelancer .ad-ev-role { color: #c084fc; }
        .ad-ev-statement {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          margin: 0 0 10px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .ad-ev-statement em { color: rgba(255,255,255,0.3); }
        .ad-ev-link {
          font-size: 12px;
          color: #a78bfa;
          text-decoration: underline;
          word-break: break-all;
          display: block;
          margin-top: 4px;
        }
        .ad-panel-section { display: flex; flex-direction: column; gap: 6px; }
        .ad-panel-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .ad-panel-textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.8);
          resize: vertical;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .ad-panel-textarea:focus { border-color: rgba(124,58,237,0.5); }
        .ad-ruling-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ad-rule-btn {
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .ad-rule-btn.freelancer {
          background: linear-gradient(135deg, #059669, #10b981);
          color: white;
        }
        .ad-rule-btn.freelancer:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16,185,129,0.3);
        }
        .ad-rule-btn.client {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: white;
        }
        .ad-rule-btn.client:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245,158,11,0.3);
        }
        .ad-rule-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ad-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ad-resolved-label {
          text-align: center;
          padding: 14px;
          background: rgba(74,222,128,0.08);
          border: 1px solid rgba(74,222,128,0.2);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #4ade80;
        }
        .ad-resolved-notes {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          margin: 6px 0 0;
          font-weight: 400;
        }
        .ad-tx-waiting {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin: 0;
        }

        @media (max-width: 900px) {
          .ad-body { padding: 16px; }
          .ad-header { padding: 20px 16px 16px; }
          .ad-panel-evidence { grid-template-columns: 1fr; }
          .ad-ruling-buttons { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
