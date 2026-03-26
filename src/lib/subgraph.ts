/**
 * The Graph subgraph client for SafeLance
 * Fetches on-chain job and milestone data directly from the indexed subgraph.
 * Falls back to Supabase if the subgraph URL is not configured.
 */

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL;

interface SubgraphJob {
  id: string;
  client: string;
  title: string;
  milestoneCount: number;
  milestones: SubgraphMilestone[];
}

interface SubgraphMilestone {
  id: string;
  index: number;
  freelancer: string;
  title: string;
  amount: string;
  status: number; // 0=Pending 1=Funded 2=Submitted 3=Approved 4=Disputed 5=Refunded
}

async function querySubgraph<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
  if (!SUBGRAPH_URL) return null;
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 30 }, // cache 30s in Next.js
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) {
      console.error("[subgraph] GraphQL errors:", json.errors);
      return null;
    }
    return json.data as T;
  } catch (e) {
    console.error("[subgraph] fetch error:", e);
    return null;
  }
}

/**
 * Fetch all jobs where a given address is the client OR a freelancer on any milestone.
 * Returns null if the subgraph is unavailable (triggers Supabase fallback).
 */
export async function fetchJobsByAddress(address: string): Promise<SubgraphJob[] | null> {
  const normalizedAddress = address.toLowerCase();

  const query = `
    query JobsByAddress($client: Bytes!, $freelancer: Bytes!) {
      clientJobs: jobs(where: { client: $client }, orderBy: id, orderDirection: desc, first: 100) {
        id
        client
        title
        milestoneCount
        milestones {
          id
          index
          freelancer
          title
          amount
          status
        }
      }
      freelancerMilestones: milestones(where: { freelancer: $freelancer }, first: 100) {
        job {
          id
          client
          title
          milestoneCount
          milestones {
            id
            index
            freelancer
            title
            amount
            status
          }
        }
      }
    }
  `;

  const data = await querySubgraph<{
    clientJobs: SubgraphJob[];
    freelancerMilestones: { job: SubgraphJob }[];
  }>(query, { client: normalizedAddress, freelancer: normalizedAddress });

  if (!data) return null;

  // Merge client jobs + jobs where they are a freelancer, deduplicating by id
  const seen = new Set<string>();
  const allJobs: SubgraphJob[] = [];

  for (const job of data.clientJobs ?? []) {
    if (!seen.has(job.id)) { seen.add(job.id); allJobs.push(job); }
  }
  for (const { job } of data.freelancerMilestones ?? []) {
    if (job && !seen.has(job.id)) { seen.add(job.id); allJobs.push(job); }
  }

  return allJobs;
}

/**
 * Fetch a single job by its on-chain jobId.
 * Returns null if the subgraph is unavailable (triggers Supabase fallback).
 */
export async function fetchJobById(jobId: string): Promise<SubgraphJob | null> {
  const query = `
    query JobById($id: ID!) {
      job(id: $id) {
        id
        client
        title
        milestoneCount
        milestones {
          id
          index
          freelancer
          title
          amount
          status
        }
      }
    }
  `;

  const data = await querySubgraph<{ job: SubgraphJob | null }>(query, { id: jobId });
  return data?.job ?? null;
}

/**
 * Convert a subgraph job to the shape the frontend expects (matching jobs_meta schema).
 */
export function subgraphJobToMeta(job: SubgraphJob) {
  // Collect unique freelancer addresses from milestones
  const freelancerAddresses = [...new Set(job.milestones.map((m) => m.freelancer))];
  return {
    chain_job_id: job.id,
    title: job.title,
    description: "", // not indexed on-chain, supplement from Supabase if needed
    client_address: job.client,
    freelancer_address: freelancerAddresses.join(","),
    created_at: null,
    freelancer_status: "accepted",
    milestones: job.milestones,
  };
}
