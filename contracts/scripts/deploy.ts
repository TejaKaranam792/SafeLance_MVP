import "@nomicfoundation/hardhat-ethers";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("Chain ID:", network.chainId);

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ─── 1. Deploy original FreelanceEscrow (kept for backwards compat) ──────
  console.log("\n[1/3] Deploying FreelanceEscrow...");
  const FreelanceEscrow = await ethers.getContractFactory("FreelanceEscrow");
  const escrow = await FreelanceEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("FreelanceEscrow deployed to:", escrowAddress);

  fs.writeFileSync(
    path.join(outDir, "FreelanceEscrow.json"),
    JSON.stringify(
      {
        address: escrowAddress,
        network: network.name,
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // ─── 2. Deploy MilestoneEscrow (temporarily with zero registry) ──────────
  // We deploy MilestoneEscrow first so we have its address for the registry.
  console.log("\n[2/3] Deploying MilestoneEscrow (placeholder registry)...");
  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
  // Admin defaults to deployer; override with ADMIN_ADDRESS env var.
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("Admin address:", adminAddress);
  // Pass address(0) as registry — we'll update after deploying the registry
  const milestone = await MilestoneEscrow.deploy(ethers.ZeroAddress, adminAddress);
  await milestone.waitForDeployment();
  const milestoneAddress = await milestone.getAddress();
  console.log("MilestoneEscrow deployed to:", milestoneAddress);

  fs.writeFileSync(
    path.join(outDir, "MilestoneEscrow.json"),
    JSON.stringify(
      {
        address: milestoneAddress,
        network: network.name,
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // ─── 3. Deploy ReputationRegistry (trusted caller = MilestoneEscrow) ──────
  console.log("\n[3/3] Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const registry = await ReputationRegistry.deploy(milestoneAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ReputationRegistry deployed to:", registryAddress);

  fs.writeFileSync(
    path.join(outDir, "ReputationRegistry.json"),
    JSON.stringify(
      {
        address: registryAddress,
        trustedEscrow: milestoneAddress,
        network: network.name,
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\n⚠️  Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${escrowAddress}`);
  console.log(`NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS=${milestoneAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${registryAddress}`);
  console.log("\nℹ️  Note: MilestoneEscrow was deployed with address(0) as registry.");
  console.log("   On-chain reputation tracking requires re-deploying MilestoneEscrow");
  console.log("   passing the ReputationRegistry address, OR run deployReputation.ts");
  console.log("   once MilestoneEscrow is already live to get its registry address.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
