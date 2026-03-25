"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ethers } from "ethers";
import { CHAIN_ID, CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL } from "@/lib/contract";

interface WalletState {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  getNonce: () => Promise<bigint>;
  switchNetwork: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletState>({
  account: null,
  provider: null,
  chainId: null,
  isConnecting: false,
  error: null,
  connectWallet: async () => {},
  getNonce: async () => 0n,
  switchNetwork: async () => {},
  disconnectWallet: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed. Please install it from metamask.io");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();
      const network = await web3Provider.getNetwork();

      setProvider(web3Provider);
      setAccount(address);
      setChainId(Number(network.chainId));
      localStorage.removeItem("walletDisconnected");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to connect wallet"
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    localStorage.setItem("walletDisconnected", "true");
  }, []);

  // Rehydrate from existing MetaMask connection
  useEffect(() => {
    const eth = window.ethereum;
    if (typeof window === "undefined" || !eth) return;
    const autoConnect = async () => {
      if (localStorage.getItem("walletDisconnected") === "true") return;
      try {
        const accounts = await eth.request({
          method: "eth_accounts",
        }) as string[];
        if (accounts.length > 0) await connectWallet();
      } catch {
        // silently ignore
      }
    };
    autoConnect();
  }, [connectWallet]);

  // Listen for account / chain changes
  useEffect(() => {
    const eth = window.ethereum;
    if (typeof window === "undefined" || !eth) return;
    const handleAccountsChanged = (accountsObj: unknown) => {
      const accounts = accountsObj as string[];
      setAccount(accounts[0] ?? null);
      if (!accounts[0]) setProvider(null);
    };
    const handleChainChanged = () => window.location.reload();

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);
    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x" + CHAIN_ID.toString(16),
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add the correct network.");
        }
      } else {
        throw new Error("Failed to switch network.");
      }
    }
  }, []);

  const getNonce = useCallback(async (): Promise<bigint> => {
    if (!account || !provider) throw new Error("Wallet not connected");
    if (chainId !== CHAIN_ID) {
      try {
        await switchNetwork();
        // Return 0n as a placeholder; the page will refresh on chain switch anyway
        return 0n;
      } catch (err) {
        throw new Error("Wrong network! Please switch your MetaMask to Sepolia to continue.");
      }
    }
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );
    return await contract.getNonce(account);
  }, [account, provider, chainId, switchNetwork]);

  return (
    <WalletContext.Provider
      value={{ account, provider, chainId, isConnecting, error, connectWallet, getNonce, switchNetwork, disconnectWallet }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
