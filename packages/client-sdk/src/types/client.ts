import type { Product } from './product';
import type { IPublicProvider } from './account-adapter';

/**
 * Configuration options for initializing the Manifold SDK client.
 *
 * @public
 */
export interface ClientConfig {
  /**
   * Public provider for read-only blockchain interactions.
   * Required for fetching balances, estimating gas, and reading contracts.
   *
   * @example
   * ```typescript
   * // Using Ethers v5
   * import { createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
   * const provider = new ethers.providers.JsonRpcProvider('...');
   * const publicProvider = createPublicProviderEthers5({ 1: provider });
   *
   * // Using Viem
   * import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
   * const publicClient = createPublicClient({ ... });
   * const publicProvider = createPublicProviderViem({ 1: publicClient });
   *
   * const client = createClient({ publicProvider });
   * ```
   */
  publicProvider: IPublicProvider;

  /**
   * Base URL for Manifold public API calls.
   *
   * @defaultValue 'https://apps.api.manifoldxyz.dev'
   */
  apiBaseUrl?: string;

  /**
   * Enable debug logging for SDK operations.
   * Useful for troubleshooting and development.
   *
   * @defaultValue false
   */
  debug?: boolean;

  /**
   * Environment configuration (e.g., 'production', 'staging').
   *
   * @internal
   */
  environment?: string;
}

/**
 * Main interface for the Manifold SDK client.
 *
 * Provides methods to interact with Manifold products, including
 * fetching product data, checking eligibility, and executing purchases.
 *
 * @public
 */
export interface ManifoldClient {
  /**
   * Fetches detailed product information from Manifold.
   *
   * @param instanceIdOrUrl - Either a Manifold instance ID or a full Manifold product URL
   * @returns A Promise resolving to a Product object
   *
   * @see {@link Product} for the returned product structure
   */
  getProduct(instanceIdOrUrl: string): Promise<Product>;
}
