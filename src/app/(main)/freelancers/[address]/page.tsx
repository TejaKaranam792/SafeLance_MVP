'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReputationBadge from '@/components/ReputationBadge';

// ── types ─────────────────────────────────────────────────────────────────────

interface FreelancerProfile {
  full_name: string;
  email: string;
  skills: string;
  portfolio?: string;
  hourly_rate?: number;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  twitter_url?: string;
}

interface Rating {
  stars: number;
  comment?: string;
  eth_amount: string;
  chain_job_id: string;
  milestone_index: number;
  client_address: string;
  created_at: string;
}

interface OnChainData {
  milestonesCompleted: number;
  totalEthEarned: string;
  ratingSum: number;
  ratingCount: number;
  avgStarsX10: number;
  score: number;
  verified: boolean;
}

interface ReputationData {
  address: string;
  profile: FreelancerProfile | null;
  ratings: Rating[];
  onChain: OnChainData;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function StarRow({ stars }: { stars: number }) {
  return (
    <span style={{ fontSize: 14, letterSpacing: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < stars ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>★</span>
      ))}
    </span>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FreelancerProfilePage({ params }: { params: { address: string } }) {
  const { address } = params;
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/reputation/${address}`);
      if (!res.ok) throw new Error('Not found');
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function copyAddr() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(139,92,246,0.2)',
          borderTopColor: '#8b5cf6',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── not-found ────────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Profile Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
          No on-chain or off-chain data found for this address.
        </p>
        <Link href="/freelancers" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to Directory
        </Link>
      </div>
    );
  }

  const { ratings, onChain } = data;
  const profile = data.profile || {
    full_name: 'Anonymous Freelancer',
    email: '',
    skills: '',
    portfolio: '',
    hourly_rate: undefined,
    bio: 'This freelancer has not set up their off-chain profile yet, but you can still view their on-chain reputation and hire them directly.',
    avatar_url: '',
    github_url: '',
    twitter_url: '',
  };

  const initials = profile.full_name
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avgStars = onChain.avgStarsX10 / 10;
  const skills = profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div style={{
      maxWidth: 780,
      margin: '0 auto',
      padding: '40px 24px 80px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Back */}
      <Link href="/freelancers" style={{
        color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
        fontSize: 14, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6,
        marginBottom: 32, transition: 'color 0.2s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        ← Back to Directory
      </Link>

      {/* ── Hero card ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.05) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 28,
        padding: '32px 32px 28px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(139,92,246,0.15)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {/* Avatar */}
          <div style={{
            width: 96, height: 96, borderRadius: 24, flexShrink: 0,
            background: profile.avatar_url
              ? `url(${profile.avatar_url}) center/cover`
              : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 32, fontWeight: 800,
            boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
          }}>
            {!profile.avatar_url && initials}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                {profile.full_name}
              </h1>
              {onChain.verified && (
                <span style={{
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.5)',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 12, color: '#a5b4fc', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  ✓ Verified Freelancer
                </span>
              )}
            </div>

            {/* Wallet */}
            <button onClick={copyAddr} title="Click to copy" style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '5px 12px',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', marginBottom: 14,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <code style={{ color: '#34d399', fontSize: 13, fontFamily: 'monospace' }}>{shortAddr(address)}</code>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{copied ? '✓ Copied' : '⎘ Copy'}</span>
            </button>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(skill => (
                <span key={skill} style={{
                  background: 'rgba(139,92,246,0.12)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 20, padding: '3px 10px',
                  fontSize: 12, color: '#c4b5fd', fontWeight: 600,
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Reputation badge */}
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ReputationBadge
              score={onChain.score}
              verified={onChain.verified}
              milestonesCompleted={onChain.milestonesCompleted}
              avgStarsX10={onChain.avgStarsX10}
              totalEthEarned={onChain.totalEthEarned}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        {[
          { label: 'Reputation Score', value: `${onChain.score}/100`, icon: '🏅' },
          { label: 'Milestones Done', value: onChain.milestonesCompleted, icon: '✅' },
          { label: 'ETH Earned', value: `${parseFloat(onChain.totalEthEarned).toFixed(3)} ETH`, icon: '⟠' },
          { label: 'Avg Rating', value: onChain.ratingCount > 0 ? `${avgStars.toFixed(1)} ★` : 'No ratings', icon: '⭐' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 18, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>{stat.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Bio + Links ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '24px 28px',
        marginBottom: 20,
      }}>
        {profile.bio && (
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 20, margin: 0 }}>
            {profile.bio}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: profile.bio ? 20 : 0   }}>
          {profile.email && (
            <a href={`mailto:${profile.email}`} style={linkStyle}>✉ {profile.email}</a>
          )}
          {profile.portfolio && (
            <a href={profile.portfolio} target="_blank" rel="noreferrer" style={linkStyle}>🌐 Portfolio</a>
          )}
          {profile.github_url && (
            <a href={profile.github_url} target="_blank" rel="noreferrer" style={linkStyle}>⬡ GitHub</a>
          )}
          {profile.twitter_url && (
            <a href={profile.twitter_url} target="_blank" rel="noreferrer" style={linkStyle}>✦ Twitter</a>
          )}
          {profile.hourly_rate && (
            <span style={{ ...linkStyle, cursor: 'default', background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
              ${profile.hourly_rate}/hr
            </span>
          )}
        </div>
      </div>

      {/* ── Rating History ── */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '24px 28px',
        marginBottom: 24,
      }}>
        <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⭐ Client Reviews
          <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {ratings.length}
          </span>
        </h2>

        {ratings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            No reviews yet — complete your first milestone to earn your first rating!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ratings.map((r, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <StarRow stars={r.stars} />
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>
                      from {shortAddr(r.client_address)} · Job #{r.chain_job_id} · Milestone {r.milestone_index + 1}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#34d399', fontSize: 13, fontWeight: 700 }}>
                      ⟠ {parseFloat(r.eth_amount).toFixed(4)} ETH
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {r.comment && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, margin: 0, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 2 }}>
                    "{r.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center' }}>
        <Link href={`/app?hire=${address}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: '#fff', padding: '14px 36px', borderRadius: 16,
          fontSize: 15, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)'; }}
        >
          Hire {profile.full_name.split(' ')[0]} → Escrow
        </Link>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 10 }}>
          Secured by on-chain smart contract · Gasless transactions
        </p>
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, padding: '6px 14px',
  fontSize: 13, color: 'rgba(255,255,255,0.65)',
  textDecoration: 'none', fontWeight: 500,
  transition: 'background 0.2s, color 0.2s',
};
