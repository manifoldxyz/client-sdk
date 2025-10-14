import * as ethers from 'ethers';
import { ManifoldBridgeProvider } from '@manifoldxyz/manifold-provider-client';
import { getNetworkConfig } from '../config/networks';
import { ClientSDKError, ErrorCode } from '../types';

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface ProviderFactoryOptions {
  networkId: number;
  customRpcUrls?: Record<number, string>;
  useBridge?: boolean;
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Create dual provider instance with primary and bridge providers as fallback
 */
export function createProvider(options: ProviderFactoryOptions): ethers.providers.JsonRpcProvider {
  const { networkId, customRpcUrls, useBridge = true } = options;

  // Create primary provider from custom RPC URLs if available
  const primary = createPrimaryProvider(networkId, customRpcUrls);
  if (primary) {
    return primary;
  }
  if (!useBridge) {
    throw new ClientSDKError(
      ErrorCode.MISSING_RPC_URL,
      `No RPC URL available for networkId ${networkId}`,
    );
  }
  const bridgeProvider = new ManifoldBridgeProvider(networkId);
  return bridgeProvider; // fallback to bridge if primary is not available
}

// =============================================================================
// PROVIDER CREATION FUNCTIONS
// =============================================================================

/**
 * Create primary provider from custom RPC URLs
 */
function createPrimaryProvider(
  networkId: number,
  customRpcUrls?: Record<number, string>,
): ethers.providers.JsonRpcProvider | null {
  try {
    // Create JSON-RPC provider from custom URLs if available
    if (customRpcUrls?.[networkId]) {
      const networkConfig = getNetworkConfig(networkId);
      return new ethers.providers.JsonRpcProvider(customRpcUrls[networkId], {
        name: networkConfig.chainName,
        chainId: parseInt(networkConfig?.chainId),
      });
    }

    return null;
  } catch (error) {
    console.log('errrr', error);
    return null;
  }
}
