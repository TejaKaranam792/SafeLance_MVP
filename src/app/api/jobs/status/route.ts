import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainJobId, status, freelancerAddress } = body;

    if (!chainJobId || !status || !freelancerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Fetch current status
    const { data: currentJob } = await supabase
      .from("jobs_meta")
      .select("freelancer_status")
      .eq("chain_job_id", String(chainJobId))
      .single();

    let statuses: Record<string, string> = {};
    if (currentJob?.freelancer_status) {
      if (currentJob.freelancer_status.startsWith("{")) {
        try { statuses = JSON.parse(currentJob.freelancer_status); } catch (e) {}
      } else {
        // Legacy single string, wipe it or migrate it
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
