import { Network } from '@manifoldxyz/js-ts-utils';

/**
 * Get network configuration by ID
 */
export function getNetworkConfig(networkId: number): Network.NetworkConfig {
  return Network.NETWORK_CONFIGS[networkId as Network.NetworkId];
}
