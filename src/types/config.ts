import type { Address, NetworkId } from './common';

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

/**
 * Dual-provider configuration for BlindMint
 * Based on CONTRACT_PATTERNS.md dual-provider architecture
 */
export interface ProviderConfig {
  /** Primary provider configuration (user's wallet) */
  primary: PrimaryProviderConfig;
  /** Fallback bridge provider configuration */
  bridge: BridgeProviderConfig;
  /** Network-specific configurations */
  networks: Record<NetworkId, NetworkConfig>;
  /** Global provider settings */
  global: GlobalProviderConfig;
}

export interface PrimaryProviderConfig {
  /** Whether primary provider is required */
  required: boolean;
  /** Timeout for provider operations in ms */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** Whether to detect WalletConnect automatically */
  detectWalletConnect: boolean;
  /** Supported wallet types */
  supportedWallets: WalletType[];
}

export interface BridgeProviderConfig {
  /** Base URL for Manifold bridge provider */
  baseUrl: string;
  /** API key for bridge access */
  apiKey?: string;
  /** Timeout for bridge operations in ms */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** Whether bridge is enabled */
  enabled: boolean;
  /** Fallback strategy */
  fallbackStrategy: 'immediate' | 'after-timeout' | 'never';
}

export interface GlobalProviderConfig {
  /** Default timeout for all operations */
  defaultTimeout: number;
  /** Maximum concurrent operations */
  maxConcurrentOps: number;
  /** Whether to use strict mode (fail fast) */
  strictMode: boolean;
  /** Debug logging enabled */
  debugMode: boolean;
}

export type WalletType = 
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'injected'
  | 'frame';

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
  /** Native currency configuration */
  nativeCurrency: CurrencyConfig;
  /** RPC endpoint configuration */
  rpc: RpcConfig;
  /** Block explorer configuration */
  explorer: ExplorerConfig;
  /** Gas configuration for this network */
  gas: GasConfig;
  /** Contract addresses for this network */
  contracts: ContractAddresses;
  /** Network-specific features */
  features: NetworkFeatures;
}

export interface CurrencyConfig {
  /** Currency symbol (ETH, MATIC, etc.) */
  symbol: string;
  /** Currency name */
  name: string;
  /** Number of decimal places */
  decimals: number;
  /** Icon URL for the currency */
  iconUrl?: string;
}

export interface RpcConfig {
  /** Primary RPC endpoint */
  primary: string;
  /** Fallback RPC endpoints */
  fallbacks: string[];
  /** Request timeout in ms */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
}

export interface RateLimitConfig {
  /** Requests per second */
  requestsPerSecond: number;
  /** Burst allowance */
  burstLimit: number;
  /** Backoff strategy */
  backoffStrategy: 'linear' | 'exponential';
}

export interface ExplorerConfig {
  /** Base URL for block explorer */
  baseUrl: string;
  /** Transaction URL template */
  txUrlTemplate: string;
  /** Address URL template */
  addressUrlTemplate: string;
  /** Block URL template */
  blockUrlTemplate: string;
  /** API endpoint if available */
  apiEndpoint?: string;
}

// =============================================================================
// GAS CONFIGURATION
// =============================================================================

/**
 * Gas configuration settings per network
 * Based on CONTRACT_PATTERNS.md gas estimation patterns
 */
export interface GasConfig {
  /** Default gas limits for different operations */
  limits: GasLimits;
  /** Gas price configuration */
  pricing: GasPricingConfig;
  /** Gas estimation settings */
  estimation: GasEstimationConfig;
  /** Fee configuration */
  fees: FeeConfig;
}

export interface GasLimits {
  /** Gas limit for mint operations */
  mint: number;
  /** Gas limit for approval operations */
  approve: number;
  /** Gas limit for transfer operations */
  transfer: number;
  /** Maximum allowed gas limit */
  maximum: number;
  /** Minimum required gas limit */
  minimum: number;
}

