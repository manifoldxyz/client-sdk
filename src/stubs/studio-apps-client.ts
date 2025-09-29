/**
 * Studio Apps Client integration for @manifoldxyz/studio-apps-client
 * Provides access to preview data and other studio functionality
 */

import { StudioAppsClientForPublic } from '@manifoldxyz/studio-apps-client';
import type { PreviewData } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { createCacheConfig } from '../config/cache';
import type { CacheConfig } from '../types/config';

export interface StudioAppsConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
  environment?: 'development' | 'production' | 'test';
}

/**
 * Studio Apps Client for fetching preview data and other studio functionality
 * Following patterns from gachapon-widgets and @manifoldxyz/studio-apps-client
 */
export class StudioAppsClient {
  private config: StudioAppsConfig;
  private previewCache = new Map<string, { data: PreviewData | null; expiresAt: number }>();
  private cacheConfig: CacheConfig;

  constructor(config: StudioAppsConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };

    const environment = this.config.environment
      ? this.config.environment
      : this.config.debug
        ? 'development'
        : 'production';

    this.cacheConfig = createCacheConfig({ environment });
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
        instanceIds: [instanceId],
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

      const previewData: PreviewData | null = matchedPreview ? (matchedPreview as PreviewData) : null;

      // Cache the result (even if null)
      const ttl = this.cacheConfig.ttl || 600; // ttl in seconds
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
