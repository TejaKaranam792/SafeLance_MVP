<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg" alt="SafeLance Shield" width="80" />
  <h1>SafeLance</h1>
  <p><strong>Work Without Trust Issues. Get Paid Securely.</strong></p>
  <p>A Web3 freelance marketplace powering trustless engagements through smart contract escrow, milestone-based payouts, on-chain reputation, and an admin control panel.</p>

  ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
  ![Solidity](https://img.shields.io/badge/Solidity-0.8-blue?logo=ethereum)
  ![Supabase](https://img.shields.io/badge/Supabase-green?logo=supabase)
  ![License: MIT](https://img.shields.io/badge/License-MIT-yellow)
</div>

---

## 🛑 The Problem

The global freelance economy suffers from severe trust deficits:
- **Clients** fear paying upfront for incomplete or subpar work.
- **Freelancers** risk not getting paid after delivering their services.
- **Middlemen** charge 10–20% just to mediate disputes and hold funds.

## ✨ The SafeLance Solution

SafeLance removes blind trust and centralized middlemen using blockchain:

| Feature | How it works |
|---|---|
| **Smart Contract Escrow** | Funds locked on-chain, released only on mutual approval |
| **Milestone Payments** | Projects split into verifiable chunks with per-milestone funding |
| **Gasless Meta-Transactions** | Users sign off-chain; the relay network pays gas fees |
| **On-Chain Reputation** | `ReputationRegistry` contract records verified star ratings |
| **Private Chat** | Real-time client ↔ freelancer messaging on job acceptance |
| **Dispute System** | Evidence submission flow; admin resolves via smart contract call |
| **Admin Dashboard** | Full control panel with platform stats, user management & dispute resolution |

---

## 🚀 Feature Overview

### For Clients
- Post jobs with multiple milestones and funding amounts
- Accept/reject freelancer applications
- Approve milestone deliverables and release escrow funds
- Rate freelancers on-chain after completion
- Open disputes with evidence upload

### For Freelancers
- Register a profile (name, skills, portfolio, hourly rate, GitHub)
- Browse job listings and apply
- Submit deliverable URLs per milestone
- Private chat with the client after acceptance
- View on-chain reputation score and badge

### Admin Panel (`/auth` → admin credentials)
- **Stats Dashboard** — freelancers, clients, jobs, milestones, open/resolved disputes, reviews
- **Jobs Table** — full list with chain IDs and wallet addresses
- **Freelancers Table** — registered profiles with contact and wallet info
- **Disputes Table** — status badges, evidence links, resolve action
- Separate session (`sessionStorage`), no Supabase auth required

---

## 🛠️ Technical Architecture

```
SafeLance/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Landing page
│   │   ├── (main)/             # Authenticated app shell (AppNavbar)
│   │   │   ├── app/            # User home / job feed
│   │   │   ├── dashboard/      # Client & freelancer dashboard
│   │   │   ├── jobs/[jobId]/   # Job detail, milestones, chat
│   │   │   ├── freelancers/    # Freelancer directory
│   │   │   └── admin/          # Admin disputes (existing)
│   │   ├── admin/              # Standalone admin section (no navbar)
│   │   │   ├── page.tsx        # Admin login (also accessible via /auth)
│   │   │   └── dashboard/      # Admin control panel
│   │   ├── auth/               # User auth + admin shortcut
│   │   └── api/                # API routes
│   │       ├── admin/stats/    # Aggregated platform stats
│   │       ├── relay/          # Gasless meta-transaction relayer
│   │       ├── jobs/           # Job CRUD
│   │       ├── freelancers/    # Freelancer profile API
│   │       ├── disputes/       # Dispute lifecycle
│   │       ├── messages/       # Private chat
│   │       ├── ratings/        # On-chain rating mirror
│   │       └── notifications/  # Notification badges
│   ├── components/             # Shared UI components
│   └── lib/                    # Supabase client, contract ABI, relay
├── contracts/
│   ├── MilestoneEscrow.sol     # Core escrow contract
│   └── ReputationRegistry.sol  # On-chain star ratings
└── supabase_setup.sql          # Full DB schema
```

**Stack:**
- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, Lucide Icons
- **Smart Contracts:** Solidity 0.8 on Ethereum Sepolia Testnet
- **Web3:** Ethers.js v6, MetaMask wallet auth
- **Database:** Supabase (PostgreSQL) — off-chain metadata
- **Relayer:** Next.js serverless API routes (gasless UX)

---

## 💻 Getting Started

### Prerequisites
- Node.js v20+
- MetaMask configured for **Sepolia Testnet**
- A [Supabase](https://supabase.com) project

### Installation

```bash
# 1. Clone
git clone https://github.com/your-username/safelance.git
cd safelance

# 2. Install
npm install

# 3. Environment — create .env.local
cp .env.example .env.local   # then fill in values
```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin stats API) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed `MilestoneEscrow` address |
| `NEXT_PUBLIC_REPUTATION_ADDRESS` | Deployed `ReputationRegistry` address |
| `RELAYER_PRIVATE_KEY` | Relayer wallet private key |
| `RPC_URL` | Sepolia RPC endpoint (e.g. Alchemy/Infura) |

### Database Setup

Run [`supabase_setup.sql`](./supabase_setup.sql) in your Supabase SQL editor to create all tables (`freelancers`, `jobs_meta`, `milestones`, `ratings`, `disputes`).

### Run

```bash
npm run dev
# → http://localhost:3000
```

### Admin Access

Navigate to `/auth` and log in with:
```
Email:    admin@admin.com
Password: teja1432teja@2005
```
This bypasses Supabase auth and redirects to `/admin/dashboard`.

---

## 🏆 Grant Context

SafeLance demonstrates **real-world utility of smart contracts** for the gig economy:
- Solves multi-billion dollar freelance payment friction
- Gasless UX proves Web3 can match Web2 accessibility
- `MilestoneEscrow` and `ReputationRegistry` are public-good primitives
- Ready to deploy on L2s (Optimism, Arbitrum, Base)

**Grant fund usage:**
1. Smart contract security audit
2. Mainnet / L2 deployment
3. Kleros integration for decentralized dispute resolution
4. Gas relayer subsidy for first 10,000 users

---

## 📄 License

MIT — see [LICENSE](./LICENSE)

<div align="center">
  <p>Built with ❤️ for a fairer future of work.</p>
</div>


