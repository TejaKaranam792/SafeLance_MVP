import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS, MILESTONE_ABI, MILESTONE_CONTRACT_ADDRESS } from "@/lib/contract";
import { Redis } from "@upstash/redis";

// Simple in-memory fallback if Redis is not yet configured in .env.local
const fallbackWalletTxCount = new Map<string, number>();
const fallbackIpRateLimit = new Map<string, { count: number; resetAt: number }>();

const MAX_FREE_TX = 5;
const MAX_IP_TX_PER_HOUR = 20;

// Initialize Redis client gracefully
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

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
    const { contractAddress, functionData, signature, userAddress, value } = body as {
      contractAddress?: string;
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

    const targetAddress = contractAddress || CONTRACT_ADDRESS;
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      return NextResponse.json(
        { error: "Invalid or missing contractAddress" },
        { status: 400 }
      );
    }

    // Select ABI based on target address
    const abi = targetAddress.toLowerCase() === MILESTONE_CONTRACT_ADDRESS.toLowerCase()
      ? MILESTONE_ABI
      : CONTRACT_ABI;

    // ── Friction / Rate Limiting ──────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for") || "unknown_ip";
    const normalizedWallet = userAddress.toLowerCase();

    let ipCount = 0;
    let walletCount = 0;

    if (redis) {
      ipCount = (await redis.get<number>(`rate_limit:ip:${ip}`)) || 0;
      walletCount = (await redis.get<number>(`quota:wallet:${normalizedWallet}`)) || 0;
    } else {
      const ipData = fallbackIpRateLimit.get(ip) || { count: 0, resetAt: Date.now() + 3600 * 1000 };
      if (Date.now() > ipData.resetAt) {
        ipData.count = 0;
        ipData.resetAt = Date.now() + 3600 * 1000;
      }
      ipCount = ipData.count;
      walletCount = fallbackWalletTxCount.get(normalizedWallet) || 0;
    }

    if (ipCount >= MAX_IP_TX_PER_HOUR) {
      return NextResponse.json({ error: "IP rate limit exceeded. Try again later." }, { status: 429 });
    }

    if (walletCount >= MAX_FREE_TX) {
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
      targetAddress,
      abi,
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
    if (redis) {
      const p = redis.pipeline();
      if (ipCount === 0) {
        p.set(`rate_limit:ip:${ip}`, 1, { ex: 3600 }); // Expire in 1 hour
      } else {
        p.incr(`rate_limit:ip:${ip}`);
      }
      p.incr(`quota:wallet:${normalizedWallet}`);
      await p.exec();
    } else {
      const ipData = fallbackIpRateLimit.get(ip) || { count: 0, resetAt: Date.now() + 3600 * 1000 };
      ipData.count += 1;
      fallbackIpRateLimit.set(ip, ipData);
      fallbackWalletTxCount.set(normalizedWallet, walletCount + 1);
    }

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
