import type { NetworkId } from './common';

// =============================================================================
// BASIC CONFIGURATION TYPES
// =============================================================================

/**
 * Simple provider configuration
 */
export interface ProviderConfig {
  /** Primary provider configuration (user's wallet) */
  primary: {
    timeout: number;
    retries: number;
  };
  /** Fallback bridge provider configuration */
  bridge?: {
    baseUrl: string;
    timeout: number;
    enabled: boolean;
  };
}

export type WalletType = 'metamask' | 'walletconnect' | 'coinbase' | 'injected';

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

/**
 * Per-network configuration settings
 */
export interface NetworkConfig {
  /** Network identifier */
  networkId: NetworkId;
  /** Chain ID for EIP-155 */
  chainId: number;
  /** Network name */
  name: string;
  /** Native currency symbol (ETH, MATIC, etc.) */
  nativeCurrency: string;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Block explorer base URL */
  explorerUrl: string;
  /** Optional canonical contracts keyed by purpose */
  contracts?: {
    erc20Tokens: {
      usdc?: string;
      usdt?: string;
      weth?: string;
    };
    claimExtensions: {
      blindMint?: string;
      gacha?: string;
    };
  };
}

// =============================================================================
// SIMPLE CONFIGURATION TYPES
// =============================================================================

/**
 * Basic gas configuration
 */
export interface GasConfig {
  /** Gas limit for mint operations */
  mintGasLimit: number;
  /** Gas limit for approval operations */
  approveGasLimit: number;
  /** Buffer percentage to add to estimates */
  bufferPercentage: number;
  /** Maximum allowed gas limit */
  maxGasLimit: number;
}

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
