/**
 * Manifold Provider Client integration for @manifoldxyz/manifold-provider-client
 * Provides RPC fallback functionality for blockchain calls
 */

import { ManifoldBridgeProvider } from '@manifoldxyz/manifold-provider-client';
import type { NetworkId } from '../types/common';
import { ClientSDKError, ErrorCode } from '../types/errors';

export interface ManifoldProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

/**
 * Wrapper for ManifoldBridgeProvider to match our interface patterns
 * Following patterns from gachapon-widgets claimExtensionContract.ts
 */
export class ManifoldProvider {
  private bridgeProvider: ManifoldBridgeProvider;
  private readonly config: ManifoldProviderConfig;

  constructor(networkId: NetworkId, config: ManifoldProviderConfig = {}) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config,
    };

    try {
      // Initialize the ManifoldBridgeProvider with the network ID
      this.bridgeProvider = new ManifoldBridgeProvider(networkId);
    } catch (error) {
      throw new ClientSDKError(
        ErrorCode.NETWORK_ERROR,
        `Failed to initialize ManifoldBridgeProvider for network ${networkId}: ${(error as Error).message}`,
        { networkId, originalError: (error as Error).message }
      );
    }
  }

  /**
   * Get the underlying ManifoldBridgeProvider instance
   * This matches the pattern used in gachapon-widgets
   */
  getBridgeProvider(): ManifoldBridgeProvider {
    return this.bridgeProvider;
  }

  /**
   * Make an RPC request through the bridge provider
   * This provides a simple interface that matches our SDK patterns
   */
  async request(method: string, params: any[]): Promise<unknown> {
    if (!method || typeof method !== 'string') {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'RPC method is required and must be a string'
      );
    }

    if (!Array.isArray(params)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'RPC params must be an array'
      );
    }

    const provider = this.bridgeProvider as { request?: (payload: { method: string; params: unknown[] }) => Promise<unknown> };

    if (typeof provider.request !== 'function') {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Bridge provider does not support request method'
      );
    }

    const retries = this.config.retries ?? 0;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestPromise = provider.request({ method, params });
        const timeout = this.config.timeout ?? 0;

        return timeout > 0
          ? await this._withTimeout(requestPromise, timeout)
          : await requestPromise;
      } catch (error) {
        lastError = error;
        if (attempt === retries) {
          break;
        }
      }
    }

    throw new ClientSDKError(
      ErrorCode.NETWORK_ERROR,
      `RPC request failed for method ${method}: ${(lastError as Error)?.message || 'Unknown error'}`,
      {
        method,
        params,
        attempts: retries + 1,
        originalError: lastError instanceof Error ? lastError : undefined,
      }
    );
  }

  /**
   * Check if the provider is ready to handle requests
   */
  isReady(): boolean {
    return !!this.bridgeProvider;
  }

  /**
   * Get the network ID for this provider
   */
  getNetworkId(): number | null {
    try {
      // The ManifoldBridgeProvider should expose network information
      // This may vary based on the actual API of the package
      return (this.bridgeProvider as any).networkId || null;
    } catch (error) {
      return null;
    }
  }

  private async _withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    if (timeout <= 0) {
      return promise;
    }

    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ClientSDKError(ErrorCode.TIMEOUT, 'Bridge provider request timed out'));
      }, timeout);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

/**
 * Factory function to create ManifoldProvider instances
 * This matches the pattern from gachapon-widgets/src/classes/utils/providers.ts
 */
export function createManifoldProvider(
  networkId: NetworkId, 
  config: ManifoldProviderConfig = {}
): ManifoldProvider {
  return new ManifoldProvider(networkId, config);
}

/**
 * Create a ManifoldBridgeProvider directly (for legacy compatibility)
 */
export function createManifoldBridgeProvider(networkId: NetworkId): ManifoldBridgeProvider {
  return new ManifoldBridgeProvider(networkId);
}

// Re-export the bridge provider for direct use
export { ManifoldBridgeProvider };

export default ManifoldProvider;
