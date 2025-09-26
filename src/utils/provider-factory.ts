import * as ethers from 'ethers';
import { ManifoldBridgeProvider } from '@manifoldxyz/manifold-provider-client';
import type { NetworkId } from '../types/common';
import { getNetworkConfig } from '../config/networks';

/**
 * Provider factory for dual-provider architecture
 * Based on CONTRACT_PATTERNS.md dual-provider implementation
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface ProviderFactoryOptions {
  networkId: NetworkId;
  customRpcUrls?: Record<NetworkId, string>;
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Create dual provider instance with primary and bridge providers
 */
export function createProvider(options: ProviderFactoryOptions): ethers.providers.JsonRpcProvider {
  const { networkId, customRpcUrls } = options;

  // Create bridge provider using ManifoldBridgeProvider
  const bridge = new ManifoldBridgeProvider(networkId);

  // Create primary provider from custom RPC URLs if available
  const primary = createPrimaryProvider(networkId, customRpcUrls);

  return primary || bridge; // fallback to bridge if primary is not available
}

// =============================================================================
// PROVIDER CREATION FUNCTIONS
// =============================================================================

/**
 * Create primary provider from custom RPC URLs
 */
function createPrimaryProvider(
  networkId: NetworkId,
  customRpcUrls?: Record<NetworkId, string>,
): ethers.providers.JsonRpcProvider | null {
  try {
    // Create JSON-RPC provider from custom URLs if available
    if (customRpcUrls?.[networkId]) {
      const networkConfig = getNetworkConfig(networkId);
      return new ethers.providers.JsonRpcProvider(customRpcUrls[networkId], {
        name: networkConfig.name,
        chainId: networkConfig.chainId,
      });
    }

    return null;
  } catch (error) {
    return null;
  }
}
