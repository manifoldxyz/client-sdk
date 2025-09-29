import type { ApiConfig } from '../types/config';

/**
 * Simple API configuration
 */
export function createApiConfig(
  options: {
    environment?: 'development' | 'production' | 'test';
  } = {},
): ApiConfig {
  const { environment = 'production' } = options;

  return {
    manifoldUrl:
      environment === 'production' ? 'https://api.manifold.xyz' : 'https://api-dev.manifold.xyz',
    studioAppsUrl:
      environment === 'production'
        ? 'https://studio.manifold.xyz'
        : 'https://studio-dev.manifold.xyz',
    timeout: 10000,
    maxRetries: 3,
  };
}

/**
 * Default API configurations
 */
export const PRODUCTION_API_CONFIG = createApiConfig({ environment: 'production' });
export const DEVELOPMENT_API_CONFIG = createApiConfig({ environment: 'development' });
export const TEST_API_CONFIG = createApiConfig({ environment: 'test' });
