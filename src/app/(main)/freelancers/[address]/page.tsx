"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface FreelancerProfile {
  eth_address: string;
  full_name: string;
  email: string;
  skills: string;
  portfolio: string;
  created_at: string;
}

export default function FreelancerProfilePage({ params }: { params: { address: string } }) {
  const { address } = params;
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("freelancers")
          .select("*")
          .eq("eth_address", address)
          .single();

        if (error) throw new Error("Profile not found");
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [address]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24" fill="none">
           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Profile Not Found</h1>
        <p className="text-zinc-500 mb-8">This freelancer either doesn't exist or hasn't created a profile yet.</p>
        <Link href="/freelancers" className="text-violet-400 hover:text-white underline transition-colors">
          ← Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <Link href="/freelancers" className="text-sm text-zinc-500 hover:text-white mb-8 inline-block transition-colors">
        ← Back to Directory
      </Link>

      <div className="rounded-3xl border border-white/8 bg-white/3 p-8 md:p-12 backdrop-blur relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="h-28 w-28 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-5xl shadow-xl shadow-violet-500/20 flex-shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{profile.full_name}</h1>
            <p className="text-lg text-violet-400 font-medium mb-6">{profile.skills}</p>

            <div className="space-y-4 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Ethereum Address</h3>
                <div className="flex items-center gap-2 bg-black/20 rounded-lg px-4 py-2 w-fit border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <code className="text-sm font-mono text-emerald-400">{profile.eth_address}</code>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Contact</h3>
                <a href={`mailto:${profile.email}`} className="text-sm text-zinc-300 hover:text-white hover:underline transition-colors">
                  {profile.email}
                </a>
              </div>

              {profile.portfolio && (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Portfolio</h3>
                  <a href={profile.portfolio} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors break-all">
                    {profile.portfolio}
                  </a>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-6 mt-2">
              <Link 
                href={`/?hire=${profile.eth_address}`}
                className="inline-flex w-full md:w-auto items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 px-8 py-3.5 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-500/20"
              >
                Hire {profile.full_name.split(' ')[0]} Now →
              </Link>
              <p className="text-xs text-zinc-500 mt-3 text-center md:text-left">
                Gasless smart contract escrow powered by EscrowLab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
