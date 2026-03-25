// Contract ABIs for SafeLance
// FreelanceEscrow = original single-payment contract (kept for backwards compat)
// MilestoneEscrow = new contract with milestone-based payments

// ─── Original FreelanceEscrow ───────────────────────────────────────────────
export const CONTRACT_ABI = [
  // View
  "function jobCount() view returns (uint256)",
  "function getJob(uint256 jobId) view returns (address client, address freelancer, uint256 amount, uint8 status, string description, uint256 createdAt)",
  "function getNonce(address user) view returns (uint256)",
  // Write
  "function createJob(address freelancer, string description) returns (uint256 jobId)",
  "function fundJob(uint256 jobId) payable",
  "function releasePayment(uint256 jobId)",
  "function refund(uint256 jobId)",
  "function executeMetaTx(address from, bytes functionData, bytes signature) returns (bytes)",
  // Events
  "event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, string description)",
  "event JobFunded(uint256 indexed jobId, uint256 amount)",
  "event PaymentReleased(uint256 indexed jobId, address indexed freelancer, uint256 amount)",
  "event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)",
  "event MetaTxExecuted(address indexed from, uint256 nonce, bool success)",
] as const;

// ─── MilestoneEscrow ABI ─────────────────────────────────────────────────────
export const MILESTONE_ABI = [
  // View
  "function jobCount() view returns (uint256)",
  "function getNonce(address user) view returns (uint256)",
  "function getJob(uint256 jobId) view returns (address client, string title, string description, uint256 totalFunded, uint256 createdAt, uint8 milestoneCount)",
  "function getMilestone(uint256 jobId, uint8 milestoneIndex) view returns (address freelancer, string title, uint256 amount, uint8 status, uint256 fundedAt, uint256 releasedAt)",
  // Write
  "function createJobWithMilestones(string title, string description, string[] milestoneTitles, uint256[] milestoneAmounts, address[] freelancerAddresses) returns (uint256 jobId)",
  "function fundMilestone(uint256 jobId, uint8 milestoneIndex) payable",
  "function submitMilestone(uint256 jobId, uint8 milestoneIndex)",
  "function approveMilestone(uint256 jobId, uint8 milestoneIndex)",
  "function disputeMilestone(uint256 jobId, uint8 milestoneIndex)",
  "function refundMilestone(uint256 jobId, uint8 milestoneIndex)",
  "function executeMetaTx(address from, bytes functionData, bytes signature) returns (bytes)",
  // Events
  "event JobCreated(uint256 indexed jobId, address indexed client, string title, uint8 milestoneCount)",
  "event MilestoneAdded(uint256 indexed jobId, uint8 indexed milestoneIndex, address indexed freelancer, string title, uint256 amount)",
  "event MilestoneFunded(uint256 indexed jobId, uint8 indexed milestoneIndex, uint256 amount)",
  "event MilestoneSubmitted(uint256 indexed jobId, uint8 indexed milestoneIndex)",
  "event MilestoneApproved(uint256 indexed jobId, uint8 indexed milestoneIndex, address indexed freelancer, uint256 amount)",
  "event MilestoneDisputed(uint256 indexed jobId, uint8 indexed milestoneIndex)",
  "event MilestoneRefunded(uint256 indexed jobId, uint8 indexed milestoneIndex, address indexed client, uint256 amount)",
  "event MetaTxExecuted(address indexed from, uint256 nonce, bool success)",
] as const;

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const MILESTONE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS ?? "";

export const CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111"
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

// Status enum mirrors (matches Solidity MilestoneStatus)
export const MILESTONE_STATUS = {
  0: "Pending",
  1: "Funded",
  2: "Submitted",
  3: "Approved",
  4: "Disputed",
  5: "Refunded",
} as const;

export type MilestoneStatusKey = keyof typeof MILESTONE_STATUS;
