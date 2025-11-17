import type { PublicClient, Transport, WalletClient } from 'viem';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base, baseSepolia, sepolia, mainnet, optimism } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

export function parseChainName(chainName: string): number {
  const chainMap: Record<string, number> = {
    base: 8453,
    'base-mainnet': 8453,
    'base-sepolia': 84532,
    basesepolia: 84532,
  };

  const chainId = chainMap[chainName.toLowerCase()];
  if (!chainId) {
    throw new Error(
      `Unsupported chain name: ${chainName}. Supported: base, base-mainnet, base-sepolia`,
    );
  }
  return chainId;
}

export function getChainConfig(chainId: number) {
  switch (chainId) {
    case 8453:
      return {
        chain: base,
        rpcUrl: process.env.RPC_URL_BASE || 'https://base-mainnet.infura.io',
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        wethAddress: '0x4200000000000000000000000000000000000006',
      };
    case 84532:
      return {
        chain: baseSepolia,
        rpcUrl: process.env.RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org',
        usdcAddress: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
        wethAddress: '0x4200000000000000000000000000000000000006',
      };
    case 11155111:
      return {
        chain: sepolia,
        rpcUrl: process.env.RPC_URL_SEPOLIA || 'https://sepolia.base.org',
        usdcAddress: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
        wethAddress: '0x4200000000000000000000000000000000000006',
      };
    case 10:
      return {
        chain: optimism,
        rpcUrl: process.env.RPC_URL_OPTIMISM || 'https://optimism.infura.io',
        usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
        wethAddress: '0x4200000000000000000000000000000000000006',
      };
    case 1:
      return {
        chain: mainnet,
        rpcUrl: process.env.RPC_URL_MAINNET || 'https://mainnet.infura.io',
        usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        wethAddress: '0x4200000000000000000000000000000000000006',
      };
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export function getSupportedERC20Tokens(chainId: number): string[] {
  const usdcAddress = getChainConfig(chainId).usdcAddress;
  if (!usdcAddress) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return [usdcAddress.toLowerCase()];
}

export function createPublicClientForChain(chainId: number): PublicClient<Transport> {
  const config = getChainConfig(chainId);
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  }) as PublicClient<Transport>;
}

export function createAdminWalletClient(chainId: number): WalletClient {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ADMIN_WALLET_PRIVATE_KEY is required');
  }

  const config = getChainConfig(chainId);
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}
