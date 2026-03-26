"use client";

import React, { useState } from "react";

type DisputeEvidenceCardProps = {
  role: "client" | "freelancer";
  address: string;
  statement: string | null;
  evidenceUrl: string | null;
  isOwner: boolean; // current wallet matches this side
  disputeStatus: string;
  onSubmit: (statement: string, evidenceUrl: string) => Promise<void>;
};

export function DisputeEvidenceCard({
  role,
  address,
  statement,
  evidenceUrl,
  isOwner,
  disputeStatus,
  onSubmit,
}: DisputeEvidenceCardProps) {
  const [localStatement, setLocalStatement] = useState(statement ?? "");
  const [localEvidenceUrl, setLocalEvidenceUrl] = useState(evidenceUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!statement);

  const isResolved = disputeStatus.startsWith("resolved");
  const canSubmit = isOwner && !submitted && !isResolved;

  const accentColor = role === "client" ? "#3b82f6" : "#a855f7";
  const accentGlow =
    role === "client" ? "rgba(59,130,246,0.25)" : "rgba(168,85,247,0.25)";
  const roleLabel = role === "client" ? "Client" : "Freelancer";
  const roleEmoji = role === "client" ? "👤" : "💻";

  async function handleSubmit() {
    if (!localStatement.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(localStatement, localEvidenceUrl);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "Unknown";

  return (
    <div className="evidence-card">
      {/* Header */}
      <div className="ec-header">
        <div className="ec-avatar">{roleEmoji}</div>
        <div>
          <p className="ec-role">{roleLabel}</p>
          <p className="ec-addr">{shortAddr}</p>
        </div>
        {submitted && (
          <span className="ec-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Submitted
          </span>
        )}
      </div>

      {/* Statement */}
      <div className="ec-section">
        <label className="ec-label">Statement</label>
        {canSubmit ? (
          <textarea
            className="ec-textarea"
            placeholder="Describe your position clearly. Include dates, deliverables, and any prior agreements…"
            value={localStatement}
            onChange={(e) => setLocalStatement(e.target.value)}
            rows={5}
          />
        ) : (
          <div className="ec-readonly-box">
            {statement ?? <span className="ec-empty">No statement submitted yet.</span>}
          </div>
        )}
      </div>

      {/* Evidence URL */}
      <div className="ec-section">
        <label className="ec-label">Evidence Link</label>
        {canSubmit ? (
          <input
            className="ec-input"
            type="url"
            placeholder="Link to screenshot, document, GitHub commit, recording…"
            value={localEvidenceUrl}
            onChange={(e) => setLocalEvidenceUrl(e.target.value)}
          />
        ) : (
          <div className="ec-readonly-box">
            {evidenceUrl ? (
              <a href={evidenceUrl} target="_blank" rel="noopener noreferrer" className="ec-link">
                {evidenceUrl}
              </a>
            ) : (
              <span className="ec-empty">No evidence link submitted.</span>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      {canSubmit && (
        <button
          className="ec-submit"
          onClick={handleSubmit}
          disabled={submitting || !localStatement.trim()}
        >
          {submitting ? (
            <span className="ec-spinner" />
          ) : (
            "Submit Evidence"
          )}
        </button>
      )}

      {/* If not owner and nothing submitted yet */}
      {!isOwner && !submitted && !isResolved && (
        <p className="ec-waiting">Waiting for {roleLabel.toLowerCase()} to submit…</p>
      )}

      <style jsx>{`
        .evidence-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid ${accentColor}44;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 0 30px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.06);
          transition: border-color 0.3s;
          flex: 1;
          min-width: 0;
        }
        .ec-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ec-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${accentColor}22;
          border: 1.5px solid ${accentColor}55;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .ec-role {
          font-size: 14px;
          font-weight: 700;
          color: ${accentColor};
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ec-addr {
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          margin: 2px 0 0 0;
          font-family: monospace;
        }
        .ec-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #4ade80;
          background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.25);
          border-radius: 999px;
          padding: 3px 10px;
        }
        .ec-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ec-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ec-textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          resize: vertical;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
          width: 100%;
          box-sizing: border-box;
        }
        .ec-textarea:focus {
          border-color: ${accentColor}88;
          box-shadow: 0 0 0 2px ${accentGlow};
        }
        .ec-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .ec-input:focus {
          border-color: ${accentColor}88;
          box-shadow: 0 0 0 2px ${accentGlow};
        }
        .ec-readonly-box {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: rgba(255,255,255,0.75);
          min-height: 44px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .ec-empty {
          color: rgba(255,255,255,0.25);
          font-style: italic;
        }
        .ec-link {
          color: ${accentColor};
          text-decoration: underline;
          word-break: break-all;
        }
        .ec-submit {
          background: linear-gradient(135deg, ${accentColor}, ${accentColor}cc);
          border: none;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .ec-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px ${accentGlow};
        }
        .ec-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .ec-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ec-waiting {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
