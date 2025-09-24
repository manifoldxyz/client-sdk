import type { 
  CacheConfig, 
  MemoryCacheConfig, 
  PersistentCacheConfig, 
  CacheInvalidationConfig,
  CacheKeyConfig,
  CacheDataType,
  AutoInvalidationRule,
  InvalidationTrigger
} from '../types/config';
import type { NetworkId } from '../types/common';
import { DEFAULT_CACHE_CONFIG } from '../types/config';

/**
 * Cache configuration for BlindMint on-chain data
 * Based on DATA_FLOW_ANALYSIS.md caching patterns
 */

// =============================================================================
// ENVIRONMENT-BASED CACHE CONFIGURATION
// =============================================================================

/**
 * Create cache configuration based on environment and requirements
 */
export function createCacheConfig(options: {
  environment?: 'development' | 'production' | 'test';
  maxMemoryMB?: number;
  maxPersistentMB?: number;
  enablePersistent?: boolean;
  aggressiveCaching?: boolean;
} = {}): CacheConfig {
  const {
    environment = 'production',
    maxMemoryMB = 50,
    maxPersistentMB = 100,
    enablePersistent = true,
    aggressiveCaching = false
  } = options;

  return {
    memory: createMemoryCacheConfig({ 
      environment, 
      maxMemoryMB, 
      aggressiveCaching 
    }),
    persistent: createPersistentCacheConfig({ 
      environment, 
      maxPersistentMB, 
      enabled: enablePersistent 
    }),
    invalidation: createInvalidationConfig({ environment, aggressiveCaching }),
    keyGeneration: createKeyGenerationConfig({ environment })
  };
}

// =============================================================================
// MEMORY CACHE CONFIGURATION
// =============================================================================

/**
 * Configure in-memory caching for frequently accessed data
 */
function createMemoryCacheConfig(options: {
  environment: string;
  maxMemoryMB: number;
  aggressiveCaching: boolean;
}): MemoryCacheConfig {
  const { environment, maxMemoryMB, aggressiveCaching } = options;

  // Aggressive caching uses longer TTLs and larger cache
  const ttlMultiplier = aggressiveCaching ? 2 : 1;
  const devMultiplier = environment === 'development' ? 0.5 : 1;

  return {
    maxSizeMB: maxMemoryMB,
    defaultTTL: 300 * ttlMultiplier * devMultiplier,
    ttlByType: {
      'onchain-data': 60 * ttlMultiplier * devMultiplier,
      'metadata': 3600 * ttlMultiplier,
      'pricing': 30 * ttlMultiplier * devMultiplier,
      'allocation': 300 * ttlMultiplier * devMultiplier,
      'gas-estimates': 60 * ttlMultiplier * devMultiplier
    },
    useLRU: true
  };
}

// =============================================================================
// PERSISTENT CACHE CONFIGURATION
// =============================================================================

/**
 * Configure persistent caching for long-term data storage
 */
function createPersistentCacheConfig(options: {
  environment: string;
  maxPersistentMB: number;
  enabled: boolean;
}): PersistentCacheConfig {
  const { environment, maxPersistentMB, enabled } = options;

  // Disable persistent cache in test environment
  const actuallyEnabled = enabled && environment !== 'test';

  return {
    enabled: actuallyEnabled,
    storage: environment === 'test' ? 'memory' : 'localStorage',
    maxSizeMB: maxPersistentMB,
    cleanupIntervalHours: environment === 'development' ? 1 : 24
  };
}

// =============================================================================
// CACHE INVALIDATION CONFIGURATION
// =============================================================================

/**
 * Configure cache invalidation rules
 */
function createInvalidationConfig(options: {
  environment: string;
  aggressiveCaching: boolean;
}): CacheInvalidationConfig {
  const { environment, aggressiveCaching } = options;

  const autoInvalidationRules: AutoInvalidationRule[] = [
    {
      dataType: 'onchain-data',
      trigger: 'block-change',
      delay: aggressiveCaching ? 30 : 15 // Seconds to wait after block change
    },
    {
      dataType: 'pricing',
      trigger: 'time-elapsed',
      delay: 60 // Update pricing every minute
    },
    {
      dataType: 'allocation',
      trigger: 'transaction-complete',
      delay: 5 // Clear allocation cache after transactions
    },
    {
      dataType: 'gas-estimates',
      trigger: 'time-elapsed',
      delay: aggressiveCaching ? 120 : 60
    }
  ];

  // More aggressive invalidation in development
  if (environment === 'development') {
    autoInvalidationRules.forEach(rule => {
      rule.delay = Math.max(5, rule.delay * 0.5);
    });
  }

  return {
    autoInvalidate: autoInvalidationRules,
    manualTriggers: [
      'transaction-complete',
      'network-change',
      'wallet-change',
      'user-action'
    ],
    blockBasedInvalidation: true
  };
}

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Configure cache key generation
 */