export interface GasPricingConfig {
  /** Default gas price strategy */
  strategy: GasPriceStrategy;
  /** Gas price bounds */
  bounds: GasPriceBounds;
  /** Price update interval in seconds */
  updateInterval: number;
  /** Whether to use dynamic pricing */
  dynamic: boolean;
}

export type GasPriceStrategy = 
  | 'fast'
  | 'standard'
  | 'safe'
  | 'custom';

export interface GasPriceBounds {
  /** Minimum gas price in gwei */
  min: number;
  /** Maximum gas price in gwei */
  max: number;
  /** Default gas price in gwei */
  default: number;
}

export interface GasEstimationConfig {
  /** Buffer percentage to add to estimates */
  bufferPercentage: number;
  /** Timeout for gas estimation in ms */
  timeout: number;
  /** Whether to use simulation for estimation */
  useSimulation: boolean;
  /** Fallback gas amounts if estimation fails */
  fallbacks: Record<string, number>;
}

export interface FeeConfig {
  /** Platform fee per mint (in wei) */
  platformFeePerMint: bigint;
  /** Network-specific fee adjustments */
  networkAdjustments: Record<NetworkId, number>;
  /** Whether fees are included in displayed prices */
  includeInDisplayPrice: boolean;
}

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Caching configuration for on-chain data
 * Based on DATA_FLOW_ANALYSIS.md caching patterns
 */
export interface CacheConfig {
  /** Memory cache settings */
  memory: MemoryCacheConfig;
  /** Persistent cache settings */
  persistent: PersistentCacheConfig;
  /** Cache invalidation rules */
  invalidation: CacheInvalidationConfig;
  /** Cache key generation */
  keyGeneration: CacheKeyConfig;
  /** Instance data specific cache settings */
  instanceData?: {
    ttl: number;
  };
}

export interface MemoryCacheConfig {
  /** Maximum memory cache size in MB */
  maxSizeMB: number;
  /** Default TTL for memory cache in seconds */
  defaultTTL: number;
  /** TTL by data type */
  ttlByType: Record<CacheDataType, number>;
  /** Whether to use LRU eviction */
  useLRU: boolean;
}

export interface PersistentCacheConfig {
  /** Whether persistent cache is enabled */
  enabled: boolean;
  /** Cache storage type */
  storage: CacheStorageType;
  /** Maximum persistent cache size in MB */
  maxSizeMB: number;
  /** Cache cleanup interval in hours */
  cleanupIntervalHours: number;
}

export type CacheStorageType = 
  | 'localStorage'
  | 'indexedDB'
  | 'memory'
  | 'none';

export type CacheDataType = 
  | 'onchain-data'
  | 'metadata'
  | 'pricing'
  | 'allocation'
  | 'gas-estimates';

export interface CacheInvalidationConfig {
  /** Auto-invalidation rules */
  autoInvalidate: AutoInvalidationRule[];
  /** Manual invalidation triggers */
  manualTriggers: string[];
  /** Block-based invalidation */
  blockBasedInvalidation: boolean;
}

export interface AutoInvalidationRule {
  /** Data type to invalidate */
  dataType: CacheDataType;
  /** Trigger condition */
  trigger: InvalidationTrigger;
  /** Delay before invalidation in seconds */
  delay: number;
}

export type InvalidationTrigger = 
  | 'block-change'
  | 'transaction-complete'
  | 'time-elapsed'
  | 'external-event';

