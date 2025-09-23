import type { ClientConfig, ManifoldClient, WorkspaceProductsOptions } from '../types/client';
import type { Product } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { createMockProduct } from '../products/mock';
import { validateInstanceId, parseManifoldUrl } from '../utils/validation';
import { logger } from '../utils/logger';

export function createClient(config?: ClientConfig): ManifoldClient {
  const debug = config?.debug ?? false;
  // TODO: Use httpRPCs for actual network calls
  // const httpRPCs = config?.httpRPCs ?? {};

  const log = logger(debug);

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

      // TODO: Replace with actual API call
      // For now, return mock product
      log('Returning mock product for:', instanceId);
      return createMockProduct(instanceId);
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
