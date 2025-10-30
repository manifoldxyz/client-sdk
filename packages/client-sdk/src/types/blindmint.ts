import type { PublicInstance } from '@manifoldxyz/studio-apps-client-public';
import type { Address, ProductStatus, AppType } from './common';
import type {
  BaseProduct,
  Asset,
  Media,
  AllocationParams,
  AllocationResponse,
  ProductMetadata,
  ProductRule,
  ProductProvenance,
  ProductInventory,
  Contract,
  ManifoldContract,
} from './product';
import type {
  BlindMintPayload,
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Receipt,
  TokenOrder,
} from './purchase';
import type { Money } from '../libs/money';
import type { Cost } from './money';

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
  /** Mint start timestamp */
  startDate?: Date;
  /** Mint end timestamp */
  endDate?: Date;
  /** Audience type for access control */
  audienceType: 'None' | 'Allowlist' | 'RedemptionCode';
  /** Cost per token */
  cost: Money;
  /** Address that receives payments */
  paymentReceiver: Address;
  /** Number of unique token variations available */
  tokenVariations: number;
  /** Starting token ID for the collection */
  startingTokenId: string;
}

export type BlindMintPublicData = Omit<BlindMintPublicDataResponse, 'contract'> & {
  /**
   * Smart contract details for the NFT.
   */
  contract: Contract;
};

/**
 * BlindMint Public Data - off-chain configuration
 * This is the main public data structure for BlindMint products
 */
export interface BlindMintPublicDataResponse {
  /** Display name for the mint */
  name: string;
  /** Description of the mint */
  description?: string;
  /** Network ID where the contract is deployed */
  network: number;
  /** Contract details */
  contract: ManifoldContract;
  /** Claim extension contract address */
  extensionAddress1155: {
    value: Address;
    version: number;
  };
  /** Price configuration */
  price?: {
    value: string;
    decimals: number;
    currency: string;
    erc20: string;
    symbol: string;
    name: string;
  };
  /** Tier probability configuration */
  tierProbabilities: BlindMintTierProbability[];
  /** Pool of available tokens */
  pool: BlindMintPool[];
}

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
  /** Series index */
  seriesIndex: number;
  /** Token metadata */
  metadata: Asset;
}

// =============================================================================
// BLINDMINT PRODUCT INTERFACE
// =============================================================================

/**
 * BlindMint Product interface - extends BaseProduct
 * This is the main product interface for BlindMint products
 */
export interface BlindMintProduct extends BaseProduct<BlindMintPublicData> {
  /** Product type identifier */
  type: AppType.BLIND_MINT;
  /** Instance data with BlindMint-specific public data */
  data: PublicInstance<BlindMintPublicData>;
  /** Cached on-chain data */
  onchainData?: BlindMintOnchainData;

  // Core product methods (matching Product interface)
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams<BlindMintPayload>): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Omit<Receipt, 'order'> & { order: TokenOrder }>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BlindMintOnchainData>;

  // BlindMint-specific methods
  getTokenVariations(): Promise<TokenVariation[]>;
  getTierProbabilities(): Promise<GachaTier[]>;
  getClaimableTokens(walletAddress: Address): Promise<ClaimableToken[]>;
  estimateMintGas(quantity: number, walletAddress: Address): Promise<bigint>;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

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
  totalPurchased: number; // Required by ProductInventory
}

export type BlindMintStatus = ProductStatus;

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
