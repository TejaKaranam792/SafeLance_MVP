"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletContext";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const navLinks = [
  { label: "Workspace", href: "/app" },
  { label: "Find Freelancers", href: "/freelancers" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function AppNavbar() {
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    disconnectWallet();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-2xl bg-[#0a0a0c]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-200">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-white font-bold tracking-tight text-lg">
            Safe<span className="text-purple-400">Lance</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {session ? (
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          ) : (
            <Link
              href="/auth?tab=login"
              className="hidden md:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all duration-200"
            >
              Log In
            </Link>
          )}

          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              account
                ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 shadow-[0_0_15px_rgba(74,222,128,0.15)]"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.5)] border border-purple-500/20"
            } disabled:opacity-60 disabled:cursor-not-allowed hidden sm:flex`}
          >
            {account ? (
              <>
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                {truncate(account)}
              </>
            ) : isConnecting ? (
              "Connecting…"
            ) : (
              "Connect Wallet"
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0a0a0c]/95 px-6 py-4">
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
            
            {session ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileOpen(false);
                }}
                className="mt-2 py-2.5 flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors text-left w-full"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <Link
                href="/auth?tab=login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Log In
              </Link>
            )}

            {/* Mobile connect wallet */}
            <button
              onClick={() => {
                connectWallet();
                setMobileOpen(false);
              }}
              disabled={isConnecting}
              className={`mt-4 relative flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 sm:hidden ${
                account
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {account ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                  {truncate(account)}
                </>
              ) : isConnecting ? (
                "Connecting…"
              ) : (
                "Connect Wallet"
              )}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
