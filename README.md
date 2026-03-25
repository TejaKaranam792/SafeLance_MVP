<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/shield.svg" alt="SafeLance Shield" width="80" />
  <h1>SafeLance</h1>
  <p><strong>Work Without Trust Issues. Get Paid Securely.</strong></p>
  <p>A Web3 freelance marketplace powering trustless engagements through smart contract escrow, milestone-based payouts, and gasless meta-transactions.</p>
</div>

---

## 🛑 The Trust Problem in Freelancing
The global freelance economy is booming, yet both freelancers and clients suffer from severe trust deficits:
- **Clients** fear paying upfront for incomplete or subpar work.
- **Freelancers** risk not getting paid after delivering their services.
- **Middlemen** (traditional platforms) charge exorbitant fees (10-20%) just to mediate disputes and hold funds.

## ✨ The SafeLance Solution
SafeLance removes the need for blind trust and centralized middlemen by leveraging blockchain technology:
- **Smart Contract Escrow:** Funds are locked securely on-chain when a job starts. They are only released when both parties agree the milestone is met.
- **Gasless Meta-Transactions:** Utilizing relay networks, SafeLance subsidizes gas fees for seamless interactions. Users simply sign messages off-chain; the protocol handles the rest. This drastically lowers the barrier to entry for non-crypto natives.
- **Milestone-Based Payments:** Break large projects into manageable chunks. Funds are committed and released progressively, keeping both sides aligned.
- **Decentralized Reputation (Future):** Immutable work history tied to wallet addresses.

## 🚀 Key Features
1. **Multi-Milestone Jobs (`MilestoneEscrow.sol`):** Create complex, long-term engagements with dedicated funding and approval cycles.
2. **Zero-Gas UX (`api/relay`):** Integrated Ethers.js relayers execute transactions on behalf of the user. No need to hold ETH to interact with the platform.
3. **Intuitive Next.js Interface:** Premium consumer-style UI built with Tailwind CSS, abstracting away the complexity of Web3.
4. **Instant Disputes & Refunds:** Handled deterministically by the smart contract rules.

## 🛠️ Technical Architecture
SafeLance is built to be fast, scalable, and decentralized:
- **Frontend / Client:** Next.js (App Router), React 18, TailwindCSS, Lucide Icons.
- **Smart Contracts:** Solidity (Deployed on Ethereum Sepolia Testnet).
- **Web3 Interaction:** Ethers.js (v6).
- **Backend / Relayer:** Next.js API Routes (Serverless) handling meta-transactions and blockchain relaying.
- **Database:** Supabase for fast, relational off-chain metadata (user profiles, job listings).

---

## 🏆 Grant Proposal Context & Impact
SafeLance aligns with initiatives funding the **financialization of work, Web3 adoption, and real-world utility of smart contracts**. 

**Why Fund SafeLance?**
- **Real-World Utility:** Solves a multi-billion dollar friction point (freelance payment disputes) using blockchain primitives.
- **Mass Adoption UX:** The gasless relayer design proves that Web3 applications can have Web2-level UX.
- **Open Source Infrastructure:** The `MilestoneEscrow` smart contracts serve as a public good for other gig economy protocols.
- **Scalability:** Built on Next.js, ready to be scaled to Layer 2s (Optimism, Arbitrum, Base) for even lower execution costs.

Funds from the grant will be directly utilized to:
1. Audit the `MilestoneEscrow.sol` smart contracts.
2. Deploy the protocol to production on a low-code Layer 2 Rollup.
3. Expand the decentralized dispute resolution mechanism (e.g., Kleros integration).
4. Subsidize the gas relayer for the first 10,000 users.

---

## 💻 Getting Started

### Prerequisites
- Node.js (v20+)
- MetaMask (or any Web3 Wallet) configured for the Sepolia Testnet
- Supabase Project (for backend metadata)

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/safelance.git
   cd safelance
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file and add the required keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_sepolia_contract_address
   RELAYER_PRIVATE_KEY=your_relayer_wallet_private_key
   RPC_URL=your_sepolia_rpc_url
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to view the application.

---

## 📄 License
SafeLance is open-sourced software licensed under the **MIT License**.

<div align="center">
  <p>Built with ❤️ for a fairer future of work.</p>
</div>
