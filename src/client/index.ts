import type { ClientConfig, ManifoldClient, WorkspaceProductsOptions } from '../types/client';
import type { Product } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { BlindMintProductImpl } from '../products/blindmint';
import { createMockProduct } from '../products/mock';
import { validateInstanceId, parseManifoldUrl } from '../utils/validation';
import { logger } from '../utils/logger';
import { getManifoldApiClient } from '../api/manifold-api';
import { createApiConfig } from '../config/api';

export function createClient(config?: ClientConfig): ManifoldClient {
  const debug = config?.debug ?? false;
  const httpRPCs = config?.httpRPCs ?? {};

  const log = logger(debug);

  // Initialize API configuration
  const apiConfig = createApiConfig({
    environment: config?.environment || 'production',
    apiKey: config?.apiKey,
    enableAuth: !!config?.apiKey,
    strictValidation: debug,
  });

  // Initialize Manifold API client
  const manifoldApi = getManifoldApiClient(apiConfig, debug);

  return {
    async getProduct(instanceIdOrUrl: string): Promise<Product> {
      log('Getting product:', instanceIdOrUrl);

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
        // Fetch instance data from Manifold API
        log('Fetching instance data from API:', instanceId);
        const instanceData = await manifoldApi.getInstanceData(instanceId);
        
        // Determine product type from instance data
        const appId = instanceData.appId || 3; // Default to BlindMint app ID
        
        log('Creating product based on instance data:', { 
          instanceId, 
          appId, 
          appName: instanceData.appName 
        });

        // Create BlindMint product with real instance data
        // Following CON-2729 spec pattern
        if (appId === 3 || instanceData.appName === 'BlindMint') {
          const includeOnchainData = config?.includeOnchainData ?? false;
          return new BlindMintProductImpl(instanceData, includeOnchainData, {
            debug,
            fetchPreviewData: true, // Enable preview data fetching from Studio Apps SDK
          });
        }

        // For now, fallback to mock for other product types
        log('Unknown product type, falling back to mock:', { appId, appName: instanceData.appName });
        return createMockProduct(instanceId);

      } catch (error) {
        // Re-throw non-recoverable client errors immediately
        if (error instanceof ClientSDKError) {
          const sdkError = error as ClientSDKError;
          // Allow network errors and API errors to be handled by fallback logic
          if (sdkError.code !== ErrorCode.NETWORK_ERROR && sdkError.code !== ErrorCode.API_ERROR) {
            throw error;
          }
        }

        log('Error fetching product, falling back to mock:', error);
        
        // Fallback to mock product if API fails (for development/testing)
        if (debug) {
          log('Debug mode: returning mock product after API failure');
          return createMockProduct(instanceId);
        }

        throw new ClientSDKError(
          ErrorCode.API_ERROR,
          `Failed to fetch product data for ${instanceId}: ${error.message}`,
          { instanceId, originalError: error.message }
        );
      }
    },

    async getProductsByWorkspace(
      workspaceId: string,
      options?: WorkspaceProductsOptions,
    ): Promise<Product[]> {
      log('Getting products for workspace:', workspaceId);

      // Validate options
      if (options?.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Limit must be between 1 and 100');
      }

      // TODO: Replace with actual API call
      // For now, return array of mock products
      const limit = options?.limit ?? 10;
      const products: Product[] = [];

      for (let i = 0; i < limit; i++) {
        products.push(createMockProduct(`${workspaceId}_${i}`));
      }

      log(`Returning ${products.length} mock products`);
      return products;
    },
  };
}
