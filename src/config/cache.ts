import type { CacheConfig } from '../types/config';

/**
 * Simple cache configuration
 */
export function createCacheConfig(options: {
  environment?: 'development' | 'production' | 'test';
} = {}): CacheConfig {
  const { environment = 'production' } = options;

  return {
    enabled: environment !== 'test',
    ttl: environment === 'development' ? 60 : 300, // 1 min dev, 5 min prod
    maxSizeMB: 50,
  };
}

/**
 * Default cache configurations
 */
export const PRODUCTION_CACHE_CONFIG = createCacheConfig({ environment: 'production' });
export const DEVELOPMENT_CACHE_CONFIG = createCacheConfig({ environment: 'development' });
export const TEST_CACHE_CONFIG = createCacheConfig({ environment: 'test' });