import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchJobById, subgraphJobToMeta } from "@/lib/subgraph";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainJobId, status, freelancerAddress } = body;

    if (chainJobId === undefined || chainJobId === null || !status || !freelancerAddress) {
      const missing = [];
      if (chainJobId === undefined || chainJobId === null) missing.push("chainJobId");
      if (!status) missing.push("status");
      if (!freelancerAddress) missing.push("freelancerAddress");
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch current status
    // Fetch current statuses
    const { data: currentJob, error: fetchError } = await supabase
      .from("jobs_meta")
      .select("freelancer_status")
      .eq("chain_job_id", String(chainJobId))
      .maybeSingle();

    if (fetchError) {
       console.error("Supabase fetch error:", fetchError);
       return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let statuses: Record<string, string> = {};
    
    // Self-heal: If missing from Supabase but exists on-chain, create it
    if (!currentJob) {
      console.log(`[status-api] Job ${chainJobId} missing from Supabase, attempting self-heal from subgraph...`);
      const subgraphJob = await fetchJobById(String(chainJobId));
      if (subgraphJob) {
        const meta = subgraphJobToMeta(subgraphJob);
        const { error: insertError } = await supabase.from("jobs_meta").insert({
          chain_job_id: String(chainJobId),
          client_address: meta.client_address,
          freelancer_address: meta.freelancer_address,
          title: meta.title,
          description: meta.description,
          freelancer_status: JSON.stringify({ [freelancerAddress.toLowerCase()]: status })
        });
        if (insertError) {
          console.error("[status-api] Self-heal insert failed:", insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, status, healed: true });
      } else {
        return NextResponse.json({ error: "Job not found on-chain or in database" }, { status: 404 });
      }
    }

    if (currentJob?.freelancer_status) {
      try {
        statuses = JSON.parse(currentJob.freelancer_status);
        if (typeof statuses !== "object" || statuses === null) statuses = {};
      } catch (e) {
        console.error("Failed to parse freelancer_status:", e);
        statuses = {};
      }
    }

    statuses[freelancerAddress.toLowerCase()] = status;

    // Update the jobs_meta table
    const { data, error } = await supabase
      .from("jobs_meta")
      .update({ freelancer_status: JSON.stringify(statuses) })
      .eq("chain_job_id", String(chainJobId))
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
