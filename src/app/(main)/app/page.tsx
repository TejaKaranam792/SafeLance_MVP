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

interface MilestoneRow {
  title: string;
  description: string;
  amountEth: string;
}

function AppPageContent() {
  const { account, provider, getNonce, connectWallet } = useWallet();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"client" | "freelancer">(
    (searchParams?.get("tab") as "client" | "freelancer") || "client"
  );

  // Job form fields
  const [freelancerAddress, setFreelancerAddress] = useState(searchParams?.get("hire") || "");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { title: "", description: "", amountEth: "0.01" },
    { title: "", description: "", amountEth: "0.01" },
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
      setActiveTab("client");
      setFreelancerAddress(hireAddress);
    }
  }, [searchParams]);

  // ── Milestone helpers ──────────────────────────────────────────────────────
  function addMilestone() {
    if (milestones.length >= 10) return;
    setMilestones((ms) => [...ms, { title: "", description: "", amountEth: "0.01" }]);
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

    try {
      const milestoneTitles = milestones.map((m) => m.title.trim());
      const milestoneAmounts = milestones.map((m) =>
        ethers.parseEther(String(parseFloat(m.amountEth)))
      );

      // Use direct contract call (user signs directly — meta-tx for arrays needs custom encoding)
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(MILESTONE_CONTRACT_ADDRESS, MILESTONE_ABI, signer);

      const tx = await contract.createJobWithMilestones(
        freelancerAddress,
        jobTitle.trim(),
        jobDescription.trim(),
        milestoneTitles,
        milestoneAmounts
      );
      const receipt = await tx.wait();

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

        // Save metadata to Supabase
        await fetch("/api/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chainJobId: jobId,
            clientAddress: account,
            freelancerAddress,
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
            milestones: milestones.map((m) => ({
              title: m.title.trim(),
              description: m.description.trim(),
            })),
          }),
        });
      }

      // Reset form
      setFreelancerAddress("");
      setJobTitle("");
      setJobDescription("");
      setMilestones([{ title: "", description: "", amountEth: "0.01" }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-all duration-200"
        >
          <LayoutDashboard className="h-4 w-4" />
          View Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur max-w-sm">
        {(["client", "freelancer"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === t
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t === "client" ? <Briefcase className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
            {t === "client" ? "Hire a Freelancer" : "Become a Freelancer"}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start">
        {/* ── Main form ──────────────────────────────────────────────────── */}
        <div className="md:col-span-3">
          {activeTab === "client" ? (
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
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Job Title */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Job Title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      placeholder="Build a DeFi Dashboard"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                    />
                  </div>

                  {/* Freelancer address */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Freelancer Wallet Address
                    </label>
                    <input
                      type="text"
                      value={freelancerAddress}
                      onChange={(e) => setFreelancerAddress(e.target.value)}
                      required
                      pattern="^0x[a-fA-F0-9]{40}$"
                      placeholder="0x..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
                    />
                    <p className="text-[11px] text-zinc-600 mt-1.5">
                      Don&apos;t know a freelancer?{" "}
                      <Link href="/freelancers" className="text-violet-400 hover:text-violet-300">
                        Browse the directory →
                      </Link>
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Job Description</label>
                    <textarea
                      rows={2}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Overview of the work scope..."
                      maxLength={280}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
                    />
                  </div>

                  {/* ── Milestones ─────────────────────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-zinc-400">
                        Milestones ({milestones.length}/10)
                      </label>
                      <span className="text-xs font-semibold text-white">
                        Total: {totalEth.toFixed(4)} ETH
                      </span>
                    </div>

                    <div className="space-y-3">
                      {milestones.map((ms, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">
                              Milestone {idx + 1}
                            </span>
                            {milestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMilestone(idx)}
                                className="text-zinc-700 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            value={ms.title}
                            onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                            required
                            placeholder="Milestone title (e.g. Design Mockup)"
                            className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-700 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={ms.description}
                              onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                              placeholder="Short description (optional)"
                              className="rounded-lg border border-white/8 bg-white/5 px-3 py-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                            />
                            <div className="relative">
                              <input
                                type="number"
                                value={ms.amountEth}
                                onChange={(e) => updateMilestone(idx, "amountEth", e.target.value)}
                                required
                                min="0.0001"
                                step="0.001"
                                placeholder="0.05"
                                className="w-full rounded-lg border border-white/8 bg-white/5 pl-3 pr-12 py-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-600 pointer-events-none">
                                ETH
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {milestones.length < 10 && (
                      <button
                        type="button"
                        onClick={addMilestone}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-transparent hover:bg-white/3 py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Milestone
                      </button>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Job…
                      </>
                    ) : (
                      <>
                        Create Job with {milestones.length} Milestone{milestones.length !== 1 ? "s" : ""}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Success */}
              {createdJobId !== null && (
                <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">Job #{createdJobId} Created!</p>
                  </div>
                  <p className="text-xs text-emerald-400/70 mb-3">
                    Milestones are live on-chain. Fund each milestone to begin work.
                  </p>
                  <Link
                    href={`/jobs/${createdJobId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Go to Payment Page →
                  </Link>
                </div>
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

        {/* ── Side panel ──────────────────────────────────────────────────── */}
        <div className="md:col-span-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            {activeTab === "client" ? "How milestones work" : "Why join?"}
          </p>
          {(activeTab === "client"
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
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AppPageContent />
    </Suspense>
  );
}
