import type { ApiConfig } from '../types/config';
import type { InstanceData } from '../types/product';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { logger } from '../utils/logger';
import { getCacheConfig } from '../config/cache';

/**
 * Manifold API client for fetching instance data and other Manifold services
 * Implements the patterns from gachapon-widgets and CON-2729 specification
 */
export interface ManifoldApiClient {
  getInstanceData(instanceId: string): Promise<InstanceData>;
  clearCache(instanceId?: string): void;
}

/**
 * Cache entry for instance data
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * HTTP client configuration for API requests
 */
interface RequestConfig {
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

/**
 * Create a Manifold API client instance
 */
export function createManifoldApiClient(config: ApiConfig, debug = false): ManifoldApiClient {
  const log = logger(debug);
  const baseUrl = 'https://apps.api.manifoldxyz.dev';
  const cacheConfig = getCacheConfig();
  
  // In-memory cache for instance data
  const instanceDataCache = new Map<string, CacheEntry<InstanceData>>();

  /**
   * Make HTTP request with retry logic and proper error handling
   */
  async function makeRequest<T>(
    url: string,
    requestConfig: Partial<RequestConfig> = {}
  ): Promise<T> {
    const finalConfig: RequestConfig = {
      timeout: config.requests?.timeout || 10000,
      retries: config.requests?.maxRetries || 3,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Manifold-Client-SDK/0.1.0',
        ...config.auth?.customHeaders,
        ...requestConfig.headers,
      },
    };

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= finalConfig.retries; attempt++) {
      try {
        log(`API Request (attempt ${attempt + 1}/${finalConfig.retries + 1}):`, url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: finalConfig.headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            throw new ClientSDKError(
              ErrorCode.RESOURCE_NOT_FOUND,
              `API resource not found: ${url}`,
              { url, status: response.status, statusText: response.statusText }
            );
          } else if (response.status === 429) {
            throw new ClientSDKError(
              ErrorCode.RATE_LIMITED,
              'API rate limit exceeded',
              { url, status: response.status, statusText: response.statusText }
            );
          } else if (response.status >= 500) {
            throw new ClientSDKError(
              ErrorCode.NETWORK_ERROR,
              `API server error: ${response.status} ${response.statusText}`,
              { url, status: response.status, statusText: response.statusText }
            );
          } else {
            throw new ClientSDKError(
              ErrorCode.API_ERROR,
              `API request failed: ${response.status} ${response.statusText}`,
              { url, status: response.status, statusText: response.statusText }
            );
          }
        }

        const data = await response.json();
        log('API Response:', { url, status: response.status, data });
        return data;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors or non-recoverable errors
        if (error instanceof ClientSDKError) {
          const sdkError = error as ClientSDKError;
          if (sdkError.code === ErrorCode.RESOURCE_NOT_FOUND || 
              sdkError.code === ErrorCode.INVALID_INPUT ||
              sdkError.code === ErrorCode.RATE_LIMITED) {
            throw error;
          }
        }

        // Don't retry if this was the last attempt
        if (attempt === finalConfig.retries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        log(`Request failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    if (lastError instanceof ClientSDKError) {
      throw lastError;
    }

    throw new ClientSDKError(
      ErrorCode.NETWORK_ERROR,
      'API request failed after all retries',
      { url, error: lastError?.message }
    );
  }

  /**
   * Validate instance data response structure
   */
  function validateInstanceData(data: any): InstanceData {
    if (!data || typeof data !== 'object') {
      throw new ClientSDKError(
        ErrorCode.INVALID_RESPONSE,
        'Invalid instance data: response is not an object'
      );
    }

    if (!data.id || typeof data.id !== 'string') {
      throw new ClientSDKError(
        ErrorCode.INVALID_RESPONSE,
        'Invalid instance data: missing or invalid id'
      );
    }

    if (!data.publicData || typeof data.publicData !== 'object') {
      throw new ClientSDKError(
        ErrorCode.INVALID_RESPONSE,
        'Invalid instance data: missing or invalid publicData'
      );
    }

    // Ensure we have the required fields for BlindMint
    const publicData = data.publicData;
    const requiredFields = ['title', 'description', 'contract', 'network'];
    
    for (const field of requiredFields) {
      if (publicData[field] === undefined || publicData[field] === null) {
        log(`Warning: Missing required field '${field}' in publicData`);
      }
    }

    return data as InstanceData;
  }

  /**
   * Check if cache entry is still valid
   */
  function isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Get instance data from cache if available and valid
   */
  function getCachedInstanceData(instanceId: string): InstanceData | null {
    const entry = instanceDataCache.get(instanceId);
    if (entry && isCacheValid(entry)) {
      log('Cache hit for instance data:', instanceId);
      return entry.data;
    }
    if (entry) {
      log('Cache expired for instance data:', instanceId);
      instanceDataCache.delete(instanceId);
    }
    return null;
  }

  /**
   * Store instance data in cache
   */
  function cacheInstanceData(instanceId: string, data: InstanceData): void {
    const ttl = cacheConfig.instanceData?.ttl || 300000; // 5 minutes default
    const entry: CacheEntry<InstanceData> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    instanceDataCache.set(instanceId, entry);
    log('Cached instance data:', { instanceId, expiresIn: ttl / 1000 + 's' });
  }

  return {
    async getInstanceData(instanceId: string): Promise<InstanceData> {
      log('Fetching instance data for:', instanceId);

      if (!instanceId || typeof instanceId !== 'string' || instanceId.trim() === '') {
        throw new ClientSDKError(
          ErrorCode.INVALID_INPUT,
          'Instance ID is required and must be a non-empty string'
        );
      }

      // Check cache first
      const cachedData = getCachedInstanceData(instanceId);
      if (cachedData) {
        return cachedData;
      }

      const url = `${baseUrl}/public/instance/data?id=${encodeURIComponent(instanceId)}`;
      
      try {
        const data = await makeRequest<any>(url);
        const instanceData = validateInstanceData(data);
        
        // Cache the successful response
        cacheInstanceData(instanceId, instanceData);
        
        log('Successfully fetched instance data:', {
          id: instanceData.id,
          appId: instanceData.appId,
          hasPublicData: !!instanceData.publicData
        });

        return instanceData;
      } catch (error) {
        if (error instanceof ClientSDKError) {
          throw error;
        }

        log('Error fetching instance data:', error);
        throw new ClientSDKError(
          ErrorCode.API_ERROR,
          `Failed to fetch instance data for ${instanceId}: ${error.message}`,
          { instanceId, originalError: error.message }
        );
      }
    },

    clearCache(instanceId?: string): void {
      if (instanceId) {
        instanceDataCache.delete(instanceId);
        log('Cleared cache for instance:', instanceId);
      } else {
        instanceDataCache.clear();
        log('Cleared all instance data cache');
      }
    },
  };
}

/**
 * Singleton instance for the Manifold API client
 * Follows the pattern from gachapon-widgets for shared API clients
 */
let manifoldApiClientInstance: ManifoldApiClient | null = null;

/**
 * Get or create the singleton Manifold API client
 */
export function getManifoldApiClient(config: ApiConfig, debug = false): ManifoldApiClient {
  if (!manifoldApiClientInstance) {
    manifoldApiClientInstance = createManifoldApiClient(config, debug);
  }
  return manifoldApiClientInstance;
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetManifoldApiClient(): void {
  manifoldApiClientInstance = null;
}