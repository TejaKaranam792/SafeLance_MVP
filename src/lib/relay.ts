import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./contract";

/**
 * Encodes calldata + builds + signs a meta-tx hash, then POSTs to /api/relay.
 *
 * @param functionName   Contract function name (must match ABI)
 * @param args           Arguments for the function
 * @param value          ETH value in wei (for fundJob)
 * @param userAddress    Connected wallet address
 * @param nonce          Current nonce for this user (fetch from contract.getNonce)
 * @param chainId        Chain ID for replay protection
 * @param provider       BrowserProvider from MetaMask
 */
export async function encodeAndRelay({
  functionName,
  args,
  value = BigInt(0),
  userAddress,
  nonce,
  chainId,
  provider,
}: {
  functionName: string;
  args: unknown[];
  value?: bigint;
  userAddress: string;
  nonce: bigint;
  chainId: number;
  provider: ethers.BrowserProvider;
}): Promise<{ txHash: string }> {
  const iface = new ethers.Interface(CONTRACT_ABI);

  // 1. Encode the function calldata
  const functionData = iface.encodeFunctionData(functionName, args);

  // 2. Build the hash the user must sign
  //    Must match exactly what FreelanceEscrow.executeMetaTx expects:
  //    keccak256(abi.encodePacked(from, nonce, functionData, address(this), chainId))
  const metaTxHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes", "address", "uint256"],
    [userAddress, nonce, functionData, CONTRACT_ADDRESS, chainId]
  );

  // 3. Sign via MetaMask (EIP-191 personal_sign)
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(ethers.getBytes(metaTxHash));

  // 4. POST to the relayer API
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      functionData,
      signature,
      userAddress,
      value: value.toString(),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Relay failed");

  return { txHash: data.txHash };
}
