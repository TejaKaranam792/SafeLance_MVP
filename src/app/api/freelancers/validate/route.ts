import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

/**
 * POST /api/freelancers/validate
 * Body: { addresses: string[] }
 * Returns: { valid: boolean, unregistered: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { addresses } = body as { addresses: string[] };

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: "addresses array required" }, { status: 400 });
    }

    // Normalize input addresses to lowercase
    const normalizedAddresses = Array.from(new Set(addresses.map(a => a.toLowerCase())));

    // Fetch matching freelancers from database
    const { data, error } = await supabase
      .from("freelancers")
      .select("eth_address")
      .in("eth_address", normalizedAddresses);

    if (error) {
      console.error("[validate] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Identify which addresses are missing
    const foundAddresses = new Set((data || []).map(row => row.eth_address.toLowerCase()));
    
    const unregistered = normalizedAddresses.filter(addr => !foundAddresses.has(addr));

    return NextResponse.json({
      valid: unregistered.length === 0,
      unregistered
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
