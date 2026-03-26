import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// GET /api/disputes?chain_job_id=X&milestone_index=Y
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chain_job_id = searchParams.get("chain_job_id");
  const milestone_index = searchParams.get("milestone_index");

  if (!chain_job_id || milestone_index === null) {
    return NextResponse.json(
      { error: "chain_job_id and milestone_index are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .eq("chain_job_id", chain_job_id)
    .eq("milestone_index", Number(milestone_index))
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  return NextResponse.json(data);
}

// POST /api/disputes — create a dispute record after on-chain disputeMilestone()
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { chain_job_id, milestone_index, client_address, freelancer_address } = body;

  if (!chain_job_id || milestone_index === undefined || !client_address || !freelancer_address) {
    return NextResponse.json(
      { error: "chain_job_id, milestone_index, client_address, freelancer_address are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("disputes")
    .insert({
      chain_job_id: String(chain_job_id),
      milestone_index: Number(milestone_index),
      client_address: client_address.toLowerCase(),
      freelancer_address: freelancer_address.toLowerCase(),
      status: "open",
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation — dispute already exists, return it
    if (error.code === "23505") {
      const { data: existing } = await supabase
        .from("disputes")
        .select("*")
        .eq("chain_job_id", chain_job_id)
        .eq("milestone_index", milestone_index)
        .single();
      return NextResponse.json(existing);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
