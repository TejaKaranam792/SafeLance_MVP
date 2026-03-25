"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface Freelancer {
  id: string;
  eth_address: string;
  full_name: string;
  skills: string;
  portfolio?: string;
  hourly_rate?: number | null;
}

export default function FreelancersDirectory() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFreelancers() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/freelancers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch freelancers");
        setFreelancers(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce search
    const timeout = setTimeout(() => {
      fetchFreelancers();
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Find Top Web3 Talent
        </h1>
        <p className="text-zinc-400 text-lg">
          Search, view portfolios, and hire directly on-chain.
        </p>
      </div>

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
          <p className="text-zinc-500">No freelancers found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freelancers.map((user) => (
            <Link 
              key={user.id} href={`/freelancers/${user.eth_address}`}
              className="group rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur transition-all hover:bg-white/5 hover:border-violet-500/30"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 mb-4 flex items-center justify-center text-white font-bold text-xl">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-medium text-white group-hover:text-violet-400 transition-colors">
                {user.full_name}
              </h3>
              <p className="text-sm text-zinc-400 mt-1 mb-4 line-clamp-1">{user.skills}</p>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-black/20 py-1.5 px-3 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {user.eth_address.slice(0, 6)}...{user.eth_address.slice(-4)}
                </div>
                {user.hourly_rate && (
                  <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                    ${user.hourly_rate}/hr
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
