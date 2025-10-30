import type { HttpRPCs } from './common';
import type { Product } from './product';

/**
 * Configuration options for initializing the Manifold SDK client.
 *
 * @public
 */
export interface ClientConfig {
  /**
   * Custom RPC endpoints for blockchain interactions.
   * Map of network ID to RPC URL string.
   *
   * @remarks
   * Required for transaction execution. Each network you want to support
   * must have a corresponding RPC endpoint.
   *
   * @example
   * ```typescript
   * {
   *   1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
   *   8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
   * }
   * ```
   */
  httpRPCs?: HttpRPCs;

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
  httpRPCs: HttpRPCs;

  /**
   * Fetches detailed product information from Manifold.
   *
   * @param instanceIdOrUrl - Either a Manifold instance ID or a full Manifold product URL
   * @returns A Promise resolving to a Product object
   *
   * @see {@link Product} for the returned product structure
   */
  getProduct(instanceIdOrUrl: string): Promise<Product>;

  /**
   * Fetches products from a specific Manifold workspace.
   *
   * @param workspaceId - The workspace identifier
   * @param options - Optional filtering and pagination parameters
   * @returns A Promise resolving to an array of Product objects
   *
   * @see {@link WorkspaceProductsOptions} for available options
   */
  getProductsByWorkspace(
    workspaceId: string,
    options?: WorkspaceProductsOptions,
  ): Promise<Product[]>;
}

/**
 * Options for filtering and paginating workspace products.
 *
 * @public
 */
export interface WorkspaceProductsOptions {
  /**
   * Maximum number of products to return.
   *
   * @remarks
   * Must be between 1 and 100.
   *
   * @defaultValue 50
   */
  limit?: number;

  /**
   * Number of products to skip for pagination.
   *
   * @defaultValue 0
   */
  offset?: number;

  /**
   * Sort order for products.
   * - 'latest': Most recently created first
   * - 'oldest': Oldest created first
   *
   * @defaultValue 'latest'
   */
  sort?: 'latest' | 'oldest';

  /**
   * Filter products by blockchain network ID.
   *
   * Common network IDs:
   * - 1: Ethereum Mainnet
   * - 8453: Base
   * - 10: Optimism
   * - 360: Shape
   * - 11155111: Sepolia (testnet)
   */
  networkId?: number;

  /**
   * Filter products by type.
   * - 'edition': Standard NFT editions
   * - 'burn-redeem': Burn tokens to receive new ones
   * - 'blind-mint': Mystery/gacha-style mints
   */
  type?: 'edition' | 'burn-redeem' | 'blind-mint';
}
