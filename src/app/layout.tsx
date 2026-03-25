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
      <body className="min-h-screen bg-[#09090b] text-white antialiased">
        <WalletProvider>
          <main>{children}</main>
          {/* Ambient background blobs & grid texture */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#09090b]"
          >
            {/* Soft grid texture */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_100%)] opacity-60" />
            
            {/* Light blobs */}
            <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/15 blur-[120px]" />
            <div className="absolute top-[40%] -left-60 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[100px]" />
            <div className="absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
