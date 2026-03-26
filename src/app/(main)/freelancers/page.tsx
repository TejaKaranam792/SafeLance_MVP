'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import ReputationBadge from '@/components/ReputationBadge';

interface Freelancer {
  id: string;
  eth_address: string;
  full_name: string;
  skills: string;
  portfolio?: string;
  hourly_rate?: number | null;
  bio?: string | null;
  verified_badge?: boolean;
}

export default function FreelancersDirectory() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFreelancers() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/freelancers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch freelancers');
        setFreelancers(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    const timeout = setTimeout(fetchFreelancers, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Find Top Web3 Talent
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Browse verified on-chain profiles. Every score is earned through real completed work.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto mb-16 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search by skill, profession, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-4 text-white placeholder-zinc-500 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 backdrop-blur"
        />
      </div>

      {error ? (
        <div className="text-center p-8 rounded-2xl border border-red-500/20 bg-red-500/5">
          <p className="text-red-400">Failed to load directory. Database might not be connected yet.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : freelancers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg">No freelancers found{search ? ` for "${search}"` : ''}.</p>
          <Link href="/app?tab=freelancer" className="mt-4 inline-block text-violet-400 hover:text-violet-300 text-sm underline">
            Register as a freelancer →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freelancers.map((user) => {
            const initials = user.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const skills = user.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);

            return (
              <Link
                key={user.id}
                href={`/freelancers/${user.eth_address}`}
                className="group relative rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur transition-all duration-300 hover:bg-white/5 hover:border-violet-500/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] flex flex-col gap-4 overflow-hidden"
              >
                {/* Glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Top row: avatar + score badge */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-violet-500/20">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors leading-tight">
                          {user.full_name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <code className="text-[11px] text-zinc-500 font-mono">
                          {user.eth_address.slice(0, 6)}…{user.eth_address.slice(-4)}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Compact score badge */}
                  <ReputationBadge
                    score={0}
                    verified={user.verified_badge ?? false}
                    milestonesCompleted={0}
                    avgStarsX10={0}
                    totalEthEarned="0"
                    size="sm"
                  />
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed relative z-10">
                    {user.bio}
                  </p>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 relative z-10">
                  {skills.map(skill => (
                    <span key={skill} className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 relative z-10">
                  <span className="text-[11px] text-zinc-500 font-medium">View full profile →</span>
                  {user.hourly_rate && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      ${user.hourly_rate}/hr
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
