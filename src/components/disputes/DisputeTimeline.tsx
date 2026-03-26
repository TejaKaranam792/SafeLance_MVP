"use client";

import React from "react";

type Step = {
  label: string;
  subLabel?: string;
  done: boolean;
  active: boolean;
};

type DisputeTimelineProps = {
  status: string;
  resolvedAt?: string | null;
};

function getSteps(status: string, resolvedAt?: string | null): Step[] {
  const isResolved = status.startsWith("resolved");
  const resolution = status === "resolved_freelancer" ? "Awarded to Freelancer" : "Refunded to Client";

  return [
    {
      label: "Dispute Raised",
      subLabel: "Milestone locked in escrow",
      done: true,
      active: status === "open",
    },
    {
      label: "Evidence Submission",
      subLabel:
        status === "client_submitted"
          ? "Waiting on freelancer…"
          : status === "freelancer_submitted"
          ? "Waiting on client…"
          : status === "evidence_complete" || isResolved
          ? "Both parties submitted"
          : "Waiting on both parties",
      done: status === "evidence_complete" || isResolved,
      active: status === "client_submitted" || status === "freelancer_submitted",
    },
    {
      label: "Under Admin Review",
      subLabel: "Admin is reviewing evidence",
      done: isResolved,
      active: status === "evidence_complete",
    },
    {
      label: isResolved ? resolution : "Ruling Pending",
      subLabel: resolvedAt
        ? `Resolved ${new Date(resolvedAt).toLocaleDateString()}`
        : "Admin will issue a binding ruling",
      done: isResolved,
      active: false,
    },
  ];
}

export function DisputeTimeline({ status, resolvedAt }: DisputeTimelineProps) {
  const steps = getSteps(status, resolvedAt);

  return (
    <div className="dispute-timeline">
      {steps.map((step, i) => (
        <div key={i} className={`dt-step ${step.done ? "done" : ""} ${step.active ? "active" : ""}`}>
          {/* Connector line above (except first) */}
          {i > 0 && (
            <div className={`dt-line ${steps[i - 1].done ? "done" : ""}`} />
          )}

          {/* Circle */}
          <div className="dt-circle">
            {step.done ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : step.active ? (
              <div className="dt-pulse" />
            ) : (
              <div className="dt-dot" />
            )}
          </div>

          {/* Label */}
          <div className="dt-content">
            <p className="dt-label">{step.label}</p>
            {step.subLabel && <p className="dt-sub">{step.subLabel}</p>}
          </div>
        </div>
      ))}

      <style jsx>{`
        .dispute-timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 8px 0;
        }
        .dt-step {
          display: grid;
          grid-template-columns: 32px 1fr;
          grid-template-rows: auto auto;
          column-gap: 12px;
          row-gap: 0;
          position: relative;
        }
        .dt-line {
          grid-column: 1;
          grid-row: 1 / 2;
          width: 2px;
          min-height: 20px;
          background: rgba(255,255,255,0.12);
          margin: 0 auto;
          transition: background 0.3s;
        }
        .dt-line.done {
          background: linear-gradient(to bottom, #a78bfa, #7c3aed);
        }
        .dt-circle {
          grid-column: 1;
          grid-row: 2;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.15);
          background: rgba(15,15,30,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s;
          position: relative;
          z-index: 1;
        }
        .dt-step.done .dt-circle {
          border-color: #7c3aed;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white;
          box-shadow: 0 0 16px rgba(124,58,237,0.5);
        }
        .dt-step.active .dt-circle {
          border-color: #f59e0b;
          box-shadow: 0 0 16px rgba(245,158,11,0.4);
        }
        .dt-pulse {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f59e0b;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .dt-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        .dt-content {
          grid-column: 2;
          grid-row: 2;
          padding: 4px 0 20px 0;
        }
        .dt-label {
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          margin: 0;
          line-height: 32px;
        }
        .dt-step.done .dt-label { color: #c4b5fd; }
        .dt-step.active .dt-label { color: #fcd34d; }
        .dt-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin: 2px 0 0 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
