import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ReputationRegistry with account:", deployer.address);

  // ── Step 1: Deploy ReputationRegistry ─────────────────────────────────────
  // Pass the MilestoneEscrow address so only it can call recordRating.
  const milestoneEscrowAddress = process.env.NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS;
  if (!milestoneEscrowAddress) {
    throw new Error("NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS not set in env");
  }

  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const registry = await ReputationRegistry.deploy(milestoneEscrowAddress);
  await registry.waitForDeployment();

  const registryAddress = await registry.getAddress();
  console.log("✅ ReputationRegistry deployed to:", registryAddress);
  console.log("\nNext steps:");
  console.log("  1. Copy the address above");
  console.log(`  2. Set NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${registryAddress} in .env.local`);
  console.log("  3. Re-deploy MilestoneEscrow passing this registry address, OR");
  console.log("     keep the existing MilestoneEscrow and call setReputationRegistry() if added.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
