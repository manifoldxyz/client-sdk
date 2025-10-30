import type { ClientConfig, ManifoldClient, WorkspaceProductsOptions } from '../types/client';
import type {
  Product,
  InstanceData,
  BlindMintPublicDataResponse,
  EditionPublicDataResponse,
} from '../types/';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { AppId } from '../types/common';
import { BlindMintProduct } from '../products/blindmint';
import { EditionProduct } from '../products/edition';
import { validateInstanceId, parseManifoldUrl } from '../utils/validation';
import manifoldApiClient from '../api/manifold-api';

/**
 * Type guard to check if instanceData is for BlindMint product type.
 *
 * @internal
 * @param instanceData - The instance data to check
 * @returns True if the instance data is for a BlindMint product
 *
 * @example
 * ```typescript
 * if (isBlindMintInstanceData(instanceData)) {
 *   // TypeScript now knows this is InstanceData<BlindMintPublicData>
 *   const blindMintData = instanceData.publicData;
 * }
 * ```
 */
function isBlindMintInstanceData(
  instanceData: InstanceData<unknown>,
): instanceData is InstanceData<BlindMintPublicDataResponse> {
  return (instanceData.appId as AppId) === AppId.BLIND_MINT_1155;
}

/**
 * Type guard to check if instanceData is for Edition product type.
 *
 * @internal
 * @param instanceData - The instance data to check
 * @returns True if the instance data is for an Edition product
 *
 * @example
 * ```typescript
 * if (isEditionInstanceData(instanceData)) {
 *   // TypeScript now knows this is InstanceData<EditionPublicData>
 *   const editionData = instanceData.publicData;
 * }
 * ```
 */
function isEditionInstanceData(
  instanceData: InstanceData<unknown>,
): instanceData is InstanceData<EditionPublicDataResponse> {
  return (instanceData.appId as AppId) === AppId.EDITION;
}

/**
 * Creates a new Manifold SDK client instance for interacting with Manifold products.
 *
 * The client provides methods to fetch product data, check eligibility, prepare purchases,
 * and execute transactions for NFT products on the Manifold platform.
 *
 * @param config - Optional configuration object for the client
 * @param config.httpRPCs - Custom RPC URLs by network ID. Required for transaction execution.
 *                          Example: `{ 1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY" }`
 * @param config.debug - Enable debug logging for troubleshooting (default: false)
 *
 * @returns A configured ManifoldClient instance
 *
 * @example
 * ```typescript
 * // Basic client without custom RPCs (read-only operations)
 * const client = createClient();
 *
 * // Client with custom RPC endpoints for transaction support
 * const client = createClient({
 *   httpRPCs: {
 *     1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
 *     8453: "https://base-mainnet.infura.io/v3/YOUR_KEY",
 *     10: "https://optimism-mainnet.infura.io/v3/YOUR_KEY"
 *   },
 *   debug: true // Enable debug logging
 * });
 * ```
 *
 * @remarks
 * - No API keys are required for basic product data fetching
 * - Custom RPC endpoints are required for purchase transactions
 * - The client automatically handles network switching for cross-chain purchases
 *
 * @public
 */
