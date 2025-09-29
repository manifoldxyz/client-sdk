import type { ProviderConfig } from '../types/config';

/**
 * Simple provider configuration
 */
export function createProviderConfig(options: {
  environment?: 'development' | 'production' | 'test';
} = {}): ProviderConfig {
  const { environment = 'production' } = options;

  return {
    primary: {
      timeout: environment === 'test' ? 1000 : 5000,
      retries: environment === 'test' ? 0 : 3,
    },
    bridge: {
      baseUrl: 'https://bridge.manifold.xyz',
      timeout: 1500,
      enabled: environment !== 'test',
    },
  };
}

/**
 * Default provider configurations
 */
export const PRODUCTION_PROVIDER_CONFIG = createProviderConfig({ environment: 'production' });
export const DEVELOPMENT_PROVIDER_CONFIG = createProviderConfig({ environment: 'development' });
export const TEST_PROVIDER_CONFIG = createProviderConfig({ environment: 'test' });