import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/ratings
 * Called by the client after approving a milestone on-chain.
 * Saves the star rating + optional comment to Supabase for fast reads.
 */
export async function POST(req: NextRequest) {
  let body: {
    freelancer_address: string;
    client_address: string;
    chain_job_id: string;
    milestone_index: number;
    stars: number;
    comment?: string;
    eth_amount: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { freelancer_address, client_address, chain_job_id, milestone_index, stars, comment, eth_amount } = body;

  // Basic validation
  if (!freelancer_address || !client_address || !chain_job_id || milestone_index === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'stars must be 1–5' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('ratings')
    .upsert(
      {
        freelancer_address: freelancer_address.toLowerCase(),
        client_address:     client_address.toLowerCase(),
        chain_job_id,
        milestone_index,
        stars,
        comment: comment ?? null,
        eth_amount,
      },
      { onConflict: 'chain_job_id,milestone_index' }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('[ratings] supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rating: data });
}