export interface CacheKeyConfig {
  /** Prefix for all cache keys */
  prefix: string;
  /** Include network ID in keys */
  includeNetworkId: boolean;
  /** Include version in keys */
  includeVersion: boolean;
  /** Custom key components */
  customComponents: string[];
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * API client configuration
 */
export interface ApiConfig {
  /** Base URLs for different API endpoints */
  endpoints: ApiEndpoints;
  /** Authentication configuration */
  auth: ApiAuthConfig;
  /** Request configuration */
  requests: ApiRequestConfig;
  /** Response handling configuration */
  responses: ApiResponseConfig;
}

export interface ApiEndpoints {
  /** Manifold API base URL */
  manifold: string;
  /** Studio apps client URL */
  studioApps: string;
  /** IPFS gateway URL */
  ipfsGateway: string;
  /** Arweave gateway URL */
  arweaveGateway: string;
  /** Custom endpoints */
  custom: Record<string, string>;
}

export interface ApiAuthConfig {
  /** API key for authenticated requests */
  apiKey?: string;
  /** Bearer token */
  bearerToken?: string;
  /** Custom headers */
  customHeaders: Record<string, string>;
  /** Authentication strategy */
  strategy: 'api-key' | 'bearer' | 'custom' | 'none';
}

export interface ApiRequestConfig {
  /** Default timeout for API requests in ms */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay strategy */
  retryDelay: RetryDelayConfig;
  /** Request interceptors */
  interceptors: RequestInterceptor[];
}

export interface RetryDelayConfig {
  /** Delay strategy */
  strategy: 'fixed' | 'linear' | 'exponential';
  /** Base delay in ms */
  baseDelay: number;
  /** Maximum delay in ms */
  maxDelay: number;
  /** Jitter factor (0-1) */
  jitter: number;
}

export interface RequestInterceptor {
  /** Interceptor name */
  name: string;
  /** Whether interceptor is enabled */
  enabled: boolean;
  /** Interceptor configuration */
  config: Record<string, unknown>;
}

export interface ApiResponseConfig {
  /** Response validation strategy */
  validation: ResponseValidationConfig;
  /** Response transformation */
  transformation: ResponseTransformationConfig;
  /** Error handling */
  errorHandling: ResponseErrorConfig;
}

export interface ResponseValidationConfig {
  /** Whether to validate response schemas */
  validateSchemas: boolean;
  /** Strict validation mode */
  strict: boolean;
  /** Custom validators */
  customValidators: string[];
}

export interface ResponseTransformationConfig {
  /** Whether to transform responses */
  enabled: boolean;
  /** Transformation rules */
  rules: TransformationRule[];
  /** Whether to preserve original data */
  preserveOriginal: boolean;
}

export interface TransformationRule {
  /** Source field path */
  from: string;
  /** Target field path */
  to: string;
  /** Transformation function */
  transform?: string;
  /** Condition for applying transformation */
  condition?: string;
}

export interface ResponseErrorConfig {
  /** Error transformation strategy */
  transformStrategy: 'preserve' | 'normalize' | 'custom';
  /** Whether to retry on specific errors */
  retryOnErrors: string[];
  /** Custom error handlers */
  customHandlers: ErrorHandler[];
}

export interface ErrorHandler {
  /** Error pattern to match */
  pattern: string;
  /** Handler function name */
  handler: string;
  /** Whether to continue processing after handling */
  continueOnError: boolean;
}

// =============================================================================
// CONTRACT ADDRESSES
// =============================================================================

/**
 * Known contract addresses by network
 */
export interface ContractAddresses {
  /** Manifold creator contract factory */
  creatorFactory?: Address;
  /** Claim extension contracts */
  claimExtensions: Record<string, Address>;
  /** Common ERC20 tokens */
  erc20Tokens: Record<string, Address>;
  /** Marketplace contracts */
  marketplaces: Record<string, Address>;
}

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Network-specific feature configuration
 */
export interface NetworkFeatures {
  /** Whether EIP-1559 is supported */
  supportsEIP1559: boolean;
  /** Whether to use flashbots for MEV protection */
  useFlashbots: boolean;
  /** Whether layer 2 scaling is available */
  isLayer2: boolean;
  /** Supported token standards */
  supportedTokens: TokenStandard[];
  /** Available bridges */
  bridges: BridgeConfig[];
}

export type TokenStandard = 'ERC20' | 'ERC721' | 'ERC1155';

export interface BridgeConfig {
  /** Bridge name */
  name: string;
  /** Bridge contract address */
  address: Address;
  /** Supported networks */
  supportedNetworks: NetworkId[];
  /** Bridge fee percentage */
  feePercentage: number;
}

// =============================================================================
// DEVELOPMENT CONFIGURATION
// =============================================================================

/**
 * Development and debugging configuration
 */
export interface DevelopmentConfig {
  /** Whether SDK is in development mode */
  isDevelopment: boolean;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Testing configuration */
  testing: TestingConfig;
  /** Mock data configuration */
  mocks: MockConfig;
}

export interface LoggingConfig {
  /** Log level */
  level: LogLevel;
  /** Whether to log to console */
  console: boolean;
  /** Whether to send logs to remote service */
  remote: boolean;
  /** Remote logging endpoint */
  endpoint?: string;
  /** Log categories to include */
  categories: LogCategory[];
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'contract'
  | 'api'
  | 'cache'
  | 'validation'
  | 'error'
  | 'performance';

export interface TestingConfig {
  /** Whether testing mode is enabled */
  enabled: boolean;
  /** Test network configurations */
  networks: Record<string, TestNetworkConfig>;
  /** Mock contract addresses */
  mockContracts: Record<string, Address>;
}

export interface TestNetworkConfig {
  /** Network name */
  name: string;
  /** RPC endpoint for testing */
  rpcUrl: string;
  /** Test accounts */
  accounts: TestAccount[];
}

export interface TestAccount {
  /** Account address */
  address: Address;
  /** Private key (for testing only) */
  privateKey: string;
  /** Account label */
  label: string;
}

export interface MockConfig {
  /** Whether to use mock data */
  enabled: boolean;
  /** Mock data sets */
  dataSets: Record<string, unknown>;
  /** Mock delay simulation */
  simulateDelay: boolean;
  /** Mock error simulation */
  simulateErrors: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default configuration values
 */
export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  primary: {
    required: true,
    timeout: 5000,
    retries: 3,
    detectWalletConnect: true,
    supportedWallets: ['metamask', 'walletconnect', 'coinbase', 'injected'],
  },
  bridge: {
    baseUrl: 'https://bridge.manifold.xyz',
    timeout: 1500,
    retries: 2,
    enabled: true,
    fallbackStrategy: 'after-timeout',
  },
  networks: {},
  global: {
    defaultTimeout: 30000,
    maxConcurrentOps: 5,
    strictMode: false,
    debugMode: false,
  },
};

export const DEFAULT_GAS_CONFIG: GasConfig = {
  limits: {
    mint: 200000,
    approve: 50000,
    transfer: 21000,
    maximum: 500000,
    minimum: 21000,
  },
  pricing: {
    strategy: 'standard',
    bounds: {
      min: 1,
      max: 100,
      default: 20,
    },
    updateInterval: 60,
    dynamic: true,
  },
  estimation: {
    bufferPercentage: 0.25,
    timeout: 1500,
    useSimulation: true,
    fallbacks: {
      mint: 200000,
      approve: 50000,
    },
  },
  fees: {
    platformFeePerMint: BigInt('690000000000000'), // 0.00069 ETH
    networkAdjustments: {},
    includeInDisplayPrice: true,
  },
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  memory: {
    maxSizeMB: 50,
    defaultTTL: 300,
    ttlByType: {
      'onchain-data': 60,
      'metadata': 3600,
      'pricing': 30,
      'allocation': 300,
      'gas-estimates': 60,
    },
    useLRU: true,
  },
  persistent: {
    enabled: true,
    storage: 'localStorage',
    maxSizeMB: 100,
    cleanupIntervalHours: 24,
  },
  invalidation: {
    autoInvalidate: [],
    manualTriggers: ['transaction-complete'],
    blockBasedInvalidation: false,
  },
  keyGeneration: {
    prefix: 'manifold-sdk',
    includeNetworkId: true,
    includeVersion: true,
    customComponents: [],
  },
};