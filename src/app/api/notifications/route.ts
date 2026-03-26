import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  // 1. Fetch jobs where address is client or freelancer
  const { data: jobs_meta, error: jobsError } = await supabase
    .from("jobs_meta")
    .select("*")
    .or(`client_address.ilike.${address},freelancer_address.ilike.${address}`);

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  const notifications = [];

  // Generate job-related notifications
  for (const job of jobs_meta) {
    const isClient = job.client_address.toLowerCase() === address.toLowerCase();
    const isFreelancer = job.freelancer_address.toLowerCase() === address.toLowerCase();
    const status = job.freelancer_status;

    if (isFreelancer && status === "pending") {
      notifications.push({
        id: `job-${job.chain_job_id}-pending`,
        title: "New Gig Offer!",
        description: `You have been hired for '${job.title}'. Please review the offer.`,
        type: "job",
        read: false,
        time: job.created_at, // Sort by this later
        link: `/app`
      });
    }

    if (isClient && status === "accepted") {
      notifications.push({
        id: `job-${job.chain_job_id}-accepted`,
        title: "Offer Accepted",
        description: `Your offer for '${job.title}' was accepted!`,
        type: "job",
        read: false,
        time: job.updated_at || job.created_at,
        link: `/app`
      });
    }

    if (isClient && status === "rejected") {
      notifications.push({
        id: `job-${job.chain_job_id}-rejected`,
        title: "Offer Rejected",
        description: `Your offer for '${job.title}' was rejected.`,
        type: "system",
        read: false,
        time: job.updated_at || job.created_at,
        link: `/app`
      });
    }
  }

  // Fetch messages where this user is part of the job, but DID NOT send the message
  if (jobs_meta.length > 0) {
    const jobIds = jobs_meta.map((j: any) => j.chain_job_id);
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .in("chain_job_id", jobIds)
      .not("sender_address", "ilike", address); // sender_address != address

    if (!messagesError && messages) {
      for (const msg of messages) {
        const job = jobs_meta.find((j: any) => j.chain_job_id === msg.chain_job_id);
        if (job) {
          notifications.push({
            id: `msg-${msg.id}`, // the Supabase messages table has an id
            title: "New Message",
            description: `You received a new message for '${job.title}'.`,
            type: "message",
            read: false,
            time: msg.created_at,
            link: `/app/jobs/${job.chain_job_id}`
          });
        }
      }
    }
  }

  // Sort newest first
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json(notifications);
}
