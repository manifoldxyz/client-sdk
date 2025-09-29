import type { NetworkConfig } from '../types/config';
import type { NetworkId } from '../types/common';

/**
 * Simple network configurations
 */
export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  1: {
    // Ethereum Mainnet
    networkId: 1,
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
  },
  137: {
    // Polygon
    networkId: 137,
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: 'MATIC',
    rpcUrl: 'https://polygon.llamarpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  10: {
    // Optimism
    networkId: 10,
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://optimism.llamarpc.com',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  42161: {
    // Arbitrum
    networkId: 42161,
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://arbitrum.llamarpc.com',
    explorerUrl: 'https://arbiscan.io',
  },
  8453: {
    // Base
    networkId: 8453,
    chainId: 8453,
    name: 'Base',
    nativeCurrency: 'ETH',
    rpcUrl: 'https://base.llamarpc.com',
    explorerUrl: 'https://basescan.org',
  },
};

/**
 * Get network configuration by ID
 */
export function getNetworkConfig(networkId: NetworkId): NetworkConfig | undefined {
  return NETWORK_CONFIGS[networkId];
}

/**
 * Get supported network IDs
 */
export function getSupportedNetworks(): NetworkId[] {
  return Object.keys(NETWORK_CONFIGS).map((id) => parseInt(id));
}

/**
 * Check if network is supported
 */
export function isNetworkSupported(networkId: NetworkId): boolean {
  return networkId in NETWORK_CONFIGS;
}