export function createClient(config?: ClientConfig): ManifoldClient {
  const httpRPCs = config?.httpRPCs ?? {};

  return {
    httpRPCs,
    /**
     * Fetches detailed product information from Manifold.
     *
     * This method retrieves complete product data including metadata, pricing,
     * inventory, and configuration for Edition, Burn/Redeem, or BlindMint products.
     *
     * @param instanceIdOrUrl - Either a Manifold instance ID or a full Manifold product URL
     * @returns A Promise that resolves to a Product object (EditionProduct, BurnRedeemProduct, or BlindMintProduct)
     *
     * @throws {ClientSDKError} With error codes:
     * - `INVALID_INPUT` - Invalid URL format or instance ID
     * - `NOT_FOUND` - Product not found
     * - `UNSUPPORTED_PRODUCT_TYPE` - Product type not yet supported by SDK
     * - `API_ERROR` - Failed to fetch product data from API
     *
     * @example
     * ```typescript
     * // Using instance ID
     * const product = await client.getProduct('4150231280');
     *
     * // Using full Manifold URL
     * const product = await client.getProduct('https://manifold.xyz/@creator/id/4150231280');
     *
     * // Check product type
     * if (product.type === AppType.Edition) {
     *   console.log('Edition product:', product.data.publicData.title);
     * }
     * ```
     *
     * @public
     */
    async getProduct(instanceIdOrUrl: string): Promise<Product> {
      let instanceId: string;

      // Parse URL if provided
      if (instanceIdOrUrl.includes('manifold.xyz')) {
        const parsed = parseManifoldUrl(instanceIdOrUrl);
        if (!parsed) {
          throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid Manifold URL format');
        }
        instanceId = parsed.instanceId;
      } else {
        instanceId = instanceIdOrUrl;
      }

      // Validate instance ID
      if (!validateInstanceId(instanceId)) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid instance ID format');
      }

      try {
        // Fetch both instance and preview data using Studio Apps Client
        const { instanceData, previewData } = await manifoldApiClient.getCompleteInstanceData(
          instanceId,
          { maxMediaWidth: 1024 },
        );

        // Create BlindMint product if it matches the app ID or name
        if (isBlindMintInstanceData(instanceData)) {
          // TypeScript now knows instanceData is InstanceData<BlindMintPublicData>
          // Create BlindMintProduct with both instance and preview data
          return new BlindMintProduct(instanceData, previewData, {
            httpRPCs,
          });
        }

        // Create Edition product if it matches the app ID
        if (isEditionInstanceData(instanceData)) {
          // TypeScript now knows instanceData is InstanceData<EditionPublicData>
          // Create EditionProduct with both instance and preview data
          return new EditionProduct(instanceData, previewData, {
            httpRPCs,
          });
        }

        // For other product types, throw an error until implemented
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
          `Product type ${instanceData.appId} is not yet supported`,
        );
      } catch (error) {
        console.log('error', error);
        // Re-throw SDK errors
        if (error instanceof ClientSDKError) {
          throw error;
        }

        throw new ClientSDKError(
          ErrorCode.API_ERROR,
          `Failed to fetch product data for ${instanceId}: ${(error as Error).message}`,
          { instanceId, originalError: (error as Error).message },
        );
      }
    },

    /**
     * Fetches products from a specific Manifold workspace.
     *
     * Retrieves a list of products created by a workspace, with optional filtering
     * and pagination capabilities.
     *
     * @param workspaceId - The workspace identifier (found in Manifold Studio)
     * @param options - Optional query parameters for filtering and pagination
     * @param options.limit - Number of results to return (1-100, default: 50)
     * @param options.offset - Number of results to skip for pagination
     * @param options.sort - Sort order: 'latest' or 'oldest' (default: 'latest')
     * @param options.networkId - Filter by specific network ID (e.g., 1 for Ethereum, 8453 for Base)
     * @param options.type - Filter by product type: 'edition', 'burn-redeem', or 'blind-mint'
     *
     * @returns A Promise that resolves to an array of Product objects
     *
     * @throws {ClientSDKError} With error codes:
     * - `INVALID_INPUT` - Invalid options (e.g., limit out of range)
     * - `NOT_FOUND` - Workspace not found
     * - `API_ERROR` - Failed to fetch workspace products
     *
     * @example
     * ```typescript
     * // Get latest 10 products from a workspace
     * const products = await client.getProductsByWorkspace('workspace123', {
     *   limit: 10,
     *   sort: 'latest'
     * });
     *
     * // Get Edition products on Base network
     * const baseEditions = await client.getProductsByWorkspace('workspace123', {
     *   type: 'edition',
     *   networkId: 8453
     * });
     *
     * // Paginate through products
     * const page2 = await client.getProductsByWorkspace('workspace123', {
     *   limit: 20,
     *   offset: 20
     * });
     * ```
     *
     * @public
     */
    async getProductsByWorkspace(
      _workspaceId: string,
      options?: WorkspaceProductsOptions,
    ): Promise<Product[]> {
      // Validate options
      if (options?.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Limit must be between 1 and 100');
      }

      // TODO: Implement with Studio Apps Client
      throw new ClientSDKError(
        ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
        'getProductsByWorkspace is not yet implemented',
      );
    },
  };
}
