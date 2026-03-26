import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JsonRpcProvider, Contract, formatEther } from 'ethers';

// Use Service Role Key to bypass RLS for server-side reads if available
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
  }
);

export const dynamic = 'force-dynamic';

// Minimal ABI for ReputationRegistry view functions
const REPUTATION_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [
      { name: 'milestonesCompleted', type: 'uint256' },
      { name: 'totalEthEarned',      type: 'uint256' },
      { name: 'ratingSum',           type: 'uint256' },
      { name: 'ratingCount',         type: 'uint256' },
      { name: 'verified',            type: 'bool' },
    ],
  },
  {
    name: 'getScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAverageStarsX10',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = params.address?.toLowerCase().trim();

  if (!address || !/^0x[0-9a-f]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  // ── 1. Supabase: freelancer profile + ratings ──────────────────────────────
  const [profileRes, ratingsRes] = await Promise.all([
    supabase
      .from('freelancers')
      .select('full_name, email, skills, portfolio, hourly_rate, bio, avatar_url, github_url, twitter_url')
      .ilike('eth_address', address)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('ratings')
      .select('stars, comment, eth_amount, chain_job_id, milestone_index, client_address, created_at')
      .ilike('freelancer_address', address)
      .order('created_at', { ascending: false }),
  ]);

  console.log("[reputation-api] Keys detected:", {
    svcKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
  console.log("[reputation-api] Query Response for", address, "->", {
    hasData: !!profileRes.data,
    error: profileRes.error
  });


  // ── 2. On-chain: reputation stats via ethers v6 ──────────────────────────
  let onChainData = {
    milestonesCompleted: 0,
    totalEthEarned: '0',
    ratingSum: 0,
    ratingCount: 0,
    avgStarsX10: 0,
    score: 0,
    verified: false,
  };

  const registryAddress = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS;
  if (registryAddress) {
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
      const provider = new JsonRpcProvider(rpcUrl);
      const contract = new Contract(registryAddress, REPUTATION_ABI, provider);

      const [reputation, score, avgStarsX10] = await Promise.all([
        contract.getReputation(address),
        contract.getScore(address),
        contract.getAverageStarsX10(address),
      ]);

      onChainData = {
        milestonesCompleted: Number(reputation[0]),
        totalEthEarned:      formatEther(reputation[1]),
        ratingSum:           Number(reputation[2]),
        ratingCount:         Number(reputation[3]),
        avgStarsX10:         Number(avgStarsX10),
        score:               Number(score),
        verified:            reputation[4],
      };
    } catch (err) {
      console.error('[reputation] on-chain read failed:', err);
    }
  }


  // ── 3. Merge & respond ─────────────────────────────────────────────────────
  return NextResponse.json({
    address,
    profile:   profileRes.data  ?? null,
    ratings:   ratingsRes.data  ?? [],
    onChain:   onChainData,
  });
}
