import "@nomicfoundation/hardhat-ethers";
import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Deploying Upgradeable Contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("\n[1/2] Deploying MilestoneEscrow Proxy (UUPS)...");
  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
  
  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  console.log("Admin address:", adminAddress);

  // Deploy proxy and initialize
  const milestoneProxy = await upgrades.deployProxy(
    MilestoneEscrow,
    [ethers.ZeroAddress, adminAddress], // init arguments: _reputationRegistry, _admin
    { kind: "uups", unsafeAllow: ["constructor"] }
  );
  await milestoneProxy.waitForDeployment();
  const milestoneAddress = await milestoneProxy.getAddress();
  console.log("MilestoneEscrow Proxy deployed to:", milestoneAddress);

  fs.writeFileSync(
    path.join(outDir, "MilestoneEscrowProxy.json"),
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

  // Deploy Registry
  console.log("\n[2/2] Deploying ReputationRegistry...");
  const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
  const registry = await ReputationRegistry.deploy(milestoneAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ReputationRegistry deployed to:", registryAddress);

  console.log("\n✅ Proxy Deployment Complete.");
  console.log("\n⚠️ Update your .env.local:");
  console.log(`NEXT_PUBLIC_MILESTONE_CONTRACT_ADDRESS=${milestoneAddress}`);
  console.log(`NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${registryAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
