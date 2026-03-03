import type { ClientConfig, ManifoldClient } from '../types/client';
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
import { ManifoldApiClient } from '../api/manifold-api';

/**
 * Creates a new Manifold SDK client instance for interacting with Manifold products.
 *
 * The client provides methods to fetch product data, check eligibility, prepare purchases,
 * and execute transactions for NFT products on the Manifold platform.
 *
 * @param config - Configuration object for the client
 * @param config.publicProvider - Required provider for blockchain interactions
 * @param config.debug - Enable debug logging for troubleshooting (default: false)
 *
 * @returns A configured ManifoldClient instance
 *
 * @example
 * ```typescript
 * // Using Ethers v5
 * import { createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
 * const provider = new ethers.providers.JsonRpcProvider('...');
 * const publicProvider = createPublicProviderEthers5({ 1: provider });
 * const client = createClient({ publicProvider });
 *
 * // Using Viem
 * import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
 * const publicClient = createPublicClient({ ... });
 * const publicProvider = createPublicProviderViem({ 1: publicClient });
 * const client = createClient({ publicProvider });
 * ```
 *
 * @public
 */
export function createClient(config: ClientConfig): ManifoldClient {
  const { publicProvider } = config;
  const manifoldApiClient = new ManifoldApiClient(config.apiBaseUrl);
  return {
    /**
     * Fetches detailed product information from Manifold.
     *
     * This method retrieves complete product data including metadata, pricing,
     * inventory, and configuration for Edition or BlindMint products.
     *
     * @param instanceIdOrUrl - Either a Manifold instance ID or a full Manifold product URL
     * @returns A Promise that resolves to a Product object (EditionProduct or BlindMintProduct)
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
          return new BlindMintProduct(instanceData, previewData, publicProvider);
        }

        // Create Edition product if it matches the app ID
        if (isEditionInstanceData(instanceData)) {
          // TypeScript now knows instanceData is InstanceData<EditionPublicData>
          // Create EditionProduct with both instance and preview data
          return new EditionProduct(instanceData, previewData, publicProvider);
        }

        // For other product types, throw an error until implemented
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
          `Product type ${instanceData.appId} is not yet supported`,
        );
      } catch (error) {
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
  };
}

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
