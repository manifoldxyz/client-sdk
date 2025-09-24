import type { ProviderConfig, PrimaryProviderConfig, BridgeProviderConfig, GlobalProviderConfig } from '../types/config';
import type { NetworkId } from '../types/common';
import { DEFAULT_PROVIDER_CONFIG } from '../types/config';

/**
 * Provider configuration for BlindMint dual-provider architecture
 * Based on CONTRACT_PATTERNS.md dual-provider analysis
 */

// =============================================================================
// ENVIRONMENT-BASED CONFIGURATION
// =============================================================================

/**
 * Get provider configuration based on environment
 */
export function createProviderConfig(options: {
  isDevelopment?: boolean;
  bridgeApiKey?: string;
  customBridgeUrl?: string;
  enableStrictMode?: boolean;
  debugMode?: boolean;
} = {}): ProviderConfig {
  const {
    isDevelopment = false,
    bridgeApiKey,
    customBridgeUrl,
    enableStrictMode = false,
    debugMode = false
  } = options;

  return {
    primary: createPrimaryProviderConfig({ isDevelopment, enableStrictMode }),
    bridge: createBridgeProviderConfig({ 
      isDevelopment, 
      apiKey: bridgeApiKey,
      customUrl: customBridgeUrl 
    }),
    networks: {},
    global: createGlobalProviderConfig({ debugMode, enableStrictMode })
  };
}

// =============================================================================
// PRIMARY PROVIDER CONFIGURATION
// =============================================================================

/**
 * Configure primary provider (user's wallet)
 */
function createPrimaryProviderConfig(options: {
  isDevelopment?: boolean;
  enableStrictMode?: boolean;
}): PrimaryProviderConfig {
  const { isDevelopment = false, enableStrictMode = false } = options;

  return {
    required: !isDevelopment, // Allow bypass in development
    timeout: enableStrictMode ? 3000 : 5000,
    retries: enableStrictMode ? 1 : 3,
    detectWalletConnect: true,
    supportedWallets: [
      'metamask',
      'walletconnect', 
      'coinbase',
      'injected',
      ...(isDevelopment ? ['frame' as const] : [])
    ]
  };
}

// =============================================================================
// BRIDGE PROVIDER CONFIGURATION
// =============================================================================

/**
 * Configure bridge provider (Manifold's fallback provider)
 */
function createBridgeProviderConfig(options: {
  isDevelopment?: boolean;
  apiKey?: string;
  customUrl?: string;
}): BridgeProviderConfig {
  const { isDevelopment = false, apiKey, customUrl } = options;

  const baseUrl = customUrl ?? (
    isDevelopment
      ? 'https://bridge-dev.manifold.xyz'
      : 'https://bridge.manifold.xyz'
  );

  return {
    baseUrl,
    apiKey,
    timeout: 1500,
    retries: 2,
    enabled: true,
    fallbackStrategy: 'after-timeout'
  };
}

// =============================================================================
// GLOBAL PROVIDER CONFIGURATION
// =============================================================================

/**
 * Configure global provider settings
 */
function createGlobalProviderConfig(options: {
  debugMode?: boolean;
  enableStrictMode?: boolean;
}): GlobalProviderConfig {
  const { debugMode = false, enableStrictMode = false } = options;

  return {
    defaultTimeout: enableStrictMode ? 10000 : 30000,
    maxConcurrentOps: enableStrictMode ? 3 : 5,
    strictMode: enableStrictMode,
    debugMode
  };
}

// =============================================================================
// NETWORK-SPECIFIC PROVIDER SETTINGS
// =============================================================================

/**
 * Provider timeout configurations by network
 * Faster networks get shorter timeouts
 */
export const NETWORK_PROVIDER_TIMEOUTS: Record<NetworkId, number> = {
  1: 8000,     // Ethereum - slower
  137: 5000,   // Polygon - medium
  8453: 3000,  // Base - fast L2
  42161: 3000, // Arbitrum - fast L2
  10: 3000     // Optimism - fast L2
};

/**
 * Provider retry configurations by network
 * More stable networks get fewer retries
 */
export const NETWORK_PROVIDER_RETRIES: Record<NetworkId, number> = {
  1: 3,     // Ethereum - may need more retries
  137: 2,   // Polygon - generally stable
  8453: 1,  // Base - very stable
  42161: 1, // Arbitrum - very stable
  10: 1     // Optimism - very stable
};

// =============================================================================
// PROVIDER FALLBACK STRATEGIES
// =============================================================================

/**
 * Fallback strategies by operation type
 */
