import type { Address, NetworkId, Money } from './common';
import type { Media, Contract, Workspace } from './product';
import type { BlindMintPublicData, TokenVariation, GachaTier } from './blindmint';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Manifold API instance data response
 * Based on DATA_FLOW_ANALYSIS.md initialization patterns
 */
export interface InstanceDataResponse {
  /** Instance identifier */
  id: string;
  /** Creator workspace information */
  creator: Workspace;
  /** Public configuration data */
  publicData: BlindMintPublicData;
  /** App ID for the BlindMint application */
  appId: number;
  /** App name identifier */
  appName: string;
  /** API response metadata */
  metadata: ApiResponseMetadata;
}

/**
 * Studio apps client preview data response
 */
export interface PreviewDataResponse {
  /** Preview title */
  title?: string;
  /** Preview description */
  description?: string;
  /** Contract information */
  contract?: Contract;
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Payout address */
  payoutAddress?: Address;
  /** Network ID */
  network?: NetworkId;
  /** Start date for minting */
  startDate?: string; // ISO string
  /** End date for minting */
  endDate?: string; // ISO string
  /** Price information */
  price?: Money;
  /** Preview media assets */
  media?: Media[];
  /** Additional preview attributes */
  attributes?: Record<string, unknown>;
  /** API response metadata */
  metadata: ApiResponseMetadata;
}

/**
 * Common API response metadata
 */
export interface ApiResponseMetadata {
  /** Response timestamp */
  timestamp: Date;
  /** API version */
  version: string;
  /** Request ID for tracing */
  requestId: string;
  /** Cache information */
  cache?: CacheMetadata;
  /** Rate limiting information */
  rateLimit?: RateLimitInfo;
}

export interface CacheMetadata {
  /** Whether response was served from cache */
  hit: boolean;
  /** Cache expiration time */
  expiresAt?: Date;
  /** Cache key */
  key?: string;
}

export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining: number;
  /** Total requests allowed per window */
  limit: number;
  /** Window reset time */
  resetAt: Date;
}

// =============================================================================
// ALLOCATION TYPES
// =============================================================================

/**
 * Mint allocation request parameters
 * Based on allowlist and merkle proof patterns
 */
export interface AllocationRequest {
  /** Recipient wallet address */
  recipientAddress: Address;
  /** Product instance ID */
  instanceId: string;
  /** Quantity requested */
  quantity: number;
  /** Optional redemption code */
  redemptionCode?: string;
  /** Network ID for validation */
  networkId: NetworkId;
  /** Additional parameters */
  params?: AllocationParams;
}

export interface AllocationParams {
  /** Include merkle proofs in response */
  includeMerkleProofs?: boolean;
  /** Include tier information */
  includeTierInfo?: boolean;
  /** Validate against current on-chain state */
  validateOnChain?: boolean;
}

/**
 * Allocation response with eligibility information
 */
export interface AllocationResponse {
  /** Whether recipient is eligible to mint */
  isEligible: boolean;
  /** Reason for ineligibility */
  reason?: string;
  /** Maximum quantity allowed */
  quantity: number;
  /** Remaining allocation for this wallet */
  remainingAllocation: number;
  /** Merkle proofs for allowlist */
  merkleProofs?: string[];
  /** Tier information if applicable */
  tierInfo?: AllocationTierInfo;
  /** Additional allocation data */
  metadata: AllocationMetadata;
}

export interface AllocationTierInfo {
  /** Available tiers for this allocation */
  availableTiers: string[];
  /** Tier-specific quantities */
  tierQuantities: Record<string, number>;
  /** Tier probabilities */
  tierProbabilities: Record<string, number>;
}

