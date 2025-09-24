import type { Address, NetworkId, Cost, Money } from './common';
import type { Asset, Media, Contract, Workspace } from './product';

// =============================================================================
// CORE BLINDMINT INTERFACES
// =============================================================================

/**
 * Enhanced BlindMint On-Chain Data with gacha-specific extensions
 * Based on CONTRACT_PATTERNS.md analysis
 */
export interface BlindMintOnchainData {
  /** Total number of tokens that can be minted */
  totalSupply: number;
  /** Current number of tokens minted */
  totalMinted: number;
  /** Maximum tokens per wallet (0 = unlimited) */
  walletMax: number;
  /** Mint start timestamp */
  startDate: Date;
  /** Mint end timestamp */
  endDate: Date;
  /** Audience type for access control */
  audienceType: 'None' | 'Allowlist' | 'RedemptionCode';
  /** Cost per token */
  cost: Money;
  /** Address that receives payments */
  paymentReceiver: Address;
  /** Number of unique token variations available */
  tokenVariations: number;
  /** Starting token ID for the collection */
  startingTokenId: number;
  /** Gacha configuration for tier probabilities */
  gachaConfig?: GachaConfig;
  /** Storage protocol for metadata (IPFS, Arweave, etc.) */
  storageProtocol: StorageProtocol;
  /** Base location for metadata */
  metadataLocation: string;
}

/**
 * BlindMint Public Data - off-chain configuration
 * Extended from existing BlindMintPublicData
 */
export interface BlindMintPublicData {
  /** Display title for the mint */
  title: string;
  /** Description of the mint */
  description?: string;
  /** Network ID where the contract is deployed */
  network: number;
  /** Contract details */
  contract: Contract;
  /** Claim extension contract address */
  extensionAddress: Address;
  /** Tier probability configuration */
  tierProbabilities: BlindMintTierProbability;
  /** Pool of available tokens */
  pool: BlindMintPool[];
  /** Preview media for the collection */
  previewMedia?: Media;
  /** Collection thumbnail */
  thumbnail?: string;
  /** Optional attributes for filtering/display */
  attributes?: Record<string, unknown>;
}

/**
 * Gacha Configuration for BlindMint
 * Based on gachapon-widgets patterns
 */
export interface GachaConfig {
  /** Tier configuration with probabilities */
  tiers: GachaTier[];
  /** Whether to reveal metadata immediately after mint */
  immediateReveal: boolean;
  /** Custom reveal delay in seconds */
  revealDelay?: number;
  /** Whether duplicates are allowed */
  allowDuplicates: boolean;
  /** Floor price handling for secondary markets */
  floorPriceHandling?: FloorPriceConfig;
}

/**
 * Individual tier configuration
 */
export interface GachaTier {
  /** Tier identifier */
  id: string;
  /** Tier name (Common, Rare, Legendary, etc.) */
  name: string;
  /** Probability as percentage (0-100) */
  probability: number;
  /** Token IDs included in this tier */
  tokenIds: number[];
  /** Tier-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Individual token variation within a BlindMint
 */
export interface TokenVariation {
  /** Token ID */
  tokenId: number;
  /** Token metadata */
  metadata: Asset;
  /** Tier this token belongs to */
  tier: string;
  /** Rarity score (0-100) */
  rarityScore?: number;
  /** Current supply of this specific token */
  currentSupply?: number;
  /** Maximum supply of this specific token */
  maxSupply?: number;
}

/**
 * Tier probability configuration (legacy support)
 */
export interface BlindMintTierProbability {
  /** Tier group identifier */
  group: string;
  /** Token indices in this tier */
  indices: number[];
  /** Probability rate */
  rate: number;
}

/**
 * Pool item configuration (legacy support)
 */
export interface BlindMintPool {
  /** Pool index */
  index: number;
  /** Token metadata */
  metadata: Asset;
}

// =============================================================================
// BLINDMINT PRODUCT INTERFACE
// =============================================================================

/**
 * Enhanced BlindMint Product interface with specialized methods
 */
export interface BlindMintProduct {
  /** Product type identifier */
  type: 'blind-mint';
  /** Unique product ID */
  id: string;
  /** Instance data with BlindMint-specific public data */
  data: {
    id: string;
    creator: Workspace;
    publicData: BlindMintPublicData;
    appId: number;
    appName: string;
  };
  /** Preview data for UI display */
  previewData: {
    title?: string;
    description?: string;
    contract?: Contract;
    thumbnail?: string;
    payoutAddress?: string;
    network?: number;
    startDate?: Date;
    endDate?: Date;
    price?: Money;
  };
  /** Cached on-chain data */
  onchainData?: BlindMintOnchainData;

  // Core product methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<BlindMintStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<BlindMintInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BlindMintOnchainData>;

  // BlindMint-specific methods
  getTokenVariations(): Promise<TokenVariation[]>;
  getGachaConfig(): Promise<GachaConfig>;
  getTierProbabilities(): Promise<GachaTier[]>;
  getClaimableTokens(walletAddress: Address): Promise<ClaimableToken[]>;
  estimateMintGas(quantity: number, walletAddress: Address): Promise<bigint>;
  validateMint(params: MintValidationParams): Promise<MintValidation>;
  getFloorPrices(): Promise<FloorPriceData[]>;
  getMintHistory(walletAddress?: Address): Promise<MintHistoryItem[]>;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export type StorageProtocol = 'ipfs' | 'arweave' | 'http' | 'data';

export interface FloorPriceConfig {
  enabled: boolean;
  source: 'opensea' | 'manifold' | 'custom';
  updateInterval: number; // seconds
}

export interface ClaimableToken {
  tokenId: number;
  metadata: Asset;
  tier: string;
  isClaimable: boolean;
  proofs?: string[];
}

export interface BlindMintInventory {
  totalSupply: number;
  totalMinted: number;
  remainingSupply: number;
  tierBreakdown: TierInventory[];
  walletMinted: number;
  walletRemaining: number;
}

export interface TierInventory {
  tier: string;
  totalInTier: number;
  mintedInTier: number;
  remainingInTier: number;
}

export interface FloorPriceData {
  tokenId: number;
  floorPrice: number;
  currency: string;
  source: string;
  lastUpdated: Date;
}

export interface MintHistoryItem {
  txHash: string;
  tokenId: number;
  minter: Address;
  timestamp: Date;
  tier: string;
  gasUsed: bigint;
  gasPrice: bigint;
}

// Import shared types for consistency
export type {
  AllocationParams,
  AllocationResponse,
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  ProductMetadata,
  ProductRule,
  ProductProvenance
} from './product';

export type BlindMintStatus = 
  | 'upcoming'    // Before start date
  | 'active'      // Currently mintable
  | 'paused'      // Temporarily disabled
  | 'sold-out'    // All tokens minted
  | 'ended';      // Past end date

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface MintValidationParams {
  walletAddress: Address;
  quantity: number;
  merkleProofs?: string[];
  redemptionCode?: string;
}

export interface MintValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  estimatedGas?: bigint;
  estimatedCost?: Cost;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}