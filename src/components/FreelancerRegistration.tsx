"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";

export default function FreelancerRegistration() {
  const { account, connectWallet } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    skills: "",
    portfolio: "",
    ethAddress: "",
    hourlyRate: "",
  });

  // Auto-fill connected wallet
  useEffect(() => {
    if (account) {
      setForm((f) => ({ ...f, ethAddress: account }));
    }
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/freelancers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ethAddress: form.ethAddress,
          fullName: form.fullName,
          email: form.email,
          skills: form.skills,
          portfolio: form.portfolio,
          hourlyRate: form.hourlyRate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur">
      <h2 className="text-lg font-semibold text-white mb-1">Create Your Profile</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Register as a freelancer to get hired and paid directly on-chain.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              placeholder="Satoshi Nakamoto"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="satoshi@bitcoin.org"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
        </div>

        <div>
           <label className="block text-xs font-medium text-zinc-400 mb-1.5">Top Skills / Profession</label>
           <input
             type="text"
             required
             placeholder="e.g. Senior Smart Contract Auditor"
             value={form.skills}
             onChange={(e) => setForm({ ...form, skills: e.target.value })}
             className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
           />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Portfolio or Website URL</label>
            <input
              type="url"
              placeholder="https://github.com/..."
              value={form.portfolio}
              onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hourly Rate (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="75"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-7 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>
          </div>
        </div>

        <div>
           <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ethereum Payment Address</label>
           {!account ? (
             <button
               type="button"
               onClick={connectWallet}
               className="w-full rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 py-3 text-sm font-medium text-violet-400 hover:bg-violet-500/10 transition-colors shadow-inner"
             >
                Connect Wallet to Auto-fill Address
             </button>
           ) : (
             <input
               type="text"
               readOnly
               value={form.ethAddress}
               className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 outline-none cursor-not-allowed font-mono"
             />
           )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !form.ethAddress}
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-500/20 mt-4 flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving Profile...
            </>
          ) : (
            "Complete Registration →"
          )}
        </button>
      </form>

      {errorMsg && (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errorMsg}
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
             ✓
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Profile Created Successfully!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">Your profile is safe. Clients can now hire you right on-chain.</p>
          </div>
        </div>
      )}
    </div>
  );
}
