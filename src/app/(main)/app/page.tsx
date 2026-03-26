"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/components/WalletContext";
import { MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS } from "@/lib/contract";
import FreelancerRegistration from "@/components/FreelancerRegistration";
import { supabase } from "@/lib/supabase";
import {
  Briefcase, UserCircle, LayoutDashboard, ArrowRight,
  Plus, Trash2, Loader2, CheckCircle,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { encodeAndRelay } from "@/lib/relay";
import { CHAIN_ID } from "@/lib/contract";

interface MilestoneRow {
  freelancerAddress: string;
  title: string;
  description: string;
  amountEth: string;
}

function AppPageContent() {
  const { account, provider, connectWallet } = useWallet();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [role, setRole] = useState<"client" | "freelancer" | null>(null);

  // Hydrate role
  useEffect(() => {
    const saved = localStorage.getItem("safelance_role");
    if (saved === "client" || saved === "freelancer") {
      setRole(saved);
    }
  }, []);

  const selectRole = (r: "client" | "freelancer") => {
    localStorage.setItem("safelance_role", r);
    setRole(r);
  };

  // Job form fields
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const initialFreelancer = searchParams?.get("hire") || "";
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { freelancerAddress: initialFreelancer, title: "", description: "", amountEth: "0.01" },
    { freelancerAddress: initialFreelancer, title: "", description: "", amountEth: "0.01" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ email?: string } | null>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth");
      else setAuthUser({ email: session.user.email });
    });
  }, [router]);

  // Prefill hire address from URL
  useEffect(() => {
    const hireAddress = searchParams?.get("hire");
    if (hireAddress) {
      selectRole("client");
      setMilestones(prev => prev.map(m => ({ ...m, freelancerAddress: hireAddress })));
    }
  }, [searchParams]);

  // ── Milestone helpers ──────────────────────────────────────────────────────
  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones((ms) => [...ms, { freelancerAddress: ms[ms.length - 1]?.freelancerAddress || "", title: "", description: "", amountEth: "0.01" }]);
  }

  function removeMilestone(idx: number) {
    if (milestones.length <= 1) return;
    setMilestones((ms) => ms.filter((_, i) => i !== idx));
  }

  function updateMilestone(idx: number, field: keyof MilestoneRow, value: string) {
    setMilestones((ms) => ms.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  }

  const totalEth = milestones.reduce((sum, ms) => {
    const val = parseFloat(ms.amountEth);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !provider) {
      setError("Connect your MetaMask wallet first.");
      return;
    }
    if (!MILESTONE_CONTRACT_ADDRESS) {
      setError("Milestone contract not deployed yet. Add NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS to .env.local");
      return;
    }

    // Validation
    for (const ms of milestones) {
      if (!ms.title.trim()) { setError("All milestones must have a title."); return; }
      const amt = parseFloat(ms.amountEth);
      if (isNaN(amt) || amt <= 0) { setError("All milestone amounts must be > 0."); return; }
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedJobId(null);
    const toastId = toast("Connecting to chain...", "loading");

    try {
      const milestoneTitles = milestones.map((m) => m.title.trim());
      const freelancerAddresses = milestones.map((m) => m.freelancerAddress.trim());
      const milestoneAmounts = milestones.map((m) =>
        ethers.parseEther(String(parseFloat(m.amountEth)))
      );

      // Validate that all addresses are registered freelancers
      const valRes = await fetch("/api/freelancers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: freelancerAddresses }),
      });
      const valData = await valRes.json();
      if (!valData.valid) {
        throw new Error(`Unregistered freelancers: ${valData.unregistered.join(", ")}`);
      }

      // ── GASLESS RELAY ──────────────────────────────────────────────────────
      const contract = new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, provider);
      const nonce = await contract.getNonce(account);

      toast("Please sign the message in your wallet...", "loading");

      const { txHash } = await encodeAndRelay({
        contractAddress: MILESTONE_CONTRACT_ADDRESS,
        abi: MILESTONE_ABI,
        functionName: "createJobWithMilestones",
        args: [
          jobTitle.trim(),
          jobDescription.trim(),
          milestoneTitles,
          milestoneAmounts,
          freelancerAddresses
        ],
        userAddress: account,
        nonce,
        chainId: CHAIN_ID,
        provider
      });

      toast("Transaction submitted! Waiting for confirmation...", "loading");

      // Wait for tx on-chain (using provider)
      const receipt = await provider.waitForTransaction(txHash);
      
      // Extract jobId from event logs
      const iface = new ethers.Interface(MILESTONE_ABI);
      let jobId: number | null = null;
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed?.name === "JobCreated") {
            jobId = Number(parsed.args.jobId);
            break;
          }
        } catch {}
      }

      if (jobId !== null) {
        setCreatedJobId(jobId);
        const uniqueFreelancers = Array.from(new Set(freelancerAddresses)).join(",");
        await fetch("/api/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainJobId: jobId,
            clientAddress: account,
            freelancerAddress: uniqueFreelancers,
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
            milestones: milestones.map((m) => ({
              freelancerAddress: m.freelancerAddress.trim(),
              title: m.title.trim(),
              description: m.description.trim(),
            })),
          }),
        });
        toast("Job created successfully!", "success");
      }

      // Reset form
      setJobTitle("");
      setJobDescription("");
      setMilestones([{ freelancerAddress: initialFreelancer, title: "", description: "", amountEth: "0.01" }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setError(msg);
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (role === null) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 min-h-[85vh] flex flex-col items-center justify-center">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">Welcome to SafeLance</h1>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
            How are you looking to use the platform today? You can always switch this later.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-3xl animate-in fade-in zoom-in-95 duration-700 delay-150 fill-mode-both">
          {/* Client Card */}
          <button 
            onClick={() => selectRole("client")}
            className="group relative rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition-all duration-300 hover:bg-white/10 hover:border-violet-500/50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-32 bg-violet-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-violet-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="h-6 w-6 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">I want to hire</h2>
              <p className="text-zinc-400 leading-relaxed max-w-[90%]">
                Create Web3 jobs, assign milestones to verified talent, and fund escrow securely on-chain.
              </p>
            </div>
          </button>

          {/* Freelancer Card */}
          <button 
            onClick={() => selectRole("freelancer")}
            className="group relative rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition-all duration-300 hover:bg-white/10 hover:border-emerald-500/50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UserCircle className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">I want to work</h2>
              <p className="text-zinc-400 leading-relaxed max-w-[90%]">
                Build your on-chain reputation, discover gigs, and get paid instantly in crypto.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Page header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">
            {authUser?.email ? `Signed in as ${authUser.email}` : ""}
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Workspace</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRole(null)}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10"
          >
            Switch Role
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-all duration-200"
          >
            <LayoutDashboard className="h-4 w-4" />
            View Dashboard
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start">
        {/* ── Main form ──────────────────────────────────────────────────── */}
        <div className="md:col-span-3">
          {role === "client" ? (
            <div className="rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur">
              <h2 className="text-xl font-semibold text-white mb-1">Create a Job</h2>
              <p className="text-sm text-zinc-500 mb-7">
                Define milestones — funds are locked per milestone, released on approval.
              </p>

              {!account ? (
                <div className="text-center py-10">
                  <div className="h-14 w-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🦊</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-5">Connect your MetaMask wallet to create a job</p>
                  <button
                    onClick={connectWallet}
                    className="rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-500/20"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : createdJobId !== null ? (
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 py-16 px-8 text-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 bg-emerald-500/20 blur-[100px] pointer-events-none" />
                  <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6 relative z-10 animate-bounce" />
                  <h2 className="text-3xl font-bold text-white mb-3 relative z-10">Job Activated!</h2>
                  <p className="text-zinc-400 mb-10 relative z-10 max-w-sm mx-auto leading-relaxed">
                    Your {milestones.length}-milestone job has been secured on the Sepolia blockchain. Work can now begin.
                  </p>
                  <Link
                    href={`/jobs/${createdJobId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 hover:-translate-y-1 relative z-10 border border-emerald-500/50"
                  >
                    View Job & Escrow Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Job Title */}
                  <div className="group">
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 transition-colors group-focus-within:text-violet-400 uppercase tracking-widest">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      placeholder="e.g. Build a Web3 Platform"
                      className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:bg-white/5 focus:ring-4 focus:ring-violet-500/10 transition-all hover:bg-white/[0.04]"
                    />
                  </div>

                  {/* Description */}
                  <div className="group">
                    <label className="block text-xs font-semibold text-zinc-400 mb-2 transition-colors group-focus-within:text-violet-400 uppercase tracking-widest">
                      Job Description
                    </label>
                    <textarea
                      rows={3}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="High level overview of what needs to be built..."
                      maxLength={280}
                      className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:bg-white/5 focus:ring-4 focus:ring-violet-500/10 transition-all resize-none hover:bg-white/[0.04]"
                    />
                  </div>

                  {/* ── Milestones ─────────────────────────────────────────── */}
                  <div className="pt-6 mt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Project Milestones</h3>
                        <p className="text-xs text-zinc-500 mt-1">Assign deliverables, freelancers, and isolated funds</p>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Total Escrow</span>
                         <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                           {totalEth.toFixed(4)} ETH
                         </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {milestones.map((ms, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-violet-500/30 hover:shadow-[0_20px_50px_rgba(139,92,246,0.1)]"
                        >
                          {/* Accent border */}
                          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="flex items-center justify-between mb-6">
                            <span className="flex items-center gap-3">
                              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-violet-600 text-white text-xs font-black shadow-lg shadow-violet-500/20">
                                {idx + 1}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">
                                Milestone Phase
                              </span>
                            </span>
                            {milestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMilestone(idx)}
                                className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-xl transition-all"
                                title="Remove Milestone"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Title</label>
                              <input
                                type="text"
                                value={ms.title}
                                onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                                required
                                placeholder="Milestone name..."
                                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Freelancer Address</label>
                              <input
                                type="text"
                                value={ms.freelancerAddress}
                                onChange={(e) => updateMilestone(idx, "freelancerAddress", e.target.value)}
                                required
                                pattern="^0x[a-fA-F0-9]{40}$"
                                placeholder="0x..."
                                className="w-full font-mono rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Description (Requirements)</label>
                              <input
                                type="text"
                                value={ms.description}
                                onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                                placeholder="What needs to be delivered?"
                                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Budget (ETH)</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={ms.amountEth}
                                  onChange={(e) => updateMilestone(idx, "amountEth", e.target.value)}
                                  required
                                  min="0.0001"
                                  step="0.001"
                                  className="w-full rounded-xl border border-white/5 bg-black/20 pl-4 pr-12 py-3 text-sm font-bold text-white outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-violet-400">ETH</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {milestones.length < 10 && (
                      <button
                        type="button"
                        onClick={addMilestone}
                        className="group mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-transparent hover:bg-violet-500/5 py-4 text-sm font-bold text-zinc-400 hover:text-violet-300 hover:border-violet-500/30 transition-all duration-300"
                      >
                        <span className="flex items-center justify-center bg-white/5 rounded-full p-1 group-hover:bg-violet-500/20 transition-colors">
                          <Plus className="h-4 w-4" />
                        </span>
                        Add New Subject Phase
                      </button>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="relative w-full mt-10 overflow-hidden rounded-2xl group border border-white/10 p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
                    <div className="relative flex items-center justify-center gap-2 rounded-2xl bg-zinc-950/20 backdrop-blur-sm px-4 py-4 text-sm font-bold text-white transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
                          <span className="text-zinc-200">Deploying Escrow to Blockchain…</span>
                        </>
                      ) : (
                        <>
                          Deploy & Fund Jobs ({totalEth.toFixed(4)} ETH)
                          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1.5 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                </form>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <FreelancerRegistration />
          )}
        </div>

        {/* ── Side panel (Summary & Tips) ─────────────────────────────────── */}
        <div className="md:col-span-2 space-y-6">
          {/* Sticky Summary Card */}
          {role === "client" && (
            <div className="sticky top-24 rounded-2xl border border-violet-500/20 bg-violet-600/5 p-6 backdrop-blur-md">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Job Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Milestones</span>
                  <span className="text-white font-medium">{milestones.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Gas Fees</span>
                  <span className="text-emerald-400 font-bold">FREE (Gasless)</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                  <span className="text-xs font-bold text-zinc-300">Total Escrow</span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                    {totalEth.toFixed(4)} <small className="text-[10px] uppercase align-middle ml-1">ETH</small>
                  </span>
                </div>
              </div>

              {/* Status checklist helper */}
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div className={`h-1.5 w-1.5 rounded-full ${m.title ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                    <span className={m.title ? 'text-zinc-300' : 'text-zinc-600 truncate'}>
                      {m.title || `Phase ${i+1} title missing`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
              {role === "client" ? "How milestones work" : "Why join?"}
            </p>
            {(role === "client"
              ? [
                  { step: "01", title: "Create with milestones", body: "Define the scope and ETH amount per milestone in one transaction." },
                  { step: "02", title: "Fund each milestone", body: "Client sends exact ETH per milestone — locked in escrow, not releasable by anyone else." },
                  { step: "03", title: "Freelancer submits", body: "Freelancer marks work done and shares a deliverable link." },
                  { step: "04", title: "Client approves", body: "One click releases that milestone's ETH directly to the freelancer." },
                  { step: "05", title: "Dispute & refund", body: "If work isn't right, dispute it. Refund reclaims ETH to the client." },
                ]
              : [
                  { step: "01", title: "Register your profile", body: "Add your skills, portfolio URL and wallet address." },
                  { step: "02", title: "Get discovered", body: "Clients browse the public directory and hire you directly." },
                  { step: "03", title: "Work & get paid", body: "Each milestone approved — ETH lands in your wallet immediately." },
                ]
            ).map(({ step, title, body }) => (
              <div key={step} className="flex gap-3.5 rounded-xl border border-white/6 bg-white/2 p-4">
                <span className="flex-shrink-0 text-xl font-black text-white/10 leading-none pt-0.5">{step}</span>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppPageContent />
    </Suspense>
  );
}
