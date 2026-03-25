import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletContext";

export const metadata: Metadata = {
  title: "SafeLance — Trustless Freelance Escrow",
  description:
    "SafeLance secures payments between clients and freelancers using smart contracts and gasless transactions. Work without trust issues.",
  keywords: ["safelance", "escrow", "freelance", "web3", "gasless", "smart contract", "ethereum"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0d0f] text-white antialiased">
        <WalletProvider>
          <main>{children}</main>
          {/* Ambient background blobs */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
