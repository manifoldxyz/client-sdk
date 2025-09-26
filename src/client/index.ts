import type { ClientConfig, ManifoldClient, WorkspaceProductsOptions } from '../types/client';
import type { Product } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { AppId } from '../types/common';
import { BlindMintProduct } from '../products/blindmint';
import { createMockProduct } from '../products/mock';
import { validateInstanceId, parseManifoldUrl } from '../utils/validation';
import { createManifoldApiClient } from '../api/manifold-api';

export function createClient(config?: ClientConfig): ManifoldClient {
  const httpRPCs = config?.httpRPCs ?? {};

  // Initialize Manifold API client with Studio Apps Client
  const manifoldApi = createManifoldApiClient();

  return {
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
        const { instanceData, previewData } = await manifoldApi.getCompleteInstanceData(instanceId);

        const appId = instanceData.appId as AppId;

        // Create BlindMint product if it matches the app ID or name
        if (appId === AppId.BLIND_MINT_1155) {
          // Create BlindMintProduct with both instance and preview data
          // Following technical spec pattern
          return new BlindMintProduct(instanceData, previewData, {
            httpRPCs,
          });
        }

        // For now, fallback to mock for other product types
        return createMockProduct(instanceId);
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

    async getProductsByWorkspace(
      workspaceId: string,
      options?: WorkspaceProductsOptions,
    ): Promise<Product[]> {
      // Validate options
      if (options?.limit !== undefined && (options.limit < 1 || options.limit > 100)) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Limit must be between 1 and 100');
      }

      // TODO: Implement with Studio Apps Client
      // For now, return array of mock products
      const limit = options?.limit ?? 10;
      const products: Product[] = [];

      for (let i = 0; i < limit; i++) {
        products.push(createMockProduct(`${workspaceId}_${i}`));
      }

      return products;
    },
  };
}
