import Link from "next/link";
import { Github, Twitter, MessageCircle, Shield } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#" },
    { label: "How It Works", href: "#" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Find Freelancers", href: "/freelancers" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "Smart Contracts", href: "#" },
    { label: "API Reference", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
};

const socials = [
  { icon: <Github className="h-4 w-4" />, href: "#", label: "GitHub" },
  { icon: <Twitter className="h-4 w-4" />, href: "#", label: "Twitter" },
  { icon: <MessageCircle className="h-4 w-4" />, href: "#", label: "Discord" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/8 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-500/20">
                <Shield className="h-4 w-4" />
              </span>
              <span className="text-white font-semibold tracking-tight text-lg">
                Safe<span className="text-violet-400">Lance</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed mb-5 max-w-xs">
              Trustless freelance escrow powered by smart contracts. Work securely,
              anywhere in the world.
            </p>
            <div className="flex gap-3">
              {socials.map(({ icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/6 pt-8">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} SafeLance. All rights reserved.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs text-zinc-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sepolia Testnet · Contracts Audited
          </div>
        </div>
      </div>
    </footer>
  );
}
