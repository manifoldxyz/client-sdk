/**
 * Configuration module exports for BlindMint implementation
 * Centralized configuration management for the Manifold Client SDK
 */

// Import required types
import type { NetworkId } from '../types/common';
import type { ProviderConfig } from '../types/contracts';
import type { CacheConfig } from '../types/config';
import type { APIConfig as ApiConfig } from '../types/config';

// Import factory functions
import { createProviderConfig } from './providers';
import { createCacheConfig } from './cache';
import { createApiConfig } from './api';

// Network configurations
export {
  NETWORK_CONFIGS,
  getNetworkConfig,
  getSupportedNetworks,
  isNetworkSupported,
  getNetworkName,
  getMainnetEquivalent
} from './networks';

// Provider configurations
export {
  createProviderConfig,
  getNetworkProviderConfig,
  selectProvider,
  NETWORK_PROVIDER_TIMEOUTS,
  NETWORK_PROVIDER_RETRIES,
  PROVIDER_FALLBACK_STRATEGIES,
  PROVIDER_HEALTH_CONFIG,
  DEVELOPMENT_PROVIDER_CONFIG,
  TEST_PROVIDER_CONFIG
} from './providers';

// Cache configurations
export {
  createCacheConfig,
  getCacheConfig,
  generateCacheKey,
  getNetworkCacheConfig,
  shouldCacheData,
  ONCHAIN_DATA_TTL,
  NETWORK_CACHE_CONFIG,
  DEVELOPMENT_CACHE_CONFIG,
  TEST_CACHE_CONFIG
} from './cache';

// API configurations
export {
  createApiConfig,
  buildApiUrl,
  getNetworkApiConfig,
  validateEndpointParams,
  API_ENDPOINTS,
  NETWORK_API_CONFIG,
  DEVELOPMENT_API_CONFIG,
  TEST_API_CONFIG
} from './api';

// Re-export configuration types
export type {
  NetworkConfig,
  ProviderConfig,
  CacheConfig,
  ApiConfig,
  GasConfig,
  ContractAddresses,
  NetworkFeatures,
  CurrencyConfig,
  RpcConfig,
  ExplorerConfig
} from '../types/config';

// Re-export common types
export type {
  NetworkId,
  Address
} from '../types/common';

// =============================================================================
// UNIFIED CONFIGURATION FACTORY
// =============================================================================

/**
 * Create a complete SDK configuration for a given environment
 */
export interface SDKConfigOptions {
  environment?: 'development' | 'production' | 'test';
  networkId?: NetworkId;
  apiKey?: string;
  enableDebug?: boolean;
  customEndpoints?: Record<string, string>;
  enableStrictMode?: boolean;
  aggressiveCaching?: boolean;
}

export interface SDKConfig {
  environment: string;
  networkId?: NetworkId;
  provider: ProviderConfig;
  cache: CacheConfig;
  api: ApiConfig;
  debug: boolean;
}

/**
 * Factory function to create complete SDK configuration
 */
export function createSDKConfig(options: SDKConfigOptions = {}): SDKConfig {
  const {
    environment = 'production',
    networkId,
    apiKey,
    enableDebug = false,
    customEndpoints,
    enableStrictMode = false,
    aggressiveCaching = false
  } = options;

  return {
    environment,
    networkId,
    provider: createProviderConfig({
      isDevelopment: environment === 'development',
      bridgeApiKey: apiKey,
      enableStrictMode,
      debugMode: enableDebug
    }),
    cache: createCacheConfig({
      environment,
      aggressiveCaching,
      enablePersistent: environment !== 'test'
    }),
    api: createApiConfig({
      environment,
      apiKey,
      enableAuth: environment === 'production',
      strictValidation: enableStrictMode,
      customEndpoints: customEndpoints as any
    }),
    debug: enableDebug
  };
}

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * Pre-configured SDK settings for development
 */
export const DEVELOPMENT_SDK_CONFIG: SDKConfig = createSDKConfig({
  environment: 'development',
  enableDebug: true,
  enableStrictMode: false,
  aggressiveCaching: false
});

