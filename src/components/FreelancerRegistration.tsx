'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/WalletContext';
import { UserCircle, Loader2 } from 'lucide-react';

export default function FreelancerRegistration() {
  const { account, connectWallet } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    skills: '',
    portfolio: '',
    ethAddress: '',
    hourlyRate: '',
    bio: '',
    githubUrl: '',
    twitterUrl: '',
  });

  // Auto-fill connected wallet
  useEffect(() => {
    if (account) setForm((f) => ({ ...f, ethAddress: account }));
  }, [account]);

  // Check if profile exists
  useEffect(() => {
    if (!account) return;
    setCheckingProfile(true);
    fetch(`/api/reputation/${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          setExistingProfile(data.profile);
        }
      })
      .catch(console.error)
      .finally(() => setCheckingProfile(false));
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethAddress:  form.ethAddress,
          fullName:    form.fullName,
          email:       form.email,
          skills:      form.skills,
          portfolio:   form.portfolio || null,
          hourlyRate:  form.hourlyRate || null,
          bio:         form.bio || null,
          githubUrl:   form.githubUrl || null,
          twitterUrl:  form.twitterUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30';

  if (checkingProfile) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/3 p-8 flex justify-center items-center h-48 backdrop-blur">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
           <svg className="animate-spin h-6 w-6 text-violet-400" viewBox="0 0 24 24" fill="none">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
           </svg>
           <span className="text-sm font-medium">Checking registration status...</span>
        </div>
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-10 backdrop-blur text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-5 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <span className="text-2xl text-emerald-400">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verified Freelancer</h2>
          <p className="text-sm text-zinc-400 mb-8 max-w-sm mx-auto leading-relaxed">
            You are already registered on SafeLance as <strong className="text-white">{existingProfile.full_name || existingProfile.eth_address}</strong>. You can now accept gig offers and get paid directly on-chain!
          </p>
          <Link
            href={`/freelancers/${account}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all border border-emerald-500/50 hover:-translate-y-0.5"
          >
            Manage Your Profile →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/10 blur-[60px]" />
      
      <div className="relative z-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-violet-400" />
            Complete Your Profile
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
            Register as a freelancer to get discovered by clients and receive payments directly to your wallet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
              <input type="text" required placeholder="Satoshi Nakamoto" value={form.fullName} onChange={f('fullName')} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
              <input type="email" required placeholder="satoshi@bitcoin.org" value={form.email} onChange={f('email')} className={inputCls} />
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Top Skills & Expertise</label>
            <input type="text" required placeholder="e.g. Solidity, UI Design, Rust Development" value={form.skills} onChange={f('skills')} className={inputCls} />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Professional Bio</label>
            <textarea
              rows={3}
              placeholder="Tell clients about your background and what you build best..."
              value={form.bio}
              onChange={f('bio')}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Portfolio + hourly rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Portfolio / Website</label>
              <input type="url" placeholder="https://yourwork.com" value={form.portfolio} onChange={f('portfolio')} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Hourly Rate (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <input type="number" min="1" step="1" placeholder="75" value={form.hourlyRate} onChange={f('hourlyRate')}
                  className="w-full rounded-2xl border border-white/5 bg-black/20 pl-8 pr-4 py-3.5 text-sm text-white focus:border-violet-500/50 transition-all font-bold" />
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 text-zinc-500/80">GitHub Profile</label>
              <input type="url" placeholder="https://github.com/..." value={form.githubUrl} onChange={f('githubUrl')} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 text-zinc-500/80">Twitter / X</label>
              <input type="url" placeholder="https://x.com/..." value={form.twitterUrl} onChange={f('twitterUrl')} className={inputCls} />
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">On-Chain Payment Address</label>
            {!account ? (
              <button type="button" onClick={connectWallet}
                className="w-full rounded-2xl border-2 border-dashed border-violet-500/20 bg-violet-600/5 py-4 text-sm font-bold text-violet-400 hover:bg-violet-600/10 transition-all">
                Connect Wallet to Verify
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <code className="text-xs font-mono text-emerald-400 flex-grow">{account}</code>
                <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">Verified</span>
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting || !form.ethAddress}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Securing Profile...
              </span>
            ) : 'Create My Freelancer ID →'}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-medium text-red-400">
            Error: {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