export interface AllocationMetadata {
  /** Allocation computed at timestamp */
  computedAt: Date;
  /** On-chain data used for computation */
  onChainDataVersion: string;
  /** Allowlist version used */
  allowlistVersion?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// PRICING TYPES
// =============================================================================

/**
 * Price calculation request
 */
export interface PriceCalculationRequest {
  /** Product instance ID */
  instanceId: string;
  /** Quantity to calculate for */
  quantity: number;
  /** Wallet address for personalized pricing */
  walletAddress: Address;
  /** Network ID */
  networkId: NetworkId;
  /** Include platform fees */
  includeFees?: boolean;
  /** Payment token preference */
  paymentToken?: Address;
}

/**
 * Comprehensive price calculation response
 * Based on DATA_FLOW_ANALYSIS.md price calculation patterns
 */
export interface PriceCalculation {
  /** Subtotal before fees */
  subtotal: Money;
  /** Platform fees */
  platformFee: Money;
  /** Gas estimation for transaction */
  gasEstimate: GasEstimation;
  /** Final total cost */
  total: Money;
  /** Breakdown by quantity */
  breakdown: PriceBreakdownItem[];
  /** Exchange rate information */
  exchangeRates: ExchangeRateInfo;
  /** Calculation metadata */
  metadata: PriceCalculationMetadata;
}

export interface PriceBreakdownItem {
  /** Item description */
  description: string;
  /** Unit price */
  unitPrice: Money;
  /** Quantity */
  quantity: number;
  /** Line total */
  total: Money;
  /** Item type */
  type: 'mint' | 'fee' | 'gas' | 'discount';
}

export interface GasEstimation {
  /** Estimated gas units */
  gasLimit: bigint;
  /** Gas price in wei */
  gasPrice: bigint;
  /** Gas cost in native currency */
  gasCost: Money;
  /** Gas cost in USD */
  gasCostUSD?: number;
  /** Confidence level of estimation */
  confidence: 'low' | 'medium' | 'high';
}

export interface ExchangeRateInfo {
  /** Native currency to USD rate */
  nativeToUSD: number;
  /** ERC20 token to USD rate (if applicable) */
  tokenToUSD?: number;
  /** Rate source */
  source: string;
  /** Last updated timestamp */
  lastUpdated: Date;
}

export interface PriceCalculationMetadata {
  /** Calculation timestamp */
  calculatedAt: Date;
  /** Price validity period */
  validUntil: Date;
  /** Network conditions at calculation */
  networkConditions: NetworkConditions;
  /** Whether prices include slippage protection */
  slippageProtected: boolean;
}

export interface NetworkConditions {
  /** Current gas price in gwei */
  gasPrice: number;
  /** Network congestion level */
  congestion: 'low' | 'medium' | 'high';
  /** Average block time */
  blockTime: number;
  /** Pending transactions count */
  pendingTxs: number;
}

// =============================================================================
// METADATA TYPES
// =============================================================================

/**
 * Token metadata fetching request
 */
export interface MetadataRequest {
  /** Product instance ID */
  instanceId: string;
  /** Specific token IDs to fetch */
  tokenIds?: number[];
  /** Include tier information */
  includeTierInfo?: boolean;
  /** Include rarity scores */
  includeRarity?: boolean;
  /** Metadata format preference */
  format?: MetadataFormat;
}

export type MetadataFormat = 'standard' | 'manifold' | 'opensea';

/**
 * Token metadata response
 */
export interface MetadataResponse {
  /** Token variations with metadata */
  tokens: TokenVariation[];
  /** Collection-level metadata */
  collection: CollectionMetadata;
  /** Tier configuration */
  tiers: GachaTier[];
  /** Response metadata */
  metadata: MetadataResponseInfo;
}

export interface CollectionMetadata {
  /** Collection name */
  name: string;
  /** Collection description */
  description?: string;
  /** Collection image */
  image?: string;
  /** External URL */
  externalUrl?: string;
  /** Creator information */
  creator: Workspace;
  /** Total supply */
  totalSupply: number;
  /** Collection attributes */
  attributes?: Record<string, unknown>;
}

export interface MetadataResponseInfo {
  /** Number of tokens included */
  tokenCount: number;
  /** Whether all tokens are included */
  complete: boolean;
  /** Next page cursor if pagination used */
  nextCursor?: string;
  /** Cache information */
  cached: boolean;
  /** Last updated timestamp */
  lastUpdated: Date;
}

// =============================================================================
// STATE SYNCHRONIZATION TYPES
// =============================================================================

/**
 * State sync request for real-time updates
 * Based on DATA_FLOW_ANALYSIS.md reactive patterns
 */
export interface StateSyncRequest {
  /** Product instance ID */
  instanceId: string;
  /** Wallet address to sync for */
  walletAddress: Address;
  /** Data types to sync */
  syncTypes: StateSyncType[];
  /** Sync frequency in seconds */
  interval?: number;
}

export type StateSyncType = 
  | 'onchain-data'
  | 'allocation'
  | 'pricing'
  | 'metadata'
  | 'inventory';

/**
 * State sync response with delta updates
 */
export interface StateSyncResponse {
  /** Sync timestamp */
  timestamp: Date;
  /** Updated state data */
  updates: StateSyncUpdate[];
  /** Whether full refresh is recommended */
  fullRefreshRecommended: boolean;
  /** Next sync interval recommendation */
  nextSyncInterval?: number;
}

export interface StateSyncUpdate {
  /** Type of data updated */
  type: StateSyncType;
  /** Updated data */
  data: unknown;
  /** Change type */
  changeType: 'create' | 'update' | 'delete';
  /** Fields that changed */
  changedFields?: string[];
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * API-specific error responses
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Request ID for support */
  requestId: string;
  /** Timestamp of error */
  timestamp: Date;
}

/**
 * Data validation errors
 */
export interface DataValidationError {
  /** Field that failed validation */
  field: string;
  /** Validation rule that failed */
  rule: string;
  /** Expected value or format */
  expected: string;
  /** Actual value received */
  actual: unknown;
  /** Error message */
  message: string;
}

// =============================================================================
// TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Data transformation pipeline configuration
 */
export interface TransformationConfig {
  /** Source data format */
  source: DataFormat;
  /** Target data format */
  target: DataFormat;
  /** Transformation rules */
  rules: TransformationRule[];
  /** Whether to validate after transformation */
  validate: boolean;
}

export type DataFormat = 
  | 'api-response'
  | 'contract-data'
  | 'ui-model'
  | 'cache-format';

export interface TransformationRule {
  /** Source field path */
  from: string;
  /** Target field path */
  to: string;
  /** Transformation function name */
  transform?: string;
  /** Default value if source is missing */
  default?: unknown;
  /** Whether field is required */
  required: boolean;
}

// =============================================================================
// PAGINATION TYPES
// =============================================================================

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  /** Page size (max items per page) */
  limit: number;
  /** Cursor for next page */
  cursor?: string;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Response data items */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationInfo;
  /** Response metadata */
  metadata: ApiResponseMetadata;
}

export interface PaginationInfo {
  /** Current page cursor */
  cursor?: string;
  /** Next page cursor */
  nextCursor?: string;
  /** Previous page cursor */
  previousCursor?: string;
  /** Total items available */
  totalCount?: number;
  /** Whether there are more pages */
  hasNext: boolean;
  /** Whether there are previous pages */
  hasPrevious: boolean;
}