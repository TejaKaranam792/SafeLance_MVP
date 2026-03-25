-- SQL Setup for Supabase
-- Paste this into your Supabase SQL Editor and run it.

-- ─── Freelancers (existing) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    eth_address TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    skills TEXT NOT NULL,
    portfolio TEXT,
    hourly_rate NUMERIC(10, 2),   -- USD per hour (e.g. 75.00)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ─── Jobs Metadata ────────────────────────────────────────────────────────────
-- Mirrors on-chain MilestoneEscrow jobs with richer metadata.
-- chain_job_id is the on-chain jobId (stored as text to handle bigints safely).
CREATE TABLE IF NOT EXISTS jobs_meta (
    id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_job_id  TEXT NOT NULL UNIQUE,     -- on-chain jobCount ID
    client_address TEXT NOT NULL,           -- client wallet address
    freelancer_address TEXT NOT NULL,       -- freelancer wallet address
    title         TEXT NOT NULL,
    description   TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ─── Milestones Metadata ──────────────────────────────────────────────────────
-- Per-milestone metadata stored off-chain (title, description, deliverable links).
-- On-chain (MilestoneEscrow) is the source of truth for amounts and status.
CREATE TABLE IF NOT EXISTS milestones (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_job_id    TEXT NOT NULL,          -- references jobs_meta.chain_job_id
    milestone_index INTEGER NOT NULL,       -- 0-based milestone index on-chain
    title           TEXT NOT NULL,
    description     TEXT,
    deliverable_url TEXT,                   -- link submitted by freelancer
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(chain_job_id, milestone_index)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_milestones_job_id ON milestones(chain_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_meta_client  ON jobs_meta(client_address);
CREATE INDEX IF NOT EXISTS idx_jobs_meta_freelancer ON jobs_meta(freelancer_address);

-- ─── Row Level Security (Optional but recommended) ───────────────────────────
-- Uncomment below to enable public reads:
-- ALTER TABLE freelancers  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jobs_meta    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE milestones   ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read" ON freelancers  FOR SELECT USING (true);
-- CREATE POLICY "Public read" ON jobs_meta    FOR SELECT USING (true);
-- CREATE POLICY "Public read" ON milestones   FOR SELECT USING (true);
-- CREATE POLICY "Anyone insert" ON freelancers  FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone insert" ON jobs_meta    FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone insert/update" ON milestones FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Anyone update deliverable" ON milestones FOR UPDATE USING (true);
