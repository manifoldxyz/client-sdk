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
import type { Money } from '../libs/money';

// =============================================================================
// CORE MANIDECK INTERFACES
// =============================================================================

/**
 * Enhanced ManiDeck On-Chain Data with gacha-specific extensions
 * Based on CONTRACT_PATTERNS.md analysis
 */
export interface ManiDeckOnchainData {
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

export type ManiDeckPublicData = Omit<ManiDeckPublicDataResponse, 'contract'> & {
  /**
   * Smart contract details for the NFT.
   */
  contract: Contract;
};

/**
 * ManiDeck Public Data - off-chain configuration
 * This is the main public data structure for ManiDeck products
 */
export interface ManiDeckPublicDataResponse {
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
  tierProbabilities: ManiDeckTierProbability[];
  /** Pool of available tokens */
  pool: ManiDeckPool[];
}

export interface ManiDeckTier {
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
 * Individual token variation within a ManiDeck
 */
export interface ManiDeckTokenVariation {
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
export interface ManiDeckTierProbability {
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
export interface ManiDeckPool {
  /** Series index */
  seriesIndex: number;
  /** Token metadata */
  metadata: Asset;
}

// =============================================================================
// MANIDECK PRODUCT INTERFACE
// =============================================================================

/**
 * ManiDeck Product interface - extends BaseProduct
 * This is the main product interface for ManiDeck products
 */
export interface ManiDeckProduct extends BaseProduct<ManiDeckPublicData> {
  /** Product type identifier */
  type: AppType.MANI_DECK;
  /** Instance data with ManiDeck-specific public data */
  data: PublicInstance<ManiDeckPublicData>;
  /** Cached on-chain data */
  onchainData?: ManiDeckOnchainData;

  // Core product methods (matching Product interface)
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<ManiDeckOnchainData>;

  // ManiDeck-specific methods
  getTokenVariations(): Promise<ManiDeckTokenVariation[]>;
  getTierProbabilities(): Promise<ManiDeckTier[]>;
  getClaimableTokens(walletAddress: Address): Promise<ManiDeckClaimableToken[]>;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export interface ManiDeckClaimableToken {
  tokenId: number;
  metadata: Asset;
  tier: string;
  isClaimable: boolean;
  proofs?: string[];
}

export interface ManiDeckInventory {
  totalSupply: number;
  totalPurchased: number; // Required by ProductInventory
}

export type ManiDeckStatus = ProductStatus;
