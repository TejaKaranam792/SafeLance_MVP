import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chain_job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainJobId, senderAddress, content } = body;

    if (chainJobId === undefined || chainJobId === null || !senderAddress || !content) {
      const missing = [];
      if (chainJobId === undefined || chainJobId === null) missing.push("chainJobId");
      if (!senderAddress) missing.push("senderAddress");
      if (!content) missing.push("content");
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chain_job_id: String(chainJobId),
        sender_address: senderAddress,
        content,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[messages-api] Supabase error:", error);
      return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[messages-api] Caught error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
