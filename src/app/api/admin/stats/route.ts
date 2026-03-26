import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  
  // Create an auth client to verify the user token
  const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  
  if (userError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Use service role key for actual database queries
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check user role
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('identifier', user.email)
    .single();

  if (roleError || roleData?.role !== 'admin') {
    return NextResponse.json({ error: "Access denied. Action requires administrator privileges." }, { status: 403 });
  }

  // ── Freelancers count ─────────────────────────────────────────────────────
  const { count: freelancerCount } = await supabase
    .from("freelancers")
    .select("id", { count: "exact", head: true });

  // ── Jobs count & distinct clients ────────────────────────────────────────
  const { count: jobCount } = await supabase
    .from("jobs_meta")
    .select("id", { count: "exact", head: true });

  const { data: clientData } = await supabase
    .from("jobs_meta")
    .select("client_address");

  const distinctClients = clientData
    ? new Set(clientData.map((r: { client_address: string }) => r.client_address)).size
    : 0;

  // ── Milestones count (proxy for money activity) ───────────────────────────
  const { count: milestoneCount } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true });

  // ── Disputes by status ────────────────────────────────────────────────────
  const { data: disputeData } = await supabase
    .from("disputes")
    .select("id, status, chain_job_id, milestone_index, client_address, freelancer_address, created_at, updated_at, client_evidence, freelancer_evidence");

  const allDisputes = disputeData ?? [];
  const openDisputes = allDisputes.filter((d: { status: string }) =>
    ["open", "client_submitted", "freelancer_submitted", "evidence_complete"].includes(d.status)
  ).length;
  const resolvedDisputes = allDisputes.filter((d: { status: string }) =>
    d.status.startsWith("resolved")
  ).length;

  // ── Ratings / reviews ─────────────────────────────────────────────────────
  const { count: ratingCount } = await supabase
    .from("ratings")
    .select("id", { count: "exact", head: true });

  // ── Recent jobs ───────────────────────────────────────────────────────────
  const { data: recentJobs } = await supabase
    .from("jobs_meta")
    .select("id, chain_job_id, title, client_address, freelancer_address, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // ── Recent freelancers ────────────────────────────────────────────────────
  const { data: recentFreelancers } = await supabase
    .from("freelancers")
    .select("id, full_name, email, eth_address, skills, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    stats: {
      freelancerCount: freelancerCount ?? 0,
      jobCount: jobCount ?? 0,
      distinctClients,
      milestoneCount: milestoneCount ?? 0,
      openDisputes,
      resolvedDisputes,
      totalDisputes: allDisputes.length,
      ratingCount: ratingCount ?? 0,
    },
    disputes: allDisputes,
    recentJobs: recentJobs ?? [],
    recentFreelancers: recentFreelancers ?? [],
  });
}
