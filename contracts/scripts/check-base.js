const { ethers } = require("hardhat");

async function check() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Base Sepolia Balance for", deployer.address, ":", ethers.formatEther(balance), "ETH");
}

check().catch(console.error);
