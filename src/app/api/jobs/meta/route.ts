import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchJobById, subgraphJobToMeta } from "@/lib/subgraph";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

// GET /api/jobs/meta?jobId=0
// Primary: The Graph  |  Fallback: Supabase
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // ── Primary: The Graph ─────────────────────────────────────────────────────
  const subgraphJob = await fetchJobById(jobId);
  if (subgraphJob) {
    const base = subgraphJobToMeta(subgraphJob);

    // Enrich with Supabase description + freelancer_status
    // Enrich with Supabase description + freelancer_status
    const { data: meta, error: metaError } = await supabase
      .from("jobs_meta")
      .select("description, freelancer_status, created_at")
      .eq("chain_job_id", jobId)
      .maybeSingle();

    if (metaError) {
      console.warn("[api/jobs/meta] Supabase enrich error:", metaError);
    }

    if (meta) {
      base.description = meta.description ?? "";
      base.freelancer_status = meta.freelancer_status ?? "accepted";
      base.created_at = meta.created_at ?? null;
    }

    return NextResponse.json(base);
  }

  // ── Fallback: Supabase ────────────────────────────────────────────────────
  console.warn("[api/jobs/meta] Subgraph unavailable, falling back to Supabase");

  const { data, error } = await supabase
    .from("jobs_meta")
    .select("chain_job_id, title, description, client_address, freelancer_address, created_at, freelancer_status")
    .eq("chain_job_id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[api/jobs/meta] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || {});
}
