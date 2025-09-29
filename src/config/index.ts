/**
 * Configuration module exports for BlindMint implementation
 * Centralized configuration management for the Manifold Client SDK
 */

// Export simple configuration functions
export {
  createApiConfig,
  PRODUCTION_API_CONFIG,
  DEVELOPMENT_API_CONFIG,
  TEST_API_CONFIG,
} from './api';
export {
  createCacheConfig,
  PRODUCTION_CACHE_CONFIG,
  DEVELOPMENT_CACHE_CONFIG,
  TEST_CACHE_CONFIG,
} from './cache';
export {
  createProviderConfig,
  PRODUCTION_PROVIDER_CONFIG,
  DEVELOPMENT_PROVIDER_CONFIG,
  TEST_PROVIDER_CONFIG,
} from './providers';
export {
  NETWORK_CONFIGS,
  getNetworkConfig,
  getSupportedNetworks,
  isNetworkSupported,
} from './networks';

// Re-export configuration types
export type {
  ApiConfig,
  CacheConfig,
  GasConfig,
  ProviderConfig,
  NetworkConfig,
} from '../types/config';
export {
  DEFAULT_PROVIDER_CONFIG,
  DEFAULT_GAS_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_API_CONFIG,
} from '../types/config';
