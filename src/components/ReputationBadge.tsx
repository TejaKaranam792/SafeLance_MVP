'use client';

import React from 'react';

interface ReputationBadgeProps {
  score: number;           // 0–100
  verified: boolean;
  milestonesCompleted: number;
  avgStarsX10: number;     // e.g. 45 means 4.5 stars
  totalEthEarned: string;  // formatted ETH string
  size?: 'sm' | 'md' | 'lg';
}

function scoreColor(score: number): { ring: string; text: string; glow: string } {
  if (score >= 75) return { ring: '#22c55e', text: '#16a34a', glow: 'rgba(34,197,94,0.35)' };
  if (score >= 50) return { ring: '#f59e0b', text: '#d97706', glow: 'rgba(245,158,11,0.35)' };
  return            { ring: '#ef4444', text: '#dc2626', glow: 'rgba(239,68,68,0.35)'  };
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Elite';
  if (score >= 65) return 'Top Rated';
  if (score >= 50) return 'Rising';
  if (score >= 30) return 'Building';
  return 'New';
}

export default function ReputationBadge({
  score,
  verified,
  milestonesCompleted,
  avgStarsX10,
  totalEthEarned,
  size = 'md',
}: ReputationBadgeProps) {
  const dim     = size === 'sm' ? 64 : size === 'lg' ? 120 : 88;
  const stroke  = size === 'sm' ? 5  : size === 'lg' ? 8   : 6;
  const radius  = (dim - stroke * 2) / 2;
  const circ    = 2 * Math.PI * radius;
  const offset  = circ - (score / 100) * circ;
  const colors  = scoreColor(score);
  const avgStars = avgStarsX10 / 10;

  const containerClass = size === 'sm'
    ? 'flex items-center gap-2'
    : 'flex flex-col items-center gap-3';

  return (
    <div className={containerClass} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Score Ring */}
      <div style={{ position: 'relative', width: dim, height: dim }}>
        <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={dim / 2} cy={dim / 2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={dim / 2} cy={dim / 2} r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 0 6px ${colors.glow})`,
            }}
          />
        </svg>
        {/* Center score */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          transform: 'rotate(0deg)',
        }}>
          <span style={{
            fontSize: size === 'sm' ? 14 : size === 'lg' ? 28 : 20,
            fontWeight: 800,
            color: colors.ring,
            lineHeight: 1,
            letterSpacing: '-0.5px',
          }}>{score}</span>
          {size !== 'sm' && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 1, letterSpacing: '0.5px' }}>
              SCORE
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      {size !== 'sm' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {/* Label + verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: colors.text,
              background: `${colors.ring}18`,
              border: `1px solid ${colors.ring}40`,
              borderRadius: 20,
              padding: '2px 10px',
            }}>
              {scoreLabel(score)}
            </span>
            {verified && (
              <span title="Verified freelancer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: 20,
                padding: '2px 8px',
                fontSize: 11,
                color: '#a5b4fc',
                fontWeight: 600,
              }}>
                ✓ Verified
              </span>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Stat label="Jobs" value={String(milestonesCompleted)} />
            <Divider />
            <Stat label="Avg ★" value={avgStarsX10 > 0 ? avgStars.toFixed(1) : '—'} />
            <Divider />
            <Stat label="ETH" value={parseFloat(totalEthEarned).toFixed(3)} />
          </div>
        </div>
      )}

      {/* Small size: just verified mark */}
      {size === 'sm' && verified && (
        <span style={{
          fontSize: 10, color: '#a5b4fc', fontWeight: 700,
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.35)',
          padding: '2px 6px', borderRadius: 10,
        }}>
          ✓
        </span>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />;
}
