'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReputationBadge from '@/components/ReputationBadge';
import { 
  Github, Twitter, Globe, Mail, 
  MapPin, CheckCircle, Copy, Check,
  ChevronLeft, Award, Zap, Star,
  Briefcase, TrendingUp
} from 'lucide-react';

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
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star 
          key={i} 
          className={`h-3 w-3 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} 
        />
      ))}
    </div>
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
    <div className="max-w-4xl mx-auto px-6 py-12 pb-24">
      {/* Back */}
      <Link 
        href="/freelancers" 
        className="group inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors mb-10"
      >
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Back to Directory
      </Link>

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 md:p-10 backdrop-blur-xl mb-6">
        {/* Glow blobs */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-600/20 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-600/10 blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div 
            className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl flex-shrink-0 flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-2xl ${
              profile.avatar_url ? '' : 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/20'
            }`}
            style={profile.avatar_url ? { backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
          >
            {!profile.avatar_url && initials}
          </div>

          {/* Identity */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {profile.full_name}
              </h1>
              {onChain.verified && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  <CheckCircle className="h-3 w-3" />
                  Verified on-chain
                </div>
              )}
            </div>

            {/* Wallet & Badge Row */}
            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={copyAddr}
                className="group flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/40 px-3.5 py-2 transition-all hover:bg-black/60 hover:border-white/10"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <code className="text-sm font-mono text-emerald-400/90">{shortAddr(address)}</code>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />}
              </button>
              
              <div className="h-4 w-px bg-white/10 hidden md:block" />
              
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                <MapPin className="h-3.5 w-3.5" />
                <span>On-Chain Freelancer</span>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <span key={skill} className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs font-bold text-violet-400">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Reputation Summary Side */}
          <div className="w-full md:w-auto bg-black/20 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center">
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

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Score', value: `${onChain.score}/100`, icon: Award, color: 'text-violet-400' },
          { label: 'Completed', value: onChain.milestonesCompleted, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Total Earnings', value: `${parseFloat(onChain.totalEthEarned).toFixed(3)} ETH`, icon: Zap, color: 'text-amber-400' },
          { label: 'Avg Rating', value: onChain.ratingCount > 0 ? `${avgStars.toFixed(1)}` : 'N/A', icon: Star, color: 'text-fuchsia-400' },
        ].map(stat => (
          <div key={stat.label} className="group relative rounded-2xl border border-white/5 bg-white/2 p-5 transition-all hover:bg-white/5">
            <stat.icon className={`h-5 w-5 mb-3 ${stat.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
            <div className="text-xl font-black text-white mb-1 tracking-tight">{stat.value}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Bio + Links */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/2 p-8 h-full">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">About Freelancer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              {profile.bio || "No biography provided."}
            </p>
            
            <div className="flex flex-wrap gap-3">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </a>
              )}
              {profile.portfolio && (
                <a href={profile.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                  <Globe className="h-3.5 w-3.5" />
                  Portfolio
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
              {profile.twitter_url && (
                <a href={profile.twitter_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/2 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                  <Twitter className="h-3.5 w-3.5" />
                  Twitter
                </a>
              )}
              {profile.hourly_rate && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs font-bold text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  ${profile.hourly_rate}/hr
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Side */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-600/5 p-8 flex flex-col items-center justify-center text-center">
          <Briefcase className="h-10 w-10 text-violet-400 mb-4 opacity-50" />
          <h3 className="text-lg font-black text-white mb-2">Hire Directly</h3>
          <p className="text-xs text-zinc-500 mb-8 max-w-[180px]">
            Start a new secure escrow contract with this freelancer.
          </p>
          <Link 
            href={`/app?hire=${address}`}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            Create Job Offer →
          </Link>
          <p className="mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            On-chain & Gasless
          </p>
        </div>
      </div>

      {/* ── Rating History ── */}
      <div className="rounded-2xl border border-white/5 bg-white/2 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Client Reviews
            <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-xs font-bold text-zinc-500">
              {ratings.length}
            </span>
          </h2>
        </div>

        {ratings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-600 font-medium italic">
              "No reviews yet — complete your first milestone to earn your first rating!"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ratings.map((r, i) => (
              <div key={i} className="group relative rounded-2xl border border-white/5 bg-black/20 p-6 transition-all hover:bg-black/40">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="space-y-1">
                    <StarRow stars={r.stars} />
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pt-1">
                      Job #{r.chain_job_id} · {shortAddr(r.client_address)}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-sm font-black text-emerald-400">
                       {parseFloat(r.eth_amount).toFixed(4)} ETH
                    </div>
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {r.comment && (
                  <div className="relative pt-4 mt-2 border-t border-white/5">
                    <p className="text-sm text-zinc-300 italic leading-relaxed">
                      "{r.comment}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
