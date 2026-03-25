import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Update the jobs_meta table
    const { data, error } = await supabase
      .from("jobs_meta")
      .update({ freelancer_status: status })
      .eq("chain_job_id", String(chainJobId))
      .select()
      .single();

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