export const PROVIDER_FALLBACK_STRATEGIES = {
  /**
   * Read operations (view functions, getting data)
   * Fast fallback to bridge provider
   */
  read: {
    primaryTimeout: 2000,
    fallbackStrategy: 'immediate' as const,
    maxRetries: 1
  },

  /**
   * Write operations (transactions)
   * Require primary provider, slower fallback
   */
  write: {
    primaryTimeout: 5000,
    fallbackStrategy: 'after-timeout' as const,
    maxRetries: 3
  },

  /**
   * Gas estimation
   * Can use either provider quickly
   */
  gasEstimation: {
    primaryTimeout: 1500,
    fallbackStrategy: 'immediate' as const,
    maxRetries: 2
  },

  /**
   * Block/transaction queries
   * Bridge provider often faster
   */
  query: {
    primaryTimeout: 1000,
    fallbackStrategy: 'immediate' as const,
    maxRetries: 1
  }
};

// =============================================================================
// PROVIDER HEALTH MONITORING
// =============================================================================

/**
 * Provider health check configuration
 */
export const PROVIDER_HEALTH_CONFIG = {
  /**
   * How often to check provider health (ms)
   */
  checkInterval: 60000, // 1 minute

  /**
   * Timeout for health checks (ms)
   */
  healthCheckTimeout: 2000,

  /**
   * Number of failed checks before marking unhealthy
   */
  failureThreshold: 3,

  /**
   * Number of successful checks needed to mark healthy again
   */
  recoveryThreshold: 2,

  /**
   * Whether to automatically switch to bridge when primary fails
   */
  autoFailover: true,

  /**
   * Whether to attempt recovery of failed providers
   */
  attemptRecovery: true
};

// =============================================================================
// PROVIDER SELECTION UTILITIES
// =============================================================================

/**
 * Get optimal provider configuration for a specific network
 */
export function getNetworkProviderConfig(
  networkId: NetworkId,
  baseConfig: ProviderConfig
): ProviderConfig {
  const timeout = NETWORK_PROVIDER_TIMEOUTS[networkId] ?? baseConfig.global.defaultTimeout;
  const retries = NETWORK_PROVIDER_RETRIES[networkId] ?? baseConfig.primary.retries;

  return {
    ...baseConfig,
    primary: {
      ...baseConfig.primary,
      timeout,
      retries
    },
    networks: {
      ...baseConfig.networks,
      [networkId]: {
        timeout,
        retries,
        preferBridge: networkId === 1 // Prefer bridge for Ethereum due to higher load
      }
    }
  };
}

/**
 * Determine which provider to use for an operation
 */
export function selectProvider(
  operationType: keyof typeof PROVIDER_FALLBACK_STRATEGIES,
  networkId: NetworkId,
  primaryProviderAvailable: boolean
): 'primary' | 'bridge' {
  const strategy = PROVIDER_FALLBACK_STRATEGIES[operationType];
  
  // Always prefer primary for write operations if available
  if (operationType === 'write' && primaryProviderAvailable) {
    return 'primary';
  }

  // For read operations, consider network characteristics
  if (operationType === 'read' || operationType === 'query') {
    // For Ethereum mainnet, bridge might be faster due to dedicated infrastructure
    if (networkId === 1) {
      return 'bridge';
    }
  }

  // Default to primary if available, otherwise bridge
  return primaryProviderAvailable ? 'primary' : 'bridge';
}

// =============================================================================
// DEVELOPMENT AND TESTING CONFIGURATIONS
// =============================================================================

/**
 * Provider configuration for development environment
 */
export const DEVELOPMENT_PROVIDER_CONFIG: ProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIG,
  primary: {
    ...DEFAULT_PROVIDER_CONFIG.primary,
    required: false, // Allow development without wallet
    timeout: 2000,   // Faster timeouts for dev
    retries: 1       // Fewer retries for faster feedback
  },
  bridge: {
    ...DEFAULT_PROVIDER_CONFIG.bridge,
    baseUrl: 'https://bridge-dev.manifold.xyz',
    timeout: 1000,
    retries: 1
  },
  global: {
    ...DEFAULT_PROVIDER_CONFIG.global,
    defaultTimeout: 5000,
    maxConcurrentOps: 3,
    strictMode: false,
    debugMode: true
  }
};

/**
 * Provider configuration for testing environment
 */
export const TEST_PROVIDER_CONFIG: ProviderConfig = {
  ...DEFAULT_PROVIDER_CONFIG,
  primary: {
    ...DEFAULT_PROVIDER_CONFIG.primary,
    required: false,
    timeout: 1000,
    retries: 0, // No retries in tests
    supportedWallets: ['injected'] // Simplified for tests
  },
  bridge: {
    ...DEFAULT_PROVIDER_CONFIG.bridge,
    baseUrl: 'http://localhost:3001', // Local test server
    timeout: 500,
    retries: 0,
    enabled: false // Disable bridge in tests
  },
  global: {
    ...DEFAULT_PROVIDER_CONFIG.global,
    defaultTimeout: 2000,
    maxConcurrentOps: 1,
    strictMode: true,
    debugMode: false
  }
};