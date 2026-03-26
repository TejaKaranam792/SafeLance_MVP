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
    bio TEXT,                      -- short freelancer bio
    avatar_url TEXT,               -- profile picture URL
    github_url TEXT,               -- GitHub profile link
    twitter_url TEXT,              -- Twitter/X profile link
    verified_badge BOOLEAN DEFAULT false,  -- true when >=3 milestones completed on-chain
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
    freelancer_status TEXT,                 -- JSON string: { freelancer_address: 'accepted'|'rejected'|'pending' }
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
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

-- ─── Ratings ──────────────────────────────────────────────────────────────────
-- Off-chain mirror of on-chain ratings for fast reads + comment storage.
-- On-chain ReputationRegistry is the authoritative score source.
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    freelancer_address TEXT NOT NULL,
    client_address TEXT NOT NULL,
    chain_job_id TEXT NOT NULL,
    milestone_index INTEGER NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment TEXT,                   -- optional review text
    eth_amount TEXT NOT NULL,       -- wei as string (safe bigint handling)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(chain_job_id, milestone_index)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_milestones_job_id ON milestones(chain_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_meta_client  ON jobs_meta(client_address);
CREATE INDEX IF NOT EXISTS idx_jobs_meta_freelancer ON jobs_meta(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_ratings_freelancer ON ratings(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_ratings_client ON ratings(client_address);

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

-- ─── Disputes ─────────────────────────────────────────────────────────────────
-- Off-chain record of each dispute, evidence, and admin ruling.
-- On-chain MilestoneEscrow.adminResolveMilestone() is the authoritative settlement.
CREATE TABLE IF NOT EXISTS disputes (
    id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_job_id            TEXT NOT NULL,
    milestone_index         INTEGER NOT NULL,
    client_address          TEXT NOT NULL,
    freelancer_address      TEXT NOT NULL,

    -- Evidence submitted by each party
    client_statement        TEXT,
    client_evidence_url     TEXT,          -- uploaded file URL (Supabase Storage)
    freelancer_statement    TEXT,
    freelancer_evidence_url TEXT,

    -- Lifecycle
    -- 'open' | 'client_submitted' | 'freelancer_submitted'
    -- | 'evidence_complete' | 'resolved_freelancer' | 'resolved_client'
    status                  TEXT NOT NULL DEFAULT 'open',

    -- Admin ruling
    admin_notes             TEXT,
    resolved_at             TIMESTAMP WITH TIME ZONE,

    created_at              TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

    UNIQUE(chain_job_id, milestone_index)
);

-- ─── Workspace Messages ────────────────────────────────────────────────────────
-- Real-time chat messages between client and assigned freelancers.
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_job_id TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(chain_job_id);

CREATE INDEX IF NOT EXISTS idx_disputes_status      ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_client      ON disputes(client_address);
CREATE INDEX IF NOT EXISTS idx_disputes_freelancer  ON disputes(freelancer_address);
CREATE INDEX IF NOT EXISTS idx_disputes_job         ON disputes(chain_job_id);

-- ─── User Roles (Admin / Client / Freelancer) ─────────────────────────────────
-- Maps an email or wallet address to a specific platform role.
-- Crucial for Admin Dashboard authorization.
CREATE TABLE IF NOT EXISTS user_roles (
    identifier TEXT PRIMARY KEY,    -- email address or wallet address
    role TEXT NOT NULL DEFAULT 'user', -- 'admin', 'freelancer', 'client'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Seed the initial admin account
INSERT INTO user_roles (identifier, role) 
VALUES ('admin@safelance.io', 'admin') -- CHANGED FROM HARDCODED! Create this user in Supabase Auth as well.
ON CONFLICT (identifier) DO NOTHING;