function createKeyGenerationConfig(options: {
  environment: string;
}): CacheKeyConfig {
  const { environment } = options;

  return {
    prefix: `manifold-sdk-${environment}`,
    includeNetworkId: true,
    includeVersion: true,
    customComponents: [
      'sdk-version',
      'user-session' // Include user session for personalized caching
    ]
  };
}

// =============================================================================
// DATA-TYPE SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * TTL configurations for different types of on-chain data
 */
export const ONCHAIN_DATA_TTL: Record<string, number> = {
  // BlindMint contract data
  'blindmint-config': 300,    // 5 minutes - configuration rarely changes
  'blindmint-supply': 60,     // 1 minute - supply changes frequently
  'blindmint-status': 30,     // 30 seconds - status can change quickly
  
  // Token/NFT data
  'token-metadata': 3600,     // 1 hour - metadata is mostly static
  'token-ownership': 300,     // 5 minutes - ownership can change
  'token-approvals': 600,     // 10 minutes - approvals change less frequently
  
  // Gas and pricing
  'gas-prices': 60,           // 1 minute - gas prices fluctuate
  'token-prices': 300,        // 5 minutes - token prices change regularly
  
  // Block and transaction data
  'block-data': 900,          // 15 minutes - historical blocks don't change
  'transaction-receipt': 3600 // 1 hour - receipts are immutable
};

/**
 * Network-specific cache configurations
 */
export const NETWORK_CACHE_CONFIG: Record<NetworkId, Partial<CacheConfig>> = {
  // Ethereum - slower blocks, can cache longer
  1: {
    memory: {
      maxSizeMB: 50,
      defaultTTL: 300,
      ttlByType: {
        'onchain-data': 90,   // Longer for Ethereum due to slower blocks
        'metadata': 600,
        'pricing': 45,        // More stable pricing
        'allocation': 300,
        'gas-estimates': 90
      },
      useLRU: true
    }
  },

  // Polygon - faster blocks, shorter cache
  137: {
    memory: {
      maxSizeMB: 50,
      defaultTTL: 180,
      ttlByType: {
        'onchain-data': 30,   // Shorter due to faster blocks
        'metadata': 600,
        'pricing': 15,        // More volatile pricing
        'allocation': 180,
        'gas-estimates': 30
      },
      useLRU: true
    }
  },

  // L2s - very fast, shortest cache
  8453: { // Base
    memory: {
      maxSizeMB: 50,
      defaultTTL: 120,
      ttlByType: {
        'onchain-data': 15,
        'metadata': 600,
        'pricing': 10,
        'allocation': 120,
        'gas-estimates': 15
      },
      useLRU: true
    }
  },

  42161: { // Arbitrum
    memory: {
      maxSizeMB: 50,
      defaultTTL: 120,
      ttlByType: {
        'onchain-data': 15,
        'metadata': 600,
        'pricing': 10,
        'allocation': 120,
        'gas-estimates': 15
      },
      useLRU: true
    }
  },

  10: { // Optimism
    memory: {
      maxSizeMB: 50,
      defaultTTL: 120,
      ttlByType: {
        'onchain-data': 15,
        'metadata': 600,
        'pricing': 10,
        'allocation': 120,
        'gas-estimates': 15
      },
      useLRU: true
    }
  }
};

// =============================================================================
// CACHE UTILITIES
// =============================================================================

/**
 * Generate cache key for specific data
 */
export function generateCacheKey(
  config: CacheKeyConfig,
  dataType: CacheDataType,
  identifier: string,
  networkId?: NetworkId,
  additionalParams?: Record<string, string | number>
): string {
  const parts = [config.prefix, dataType, identifier];

  if (config.includeNetworkId && networkId) {
    parts.push(`net-${networkId}`);
  }

  if (config.includeVersion) {
    parts.push('v1'); // SDK version
  }

  // Add custom components
  config.customComponents.forEach(component => {
    parts.push(component);
  });

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      parts.push(`${key}-${value}`);
    });
  }

  return parts.join(':');
}

/**
 * Get cache configuration for specific network
 */
