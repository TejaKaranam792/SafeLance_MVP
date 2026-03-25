const { ethers } = require("hardhat");

async function check() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance));
  
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("Nonce:", nonce);
  
  // If nonce > 0, it means a previous transaction mined!
  if (nonce > 0) {
    console.log("A transaction has already been mined for this account!");
  }
}

check().catch(console.error);
