const { ethers } = require("ethers");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env.local") });

async function check() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");
  const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
  const balance = await provider.getBalance(wallet.address);
  console.log("Base Sepolia Balance for", wallet.address, ":", ethers.formatEther(balance), "ETH");
}

check().catch(console.error);
