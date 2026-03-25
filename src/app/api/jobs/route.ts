import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/jobs?address=0x...
// Returns all jobs where the address is the client OR freelancer
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address query param required" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  // Fetch jobs where user is client
  const { data: clientJobs, error: clientError } = await supabase
    .from("jobs_meta")
    .select("chain_job_id, title, description, client_address, freelancer_address, created_at, freelancer_status")
    .ilike("client_address", normalizedAddress)
    .order("created_at", { ascending: false });

  // Fetch jobs where user is freelancer
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

  // Deduplicate (shouldn't happen, but safety first)
  const seen = new Set<string>();
  const combined = [...(clientJobs ?? []), ...(freelancerJobs ?? [])].filter((j) => {
    if (seen.has(j.chain_job_id)) return false;
    seen.add(j.chain_job_id);
    return true;
  });

  return NextResponse.json(combined);
}
