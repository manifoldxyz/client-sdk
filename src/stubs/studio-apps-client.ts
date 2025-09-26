/**
 * Studio Apps Client integration for @manifoldxyz/studio-apps-client
 * Provides access to preview data and other studio functionality
 */

import { StudioAppsClientForPublic } from '@manifoldxyz/studio-apps-client';
import type { PreviewData } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { getCacheConfig } from '../config/cache';

export interface StudioAppsConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

/**
 * Studio Apps Client for fetching preview data and other studio functionality
 * Following patterns from gachapon-widgets and @manifoldxyz/studio-apps-client
 */
export class StudioAppsClient {
  private config: StudioAppsConfig;
  private previewCache = new Map<string, { data: PreviewData | null; expiresAt: number }>();
  private cacheConfig = getCacheConfig();

  constructor(config: StudioAppsConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
  }

  /**
   * Get all preview data and filter by instanceId
   * Based on CON-2729 spec: "To get the previewData, we will use @manifoldxyz/studio-apps-client 
   * package with method getAllPreviews, filter for the specific instanceId"
   */
  async getPreviewData(instanceId: string): Promise<PreviewData | null> {
    if (!instanceId || typeof instanceId !== 'string' || instanceId.trim() === '') {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Instance ID is required and must be a non-empty string'
      );
    }

    // Check cache first
    const cached = this.previewCache.get(instanceId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    try {
      
      // Create client and get preview using the studio app SDK public client
      const client = new StudioAppsClientForPublic({ baseUrl: this.config.baseUrl || 'https://api.manifold.xyz' });
      const { instancePreviews: allPreviews } = await client.public.getPreviews({ 
        instanceIds: [instanceId] 
      });
      
      if (!Array.isArray(allPreviews)) {
        throw new ClientSDKError(
          ErrorCode.INVALID_RESPONSE,
          'Invalid response from getAllPreviews: expected array'
        );
      }

      // Filter for the specific instanceId
      const matchedPreview = allPreviews.find((preview: any) => 
        preview?.id === instanceId || 
        preview?.instanceId === instanceId ||
        String(preview?.id) === String(instanceId)
      );

      let previewData: PreviewData | null = null;

      if (matchedPreview) {

        // Transform to match PreviewData format
        previewData = {
          title: matchedPreview.title || '',
          description: matchedPreview.description || '',
          contract: matchedPreview.contract ? {
            address: matchedPreview.contract.contractAddress,
            name: matchedPreview.contract.name,
            symbol: matchedPreview.contract.symbol,
            networkId: matchedPreview.contract.network,
            explorer: {
              etherscanUrl: `https://etherscan.io/address/${matchedPreview.contract.contractAddress}`,
            },
            spec: 'erc1155' as const,
          } : undefined,
          thumbnail: matchedPreview.thumbnail || '',
          network: matchedPreview.network || 1,
          // Additional fields mapped to standard fields
        };
      } else {
      }

      // Cache the result (even if null)
      const ttl = this.cacheConfig.memory?.defaultTTL || 600; // 10 minutes default in seconds
      this.previewCache.set(instanceId, {
        data: previewData,
        expiresAt: Date.now() + (ttl * 1000), // Convert seconds to milliseconds
      });

      return previewData;

    } catch (error) {
      if (error instanceof ClientSDKError) {
        throw error;
      }

      throw new ClientSDKError(
        ErrorCode.API_ERROR,
        `Failed to fetch preview data for ${instanceId}: ${(error as any).message}`,
        { instanceId, originalError: (error as any).message }
      );
    }
  }

  /**
   * Clear preview data cache
   */
  clearCache(instanceId?: string): void {
    if (instanceId) {
      this.previewCache.delete(instanceId);
    } else {
      this.previewCache.clear();
    }
  }

  /**
   * Legacy method name for backward compatibility
   * @deprecated Use getPreviewData instead
   */
  async getBlindMintData(instanceId: string): Promise<any> {
    return this.getPreviewData(instanceId);
  }
}

export default StudioAppsClient;