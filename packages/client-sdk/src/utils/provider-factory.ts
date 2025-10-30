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
export async function createProvider(
  options: ProviderFactoryOptions,
): Promise<ethers.providers.JsonRpcProvider> {
  const { networkId, customRpcUrls, useBridge = true } = options;

  // Create primary provider from custom RPC URLs if available
  const primary = createPrimaryProvider(networkId, customRpcUrls);
  if (primary) {
    const isHealthy = await isProviderHealthy(primary);
    if (isHealthy) {
      return primary;
    }
  }
  if (!useBridge) {
    throw new ClientSDKError(
      ErrorCode.MISSING_RPC_URL,
      `Unable to obtain valid RPC URL for networkId ${networkId}`,
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
    return null;
  }
}

/**
 * Perform a lightweight health check to ensure the provider responds
 */
async function isProviderHealthy(provider: ethers.providers.JsonRpcProvider): Promise<boolean> {
  try {
    await provider.getBlockNumber();
    return true;
  } catch (error) {
    console.warn('Primary RPC health check failed:', (error as Error).message);
    return false;
  }
}
