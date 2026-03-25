// Type declarations for MetaMask / EIP-1193 browser wallets
interface RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: RequestArguments) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
