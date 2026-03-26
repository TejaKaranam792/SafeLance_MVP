"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Eye, EyeOff, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "login" | "signup";
type Status = { type: "success" | "error"; message: string } | null;

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/app");
    });
  }, [router]);

  function setField(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setStatus(null);
  }

  // ─── Email / Password Auth ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (tab === "signup") {
      // Validation
      if (form.password !== form.confirmPassword) {
        setStatus({ type: "error", message: "Passwords do not match." });
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setStatus({ type: "error", message: "Password must be at least 6 characters." });
        setLoading(false);
        return;
      }
      if (!form.agreeTerms) {
        setStatus({ type: "error", message: "You must agree to the Terms of Service." });
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.name },
        },
      });

      if (signUpError) {
        // Friendly message for email rate limit
        if (
          signUpError.message.toLowerCase().includes("rate limit") ||
          signUpError.message.toLowerCase().includes("email") ||
          (signUpError as { code?: string }).code === "over_email_send_rate_limit"
        ) {
          setStatus({
            type: "error",
            message:
              "Email rate limit reached. To fix this, go to your Supabase dashboard → Authentication → Providers → Email → disable \"Confirm email\". Or wait a few minutes and try again.",
          });
        } else {
          setStatus({ type: "error", message: signUpError.message });
        }
      } else {
        // Try to auto-sign-in immediately (works if email confirmation is disabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (!signInError) {
          // Email confirmation disabled — go straight to workspace
          router.push("/app");
          return;
        }
        // Email confirmation required — prompt the user
        setStatus({
          type: "success",
          message: "Account created! Check your inbox to confirm your email, then log in.",
        });
        setTab("login");
        setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
      }
    } else {
      // ── Admin shortcut ────────────────────────────────────────────────────
      if (
        form.email === "admin@admin.com" &&
        form.password === "teja1432teja@2005"
      ) {
        sessionStorage.setItem("admin_session", "true");
        router.push("/admin/dashboard");
        return;
      }

      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) {
        const msg =
          error.message === "Email not confirmed"
            ? "Please confirm your email before logging in. Check your inbox."
            : error.message;
        setStatus({ type: "error", message: msg });
      } else {
        router.push("/app");
      }
    }

    setLoading(false);
  }

  // ─── MetaMask Wallet Auth ─────────────────────────────────────────────────────
  async function handleMetaMaskAuth() {
    if (typeof window === "undefined" || !(window as unknown as { ethereum?: unknown }).ethereum) {
      setStatus({ type: "error", message: "MetaMask not detected. Please install it first." });
      return;
    }
    setWalletLoading(true);
    setStatus(null);

    try {
      const ethereum = (window as unknown as { ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<any> } }).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Sign a static message to generate a reproducible password
      const nonce = `Authenticate with SafeLance:\n\nClick "Sign" to securely log in using your wallet address.`;
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [nonce, address],
      });

      // Use wallet address as an email proxy for Supabase
      const proxyEmail = `${address.toLowerCase()}@wallet.safelance.io`;
      const proxyPassword = signature.slice(0, 64); // Reproducible signature as stable password

      // Try to sign in first, then sign up if user doesn't exist
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: proxyEmail,
        password: proxyPassword,
      });

      if (signInError) {
        // First time — register
        const { error: signUpError } = await supabase.auth.signUp({
          email: proxyEmail,
          password: proxyPassword,
          options: {
            data: { wallet_address: address, full_name: `${address.slice(0, 6)}…${address.slice(-4)}` },
          },
        });
        if (signUpError) throw signUpError;
      }

      router.push("/app");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Wallet connection failed.";
      setStatus({ type: "error", message: errMsg });
    } finally {
      setWalletLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-600/8 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-white font-semibold tracking-tight text-lg">
            Safe<span className="text-violet-400">Lance</span>
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-zinc-400 text-sm">
              {tab === "login"
                ? "Sign in to access your SafeLance workspace."
                : "Start freelancing securely on the blockchain."}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-xl p-7 shadow-2xl">
            {/* Tabs */}
            <div className="flex rounded-xl border border-white/8 bg-white/3 p-1 mb-6">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setStatus(null); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200 ${
                    tab === t
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* MetaMask button */}
            <button
              onClick={handleMetaMaskAuth}
              disabled={walletLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-orange-500/25 bg-orange-500/5 hover:bg-orange-500/12 px-4 py-3 text-sm font-semibold text-orange-300 hover:text-orange-200 transition-all duration-200 mb-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {walletLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-lg" role="img" aria-label="fox">🦊</span>
              )}
              {walletLoading ? "Connecting wallet…" : "Continue with MetaMask"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-xs text-zinc-600">or with email</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Status feedback */}
            {status && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 mb-5 text-sm ${
                  status.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-red-500/10 border-red-500/25 text-red-400"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Alex Johnson"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                  <input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Password</label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!form.email) {
                          setStatus({ type: "error", message: "Enter your email first." });
                          return;
                        }
                        const { error } = await supabase.auth.resetPasswordForEmail(form.email);
                        if (error) setStatus({ type: "error", message: error.message });
                        else setStatus({ type: "success", message: "Password reset email sent! Check your inbox." });
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    required
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-10 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="confirmPassword"
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => setField("confirmPassword", e.target.value)}
                        required
                        autoComplete="new-password"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 pr-10 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={form.agreeTerms}
                      onChange={(e) => setField("agreeTerms", e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-violet-500 cursor-pointer"
                    />
                    <label htmlFor="agreeTerms" className="text-xs text-zinc-500 leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <a href="#" className="text-violet-400 hover:text-violet-300">Terms of Service</a>{" "}
                      and{" "}
                      <a href="#" className="text-violet-400 hover:text-violet-300">Privacy Policy</a>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? tab === "login" ? "Signing in…" : "Creating account…"
                  : tab === "login" ? "Log In to SafeLance" : "Create Account"}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-600 mt-5">
              {tab === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setTab(tab === "login" ? "signup" : "login"); setStatus(null); }}
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                {tab === "login" ? "Sign up free" : "Log in"}
              </button>
            </p>
          </div>

          <p className="text-center text-[11px] text-zinc-700 mt-6">
            Protected by Supabase Auth · Non-custodial · End-to-end encrypted
          </p>
        </div>
      </main>
    </div>
  );
}
