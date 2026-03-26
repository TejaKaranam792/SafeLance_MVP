import { ethers } from "ethers";

/**
 * Encodes calldata + builds + signs a meta-tx hash, then POSTs to /api/relay.
 */
export async function encodeAndRelay({
  contractAddress,
  abi,
  functionName,
  args,
  value = BigInt(0),
  userAddress,
  nonce,
  chainId,
  provider,
}: {
  contractAddress: string;
  abi: any;
  functionName: string;
  args: any[];
  value?: bigint;
  userAddress: string;
  nonce: bigint;
  chainId: number;
  provider: ethers.BrowserProvider;
}): Promise<{ txHash: string }> {
  const iface = new ethers.Interface(abi);

  // 1. Encode the function calldata
  const functionData = iface.encodeFunctionData(functionName, args);

  // 2. Build the hash the user must sign
  //    Must match exactly what our contracts' executeMetaTx expects:
  //    keccak256(abi.encodePacked(from, nonce, functionData, targetAddress, chainId))
  const metaTxHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "bytes", "address", "uint256"],
    [userAddress, nonce, functionData, contractAddress, chainId]
  );

  // 3. Sign via MetaMask (EIP-191 personal_sign)
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(ethers.getBytes(metaTxHash));

  // 4. POST to the relayer API
  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contractAddress, // NEW: Tell relayer which contract to hit
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
