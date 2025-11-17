import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
  appName: 'X402 Manifold NFT Playground',
  projectId: 'c9c0e82d0f8e0e8e0f8e0e8e0f8e0e8e', // Replace with your project ID from https://cloud.walletconnect.com
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});