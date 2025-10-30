// =============================================================================
// SIMPLE CONFIGURATION TYPES
// =============================================================================

/**
 * Basic API configuration
 */
export interface ApiConfig {
  /** Manifold API base URL */
  manifoldUrl: string;
  /** Studio apps client URL */
  studioAppsUrl: string;
  /** Request timeout in ms */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

// =============================================================================
// SIMPLE CACHE CONFIGURATION
// =============================================================================

/**
 * Basic caching configuration
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;
  /** Cache TTL in seconds */
  ttl: number;
  /** Maximum cache size in MB */
  maxSizeMB: number;
}