/**
 * Pre-configured SDK settings for production
 */
export const PRODUCTION_SDK_CONFIG: SDKConfig = createSDKConfig({
  environment: 'production',
  enableDebug: false,
  enableStrictMode: true,
  aggressiveCaching: true
});

/**
 * Pre-configured SDK settings for testing
 */
export const TEST_SDK_CONFIG: SDKConfig = createSDKConfig({
  environment: 'test',
  enableDebug: false,
  enableStrictMode: true,
  aggressiveCaching: false
});

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

/**
 * Validate SDK configuration for completeness and consistency
 */
export function validateSDKConfig(config: SDKConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate environment
  if (!['development', 'production', 'test'].includes(config.environment)) {
    errors.push(`Invalid environment: ${config.environment}`);
  }

  // Validate network ID if provided
  if (config.networkId !== undefined && !isNetworkSupported(config.networkId)) {
    errors.push(`Unsupported network ID: ${config.networkId}`);
  }

  // Validate provider configuration
  if (config.provider.primary.timeout < 1000) {
    warnings.push('Primary provider timeout is very low, may cause connection issues');
  }

  if (config.provider.bridge.timeout < 500) {
    warnings.push('Bridge provider timeout is very low, may cause connection issues');
  }

  // Validate cache configuration
  if (config.cache.memory.maxSizeMB > 200) {
    warnings.push('Memory cache size is very large, may impact performance');
  }

  if (config.cache.memory.defaultTTL < 30 && config.environment === 'production') {
    warnings.push('Cache TTL is very low for production, may increase API load');
  }

  // Validate API configuration
  if (config.api.requests.timeout < 1000 && config.environment === 'production') {
    warnings.push('API timeout is very low for production environment');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// =============================================================================
// CONFIGURATION MERGING UTILITIES
// =============================================================================

/**
 * Deep merge two configuration objects
 */
export function mergeConfigs<T extends Record<string, any>>(
  base: T,
  override: Partial<T>
): T {
  const result = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = mergeConfigs(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Create configuration with environment-specific overrides
 */
export function createConfigWithOverrides(
  baseConfig: SDKConfig,
  overrides: Partial<SDKConfig>
): SDKConfig {
  return mergeConfigs(baseConfig, overrides);
}

// =============================================================================
// RUNTIME CONFIGURATION DETECTION
// =============================================================================

/**
 * Detect optimal configuration based on runtime environment
 */
export function detectOptimalConfig(): SDKConfig {
  // Browser detection
  const isBrowser = typeof window !== 'undefined';
  
  // Node.js detection
  const isNode = typeof process !== 'undefined' && process.versions?.node;
  
  // Development detection
  const isDevelopment = 
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
    (isBrowser && window.location?.hostname === 'localhost');

  // Test detection
  const isTest = 
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
    (typeof global !== 'undefined' && (global as any).jest) ||
    (typeof window !== 'undefined' && (window as any).jest);

  let environment: 'development' | 'production' | 'test' = 'production';
  
  if (isTest) {
    environment = 'test';
  } else if (isDevelopment) {
    environment = 'development';
  }

  const config = createSDKConfig({
    environment,
    enableDebug: isDevelopment,
    enableStrictMode: environment === 'production',
    aggressiveCaching: environment === 'production'
  });

  // Browser-specific adjustments
  if (isBrowser) {
    config.cache.persistent.storage = 'localStorage';
    config.provider.bridge.fallbackStrategy = 'immediate';
  }

  // Node.js-specific adjustments
  if (isNode) {
    config.cache.persistent.storage = 'memory'; // No localStorage in Node
    config.provider.primary.required = false; // No wallet in Node
  }

  return config;
}

export default {
  createSDKConfig,
  validateSDKConfig,
  detectOptimalConfig,
  DEVELOPMENT_SDK_CONFIG,
  PRODUCTION_SDK_CONFIG,
  TEST_SDK_CONFIG
};