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
  console.log("\n[1/2] Deploying FreelanceEscrow...");
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

  // ─── 2. Deploy MilestoneEscrow (new milestone-based payments) ────────────
  console.log("\n[2/2] Deploying MilestoneEscrow...");
  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
  const milestone = await MilestoneEscrow.deploy();
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

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log("\n✅ Both contracts deployed successfully!");
  console.log("\n⚠️  Add these to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${escrowAddress}`);
  console.log(`NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS=${milestoneAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
