import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

// POST /api/milestones — save milestone metadata to Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainJobId, milestones, clientAddress, freelancerAddress, jobTitle, jobDescription } = body;

    if (!chainJobId || !milestones || !Array.isArray(milestones)) {
      return NextResponse.json({ error: "chainJobId and milestones array are required" }, { status: 400 });
    }

    // Upsert job metadata
    const { error: jobError } = await supabase.from("jobs_meta").upsert(
      {
        chain_job_id: String(chainJobId),
        client_address: clientAddress ?? "",
        freelancer_address: freelancerAddress ?? "",
        title: jobTitle ?? "",
        description: jobDescription ?? "",
      },
      { onConflict: "chain_job_id" }
    );
    if (jobError) throw jobError;

    // Upsert each milestone
    const rows = milestones.map((ms: { title: string; description?: string }, index: number) => ({
      chain_job_id: String(chainJobId),
      milestone_index: index,
      title: ms.title,
      description: ms.description ?? "",
    }));

    const { error: msError } = await supabase.from("milestones").upsert(rows, {
      onConflict: "chain_job_id,milestone_index",
    });
    if (msError) throw msError;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/milestones?jobId=X — fetch milestones for a job
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId query param required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("chain_job_id", jobId)
    .order("milestone_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
