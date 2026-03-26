import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "@/lib/contract";

// Simple in-memory rate limiters (Memory resets on cold starts in serverless, but adds basic MVP friction)
const walletTxCount = new Map<string, number>();
const IP_RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const MAX_FREE_TX = 5;
const MAX_IP_TX_PER_HOUR = 20;

/**
 * POST /api/relay
 *
 * Body: { functionData: string, signature: string, userAddress: string, value?: string }
 *
 * The server-side relayer wallet submits the meta-transaction to the contract,
 * paying gas. Private key NEVER leaves the server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { functionData, signature, userAddress, value } = body as {
      functionData: string;
      signature: string;
      userAddress: string;
      value?: string;
    };

    // ── Input validation ──────────────────────────────────────────────────
    if (!functionData || !signature || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields: functionData, signature, userAddress" },
        { status: 400 }
      );
    }

    if (!ethers.isAddress(userAddress)) {
      return NextResponse.json(
        { error: "Invalid userAddress" },
        { status: 400 }
      );
    }

    if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
      return NextResponse.json(
        { error: "Server misconfiguration: CONTRACT_ADDRESS not set" },
        { status: 500 }
      );
    }

    // ── Friction / Rate Limiting ──────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || "unknown_ip";
    
    // IP Block Check
    const ipData = IP_RATE_LIMIT.get(ip) || { count: 0, resetAt: Date.now() + 3600 * 1000 };
    if (Date.now() > ipData.resetAt) {
      ipData.count = 0;
      ipData.resetAt = Date.now() + 3600 * 1000;
    }
    if (ipData.count >= MAX_IP_TX_PER_HOUR) {
      return NextResponse.json({ error: "IP rate limit exceeded. Try again later." }, { status: 429 });
    }

    // Wallet Quota Check
    const normalizedWallet = userAddress.toLowerCase();
    const currentTxCount = walletTxCount.get(normalizedWallet) || 0;
    if (currentTxCount >= MAX_FREE_TX) {
      return NextResponse.json(
        { error: "Free gasless transaction quota exceeded (max 5 per wallet). Please pay your own gas." }, 
        { status: 429 }
      );
    }

    // ── Relayer wallet (server-side only) ─────────────────────────────────
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: RELAYER_PRIVATE_KEY not set" },
        { status: 500 }
      );
    }

    const envRpc = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL;
    const rpcUrl = (envRpc && !envRpc.includes("rpc.sepolia.org"))
      ? envRpc
      : "https://ethereum-sepolia-rpc.publicnode.com";

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayerWallet = new ethers.Wallet(relayerKey, provider);

    // ── Send executeMetaTx transaction ────────────────────────────────────
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      relayerWallet
    );

    const ethValue = value ? BigInt(value) : BigInt(0);

    const tx = await contract.executeMetaTx(
      userAddress,
      functionData,
      signature,
      { value: ethValue }
    );

    const receipt = await tx.wait();

    // ── Update Counters ───────────────────────────────────────────────────
    ipData.count += 1;
    IP_RATE_LIMIT.set(ip, ipData);
    walletTxCount.set(normalizedWallet, currentTxCount + 1);

    return NextResponse.json({
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err: unknown) {
    console.error("[relay] Error:", err);

    // Surface on-chain revert reason when possible
    const message =
      err instanceof Error ? err.message : "Unknown relay error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
