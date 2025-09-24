/**
 * Studio Apps Client integration for @manifoldxyz/studio-app-sdk
 * Provides access to preview data and other studio functionality
 */

import { getAllPreviews } from '@manifoldxyz/studio-app-sdk';
import type { PreviewData } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { logger } from '../utils/logger';
import { getCacheConfig } from '../config/cache';

export interface StudioAppsConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}

/**
 * Studio Apps Client for fetching preview data and other studio functionality
 * Following patterns from gachapon-widgets and @manifoldxyz/studio-app-sdk
 */
export class StudioAppsClient {
  private config: StudioAppsConfig;
  private log: ReturnType<typeof logger>;
  private previewCache = new Map<string, { data: PreviewData | null; expiresAt: number }>();
  private cacheConfig = getCacheConfig();

  constructor(config: StudioAppsConfig) {
    this.config = {
      timeout: 10000,
      debug: false,
      ...config,
    };
    this.log = logger(this.config.debug || false);
  }

  /**
   * Get all preview data and filter by instanceId
   * Based on CON-2729 spec: "To get the previewData, we will use @manifoldxyz/studio-app-sdk 
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
      this.log('Cache hit for preview data:', instanceId);
      return cached.data;
    }

    try {
      this.log('Fetching preview data for instanceId:', instanceId);
      
      // Get all previews using the studio app SDK
      const allPreviews = await getAllPreviews();
      
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
        this.log('Found preview data:', { instanceId, previewId: matchedPreview.id });

        // Transform to match PreviewData format
        previewData = {
          title: matchedPreview.title || '',
          description: matchedPreview.description || '',
          contract: matchedPreview.contract || '',
          thumbnail: matchedPreview.thumbnail || matchedPreview.image || '',
          network: matchedPreview.network || 1,
          // Additional fields that might be available
          images: matchedPreview.images || [],
          animations: matchedPreview.animations || [],
          metadata: matchedPreview.metadata || {},
        };
      } else {
        this.log('No preview data found for instanceId:', instanceId);
      }

      // Cache the result (even if null)
      const ttl = this.cacheConfig.previewData?.ttl || 600000; // 10 minutes default
      this.previewCache.set(instanceId, {
        data: previewData,
        expiresAt: Date.now() + ttl,
      });
      this.log('Cached preview data:', { instanceId, found: !!previewData, expiresIn: ttl / 1000 + 's' });

      return previewData;

    } catch (error) {
      if (error instanceof ClientSDKError) {
        throw error;
      }

      this.log('Error fetching preview data:', error);
      throw new ClientSDKError(
        ErrorCode.API_ERROR,
        `Failed to fetch preview data for ${instanceId}: ${error.message}`,
        { instanceId, originalError: error.message }
      );
    }
  }

  /**
   * Clear preview data cache
   */
  clearCache(instanceId?: string): void {
    if (instanceId) {
      this.previewCache.delete(instanceId);
      this.log('Cleared preview cache for:', instanceId);
    } else {
      this.previewCache.clear();
      this.log('Cleared all preview cache');
    }
  }

  /**
   * Legacy method name for backward compatibility
   * @deprecated Use getPreviewData instead
   */
  async getBlindMintData(instanceId: string): Promise<any> {
    this.log('getBlindMintData called - redirecting to getPreviewData');
    return this.getPreviewData(instanceId);
  }
}

export default StudioAppsClient;