export function getNetworkCacheConfig(
  networkId: NetworkId,
  baseConfig: CacheConfig
): CacheConfig {
  const networkOverrides = NETWORK_CACHE_CONFIG[networkId];
  
  if (!networkOverrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    memory: {
      ...baseConfig.memory,
      ...networkOverrides.memory
    },
    persistent: {
      ...baseConfig.persistent,
      ...networkOverrides.persistent
    },
    invalidation: {
      ...baseConfig.invalidation,
      ...networkOverrides.invalidation
    },
    keyGeneration: {
      ...baseConfig.keyGeneration,
      ...networkOverrides.keyGeneration
    }
  };
}

/**
 * Determine if data should be cached based on type and context
 */
export function shouldCacheData(
  dataType: CacheDataType,
  networkId: NetworkId,
  dataSize: number,
  maxSizeMB: number
): boolean {
  // Don't cache if data is too large (convert MB to bytes)
  if (dataSize > (maxSizeMB * 1024 * 1024 * 0.1)) { // Use max 10% of cache for single item
    return false;
  }

  // Always cache metadata and configuration
  if (dataType === 'metadata' || dataType === 'onchain-data') {
    return true;
  }

  // Cache pricing and gas estimates for mainnet and Polygon
  if ((dataType === 'pricing' || dataType === 'gas-estimates') && 
      (networkId === 1 || networkId === 137)) {
    return true;
  }

  // Cache allocations for all networks
  if (dataType === 'allocation') {
    return true;
  }

  return false;
}

// =============================================================================
// DEVELOPMENT AND TESTING CONFIGURATIONS
// =============================================================================

/**
 * Cache configuration for development environment
 */
export const DEVELOPMENT_CACHE_CONFIG: CacheConfig = {
  memory: {
    maxSizeMB: 25, // Smaller for development
    defaultTTL: 150, // Shorter TTL for development
    ttlByType: {
      'onchain-data': 30,
      'metadata': 1800,
      'pricing': 15,
      'allocation': 150,
      'gas-estimates': 30
    },
    useLRU: true
  },
  persistent: {
    enabled: true,
    storage: 'localStorage',
    maxSizeMB: 50,
    cleanupIntervalHours: 1 // More frequent cleanup
  },
  invalidation: {
    autoInvalidate: [
      {
        dataType: 'onchain-data',
        trigger: 'block-change',
        delay: 5
      }
    ],
    manualTriggers: ['user-action'],
    blockBasedInvalidation: true
  },
  keyGeneration: {
    prefix: 'manifold-sdk-dev',
    includeNetworkId: true,
    includeVersion: false, // Disable in dev for easier debugging
    customComponents: ['dev-session']
  }
};

/**
 * Cache configuration for testing environment
 */
export const TEST_CACHE_CONFIG: CacheConfig = {
  memory: {
    maxSizeMB: 10,
    defaultTTL: 60,
    ttlByType: {
      'onchain-data': 10,
      'metadata': 60,
      'pricing': 5,
      'allocation': 10,
      'gas-estimates': 5
    },
    useLRU: false // Deterministic for tests
  },
  persistent: {
    enabled: false, // No persistent cache in tests
    storage: 'memory',
    maxSizeMB: 0,
    cleanupIntervalHours: 0
  },
  invalidation: {
    autoInvalidate: [], // No auto invalidation in tests
    manualTriggers: [],
    blockBasedInvalidation: false
  },
  keyGeneration: {
    prefix: 'manifold-sdk-test',
    includeNetworkId: true,
    includeVersion: false,
    customComponents: ['test-run']
  }
};

// =============================================================================
// DEFAULT CACHE CONFIGURATION GETTER
// =============================================================================

/**
 * Get default cache configuration based on current environment
 * This function auto-detects the environment and returns appropriate config
 */
export function getCacheConfig(): CacheConfig {
  // Environment detection
  const isTest = 
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
    (typeof global !== 'undefined' && (global as any).jest) ||
    (typeof window !== 'undefined' && (window as any).jest);
  
  const isDevelopment = 
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
    (typeof window !== 'undefined' && window.location?.hostname === 'localhost');

  // Return appropriate configuration
  if (isTest) {
    return TEST_CACHE_CONFIG;
  } else if (isDevelopment) {
    return DEVELOPMENT_CACHE_CONFIG;
  } else {
    // Production configuration
    return createCacheConfig({
      environment: 'production',
      maxMemoryMB: 50,
      maxPersistentMB: 100,
      enablePersistent: true,
      aggressiveCaching: true
    });
  }
}