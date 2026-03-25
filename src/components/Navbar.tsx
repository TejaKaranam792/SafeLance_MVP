"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletContext";
import { Shield, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import NotificationDropdown from "./NotificationDropdown";


export default function Navbar() {
  const { disconnectWallet } = useWallet();
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
    router.refresh();
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

        {/* Desktop links - none for marketing, only right side buttons */}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session && <NotificationDropdown />}
          
          {session ? (
            <>
              <Link
                href="/app"
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 shadow-sm"
              >
                <LayoutDashboard className="h-4 w-4 text-purple-400" />
                Go to Workspace
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth?tab=login"
                className="hidden md:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all duration-200"
              >
                Log In
              </Link>
              <Link
                href="/auth?tab=signup"
                className="hidden md:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20 transition-all duration-200"
              >
                Sign Up
              </Link>
            </>
          )}


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
            {session ? (
              <>
                <Link
                  href="/app"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 flex items-center gap-2 text-sm font-semibold text-white transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-purple-400" />
                  Go to Workspace
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileOpen(false);
                  }}
                  className="py-2.5 flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth?tab=login"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/auth?tab=signup"
                  onClick={() => setMobileOpen(false)}
                  className="py-2.5 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}

          </nav>
        </div>
      )}
    </header>
  );
}
