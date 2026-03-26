import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH /api/disputes/evidence
// Body: { chain_job_id, milestone_index, role: "client" | "freelancer", statement, evidence_url, wallet_address }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    chain_job_id,
    milestone_index,
    role,
    statement,
    evidence_url,
    wallet_address,
  } = body;

  if (chain_job_id === undefined || chain_job_id === null || milestone_index === undefined || !role || !wallet_address) {
    const missing = [];
    if (chain_job_id === undefined || chain_job_id === null) missing.push("chain_job_id");
    if (milestone_index === undefined) missing.push("milestone_index");
    if (!role) missing.push("role");
    if (!wallet_address) missing.push("wallet_address");
    return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  if (role !== "client" && role !== "freelancer") {
    return NextResponse.json({ error: "role must be 'client' or 'freelancer'" }, { status: 400 });
  }

  // Fetch current dispute to validate wallet ownership
  const { data: dispute, error: fetchError } = await supabase
    .from("disputes")
    .select("*")
    .eq("chain_job_id", String(chain_job_id))
    .eq("milestone_index", Number(milestone_index))
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  if (dispute.status.startsWith("resolved")) {
    return NextResponse.json({ error: "Dispute already resolved" }, { status: 409 });
  }

  const walletLower = wallet_address.toLowerCase();

  if (role === "client" && dispute.client_address !== walletLower) {
    return NextResponse.json({ error: "Wallet does not match client" }, { status: 403 });
  }
  if (role === "freelancer" && dispute.freelancer_address !== walletLower) {
    return NextResponse.json({ error: "Wallet does not match freelancer" }, { status: 403 });
  }

  // Build update fields
  const updateFields: Record<string, unknown> = {};
  if (role === "client") {
    updateFields.client_statement = statement ?? dispute.client_statement;
    updateFields.client_evidence_url = evidence_url ?? dispute.client_evidence_url;
  } else {
    updateFields.freelancer_statement = statement ?? dispute.freelancer_statement;
    updateFields.freelancer_evidence_url = evidence_url ?? dispute.freelancer_evidence_url;
  }

  // Advance status
  const clientSubmitted = role === "client" || !!dispute.client_statement;
  const freelancerSubmitted = role === "freelancer" || !!dispute.freelancer_statement;

  if (clientSubmitted && freelancerSubmitted) {
    updateFields.status = "evidence_complete";
  } else if (role === "client") {
    updateFields.status = "client_submitted";
  } else {
    updateFields.status = "freelancer_submitted";
  }

  const { data, error } = await supabase
    .from("disputes")
    .update(updateFields)
    .eq("chain_job_id", String(chain_job_id))
    .eq("milestone_index", Number(milestone_index))
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
