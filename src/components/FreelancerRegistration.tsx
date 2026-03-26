'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/components/WalletContext';

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
    <div className="rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur">
      <h2 className="text-lg font-semibold text-white mb-1">Create Your Profile</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Register as a freelancer to get hired and paid directly on-chain.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name + Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
            <input type="text" required placeholder="Satoshi Nakamoto" value={form.fullName} onChange={f('fullName')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
            <input type="email" required placeholder="satoshi@bitcoin.org" value={form.email} onChange={f('email')} className={inputCls} />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Top Skills / Profession</label>
          <input type="text" required placeholder="e.g. Solidity, React, Smart Contract Auditing" value={form.skills} onChange={f('skills')} className={inputCls} />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Short Bio</label>
          <textarea
            rows={2}
            placeholder="Tell clients a bit about yourself and what you build best..."
            value={form.bio}
            onChange={f('bio')}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Portfolio + hourly rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Portfolio / Website</label>
            <input type="url" placeholder="https://github.com/..." value={form.portfolio} onChange={f('portfolio')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hourly Rate (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">$</span>
              <input type="number" min="1" step="1" placeholder="75" value={form.hourlyRate} onChange={f('hourlyRate')}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-7 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30" />
            </div>
          </div>
        </div>

        {/* Social links */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">GitHub URL</label>
            <input type="url" placeholder="https://github.com/yourname" value={form.githubUrl} onChange={f('githubUrl')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Twitter / X URL</label>
            <input type="url" placeholder="https://x.com/yourhandle" value={form.twitterUrl} onChange={f('twitterUrl')} className={inputCls} />
          </div>
        </div>

        {/* Wallet */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ethereum Payment Address</label>
          {!account ? (
            <button type="button" onClick={connectWallet}
              className="w-full rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 py-3 text-sm font-medium text-violet-400 hover:bg-violet-500/10 transition-colors">
              Connect Wallet to Auto-fill Address
            </button>
          ) : (
            <input type="text" readOnly value={form.ethAddress}
              className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 outline-none cursor-not-allowed font-mono" />
          )}
        </div>

        <button type="submit" disabled={isSubmitting || !form.ethAddress}
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-500/20 mt-4 flex justify-center items-center gap-2">
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving Profile...
            </>
          ) : 'Complete Registration →'}
        </button>
      </form>

      {errorMsg && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">✓</div>
            <div>
              <p className="text-sm font-medium text-emerald-400">Profile Created Successfully!</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">Clients can now discover and hire you on-chain.</p>
            </div>
          </div>
          {form.ethAddress && (
            <Link
              href={`/freelancers/${form.ethAddress}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              View your public profile →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
