import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let query = supabase.from("freelancers").select("*").order("created_at", { ascending: false });

  if (search) {
    query = query.or(`skills.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ethAddress, fullName, email, skills, portfolio, hourlyRate } = body;

    if (!ethAddress || !fullName || !email || !skills) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("freelancers")
      .upsert({
        eth_address: ethAddress,
        full_name: fullName,
        email,
        skills,
        portfolio,
        hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      }, { onConflict: "eth_address" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
