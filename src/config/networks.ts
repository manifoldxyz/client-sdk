import type { NetworkConfig } from '../types/config';
import type { NetworkId } from '../types/common';
import { Network } from '@manifoldxyz/js-ts-utils';

/**
 * Network configurations from @manifoldxyz/js-ts-utils
 * Maps NetworkId to NetworkConfig, converting from the package's format
 */
export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = Object.entries(
  Network.NETWORK_CONFIGS,
).reduce(
  (acc, [networkId, config]) => {
    const id = parseInt(networkId);
    acc[id] = {
      networkId: id,
      chainId: id,
      name: config.chainName,
      nativeCurrency: config.nativeCurrency.symbol,
      rpcUrl: config.rpcUrls[0] || `https://eth.llamarpc.com`,
      explorerUrl: config.blockExplorerUrls[0] || 'https://etherscan.io',
    };
    return acc;
  },
  {} as Record<NetworkId, NetworkConfig>,
);

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
