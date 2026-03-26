import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchJobsByAddress, subgraphJobToMeta } from "@/lib/subgraph";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

// GET /api/jobs?address=0x...
// Returns all jobs where the address is the client OR freelancer
// Primary: The Graph subgraph (on-chain, always fresh)
// Fallback: Supabase jobs_meta table
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address query param required" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  // ── Primary: Try The Graph ─────────────────────────────────────────────────
  const subgraphJobs = await fetchJobsByAddress(normalizedAddress);
  if (subgraphJobs !== null) {
    const jobs = subgraphJobs.map(subgraphJobToMeta);

    // Re-enrich with Supabase metadata (description, freelancer_status) if available
    if (jobs.length > 0) {
      const chainIds = jobs.map((j) => j.chain_job_id);
      const { data: metaRows } = await supabase
        .from("jobs_meta")
        .select("chain_job_id, description, freelancer_status, created_at")
        .in("chain_job_id", chainIds);

      if (metaRows) {
        const metaMap = new Map(metaRows.map((r: any) => [r.chain_job_id, r]));
        for (const job of jobs) {
          const meta = metaMap.get(job.chain_job_id);
          if (meta) {
            job.description = meta.description ?? "";
            job.freelancer_status = meta.freelancer_status ?? "accepted";
            job.created_at = meta.created_at ?? null;
          }
        }
      }
    }

    return NextResponse.json(jobs);
  }

  // ── Fallback: Supabase ────────────────────────────────────────────────────
  console.warn("[api/jobs] Subgraph unavailable, falling back to Supabase");

  const { data: clientJobs, error: clientError } = await supabase
    .from("jobs_meta")
    .select("chain_job_id, title, description, client_address, freelancer_address, created_at, freelancer_status")
    .ilike("client_address", normalizedAddress)
    .order("created_at", { ascending: false });

  const { data: freelancerJobs, error: freelancerError } = await supabase
    .from("jobs_meta")
    .select("chain_job_id, title, description, client_address, freelancer_address, created_at, freelancer_status")
    .ilike("freelancer_address", `%${normalizedAddress}%`)
    .order("created_at", { ascending: false });

  if (clientError || freelancerError) {
    return NextResponse.json(
      { error: clientError?.message ?? freelancerError?.message },
      { status: 500 }
    );
  }

  const seen = new Set<string>();
  const combined = [...(clientJobs ?? []), ...(freelancerJobs ?? [])].filter((j) => {
    if (seen.has(j.chain_job_id)) return false;
    seen.add(j.chain_job_id);
    return true;
  });

  return NextResponse.json(combined);
}
