"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Zap, ArrowRight, CheckCircle, Clock, DollarSign } from "lucide-react";

const EscrowFlowMockup = () => (
  <div className="relative w-full rounded-2xl border border-white/10 bg-[#0a0a0c]/80 p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform hover:-translate-y-2 transition-transform duration-500">
    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 pointer-events-none" />
    {/* Mockup header */}
    <div className="flex items-center gap-2 mb-6">
      <div className="h-3 w-3 rounded-full bg-red-500/70" />
      <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
      <div className="h-3 w-3 rounded-full bg-green-500/70" />
      <div className="ml-3 h-5 flex-1 rounded-md bg-white/5 border border-white/8 flex items-center px-2">
        <span className="text-[10px] text-zinc-500">app.safelance.io/dashboard</span>
      </div>
    </div>

    {/* Active Job card */}
    <div className="relative rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 mb-3 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-50 pointer-events-none" />
      <div className="flex items-start justify-between mb-3 relative">
        <div>
          <p className="text-xs font-semibold text-white">Build a DeFi Dashboard UI</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Posted by 0x3a4f...d91c</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(74,222,128,0.2)] rounded-full px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
          Funded
        </span>
      </div>
      {/* Milestone progress */}
      <div className="space-y-2 relative">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-green-500/30 overflow-hidden relative">
            <div className="h-full w-full rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          </div>
          <span className="text-[10px] text-green-400 font-medium">0.5 ETH</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" />
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">0.8 ETH</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-white/10" />
          <span className="text-[10px] text-zinc-500">0.7 ETH</span>
        </div>
      </div>
    </div>

    {/* Escrow summary */}
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: "In Escrow", value: "2.0 ETH", color: "text-purple-400" },
        { label: "Released", value: "0.5 ETH", color: "text-green-400" },
        { label: "Pending", value: "1.5 ETH", color: "text-blue-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-center shadow-inner">
          <p className={`text-sm font-bold ${color} drop-shadow-sm`}>{value}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{label}</p>
        </div>
      ))}
    </div>

    {/* Gasless badge */}
    <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-zinc-400 bg-white/5 rounded-lg border border-white/5 py-2 px-3">
      <Zap className="h-3 w-3 text-yellow-400" />
      <span>Gas fees covered by SafeLance relay network</span>
    </div>
  </div>
);

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />
      
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-green-500/10 blur-[100px]" />

      <div className="mx-auto max-w-6xl px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 mb-8 shadow-[0_0_15px_rgba(147,51,234,0.15)]">
              <Shield className="h-3 w-3 text-purple-400" />
              Smart Contract Escrow · Gasless · Trustless
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              Work Without{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">
                  Trust Issues.
                </span>
              </span>
              <br />
              Get Paid{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                Securely.
              </span>
            </h1>

            <p className="text-lg text-zinc-300 leading-relaxed mb-8 max-w-xl font-medium">
              SafeLance uses smart contracts and gasless transactions to protect
              freelancers and clients — no middlemen, no disputes, no trust required.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/app"
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-7 py-3.5 text-base font-bold text-white transition-all duration-300 hover:from-purple-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:-translate-y-1"
              >
                Get Started
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-7 py-3.5 text-base font-bold text-white transition-all duration-300 hover:-translate-y-1">
                <img src="/metamask.jpg" alt="MetaMask" className="h-5 w-5 rounded-sm object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                Connect Wallet
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm font-medium text-zinc-400">
              {["No gas fees", "Non-custodial", "Audited contracts"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 shadow-[0_0_10px_rgba(74,222,128,0.4)] rounded-full" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Mockup */}
          <div className="relative lg:pl-6">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-purple-600/20 to-indigo-600/10 blur-3xl animate-pulse" />
            <EscrowFlowMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
