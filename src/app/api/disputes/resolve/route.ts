import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/disputes/resolve
// Body: { chain_job_id, milestone_index, ruling: "freelancer" | "client", admin_notes? }
// Requires header: x-admin-secret: <ADMIN_SECRET>
export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { chain_job_id, milestone_index, ruling, admin_notes } = body;

  if (!chain_job_id || milestone_index === undefined || !ruling) {
    return NextResponse.json({ error: "chain_job_id, milestone_index, ruling are required" }, { status: 400 });
  }

  if (ruling !== "freelancer" && ruling !== "client") {
    return NextResponse.json({ error: "ruling must be 'freelancer' or 'client'" }, { status: 400 });
  }

  const { data: dispute, error: fetchError } = await supabase
    .from("disputes")
    .select("*")
    .eq("chain_job_id", String(chain_job_id))
    .eq("milestone_index", Number(milestone_index))
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.status.startsWith("resolved")) {
    return NextResponse.json({ error: "Already resolved" }, { status: 409 });
  }

  const newStatus = ruling === "freelancer" ? "resolved_freelancer" : "resolved_client";

  const { data, error } = await supabase
    .from("disputes")
    .update({
      status: newStatus,
      admin_notes: admin_notes ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq("chain_job_id", String(chain_job_id))
    .eq("milestone_index", Number(milestone_index))
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
