import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client';
import type { Address, AppId, AppType, ProductStatus } from './common';
import type { Money } from '../libs/money';
import type {
  PreparedPurchase,
  PurchaseParams,
  PreparePurchaseParams,
  Order,
  EditionPayload,
  BurnRedeemPayload,
} from './purchase';
import type { BlindMintProduct } from './blindmint';

/**
 * Base interface for all Manifold product types.
 *
 * @typeParam T - The type of public data specific to each product type
 *
 * @public
 */
export interface BaseProduct<T> {
  /**
   * Unique instance ID for this product.
   */
  id: number;

  /**
   * Product type identifier (Edition, BurnRedeem, or BlindMint).
   */
  type: AppType;

  /**
   * Off-chain data including metadata, configuration, and media.
   */
  data: PublicInstance<T>;

  /**
   * Preview data for the product including title, description, and thumbnail.
   */
  previewData: InstancePreview;
}

/**
 * Extended instance data with app identification.
 *
 * @typeParam T - The type of public data for the instance
 * @internal
 */
export type InstanceData<T> = PublicInstance<T> & { appId: AppId };

/**
 * Represents a Manifold creator/workspace.
 *
 * @public
 */
export interface Creator {
  /**
   * Unique identifier of the workspace.
   */
  id: string;

  /**
   * URL-friendly slug for the workspace.
   */
  slug: string;

  /**
   * Ethereum wallet address of the workspace.
   */
  address: string;

  /**
   * Display name of the workspace.
   */
  name?: string;
}

/**
 * Public configuration data for Edition products.
 *
 * @public
 */
export interface EditionPublicData {
  /**
   * Title of the Edition product.
   */
  title: string;

  /**
   * Description of the Edition product.
   */
  description?: string;

  /**
   * Primary media asset for the Edition.
   */
  asset: Asset;

  /**
   * Network ID where the product is deployed.
   */
  network: number;

  /**
   * Smart contract details for the NFT.
   */
  contract: Contract;

  /**
   * Extension contract address for minting logic.
   */
  extensionAddress: string;
}

/**
 * Public configuration data for Burn/Redeem products.
 *
 * @public
 */
export interface BurnRedeemPublicData {
  /**
   * Asset that will be received after burning.
   */
  redeemAsset: Asset;

  /**
   * Network ID where the product is deployed.
   */
  network: number;

  /**
   * Smart contract details for the redeemed NFT.
   */
  redeemContract: Contract;

  /**
   * Extension contract address for burn/redeem logic.
   */
  extensionAddress: string;
}

// BlindMintPublicData moved to blindmint.ts

/**
 * Represents an NFT asset with metadata and media.
 *
 * @public
 */
export interface Asset {
  /**
   * Name of the asset.
   */
  name: string;

  /**
   * Description of the asset.
   */
  description?: string;

  /**
   * Additional metadata attributes (key-value pairs).
   */
  attributes?: object;

  /**
   * Media files associated with the asset.
   */
  media?: Media;
}

/**
 * Media files for an NFT asset.
 *
 * @public
 */
export interface Media {
  /**
   * Full resolution image URL.
   */
  image: string;

  /**
   * Thumbnail/preview image URL.
   */
  imagePreview?: string;

  /**
   * Animation/video URL (if applicable).
   */
  animation?: string;

  /**
   * Animation preview URL.
   */
  animationPreview?: string;
}

/**
 * Smart contract information for an NFT.
 *
 * @public
 */
export interface Contract {
  /**
   * Contract identifier.
   */
  id: number;

  /**
   * Contract name (e.g., "Cool Cats").
   */
  name: string;

  /**
   * Token symbol (e.g., "COOL").
   */
  symbol: string;

  /**
   * Ethereum contract address.
   */
  contractAddress: string;

  /**
   * Network ID where contract is deployed.
   */
  networkId: number;

  /**
   * Token specification: 'erc721' or 'erc1155'.
   */
  spec: string;
}

/**
 * External explorer links for a contract or token.
 *
 * @public
 */
export interface Explorer {
  /**
   * Etherscan explorer URL.
   */
  etherscanUrl: string;

  /**
   * Manifold gallery URL.
   */
  manifoldUrl?: string;

  /**
   * OpenSea marketplace URL.
   */
  openseaUrl?: string;
}

/**
 * Edition product type for standard NFT mints.
 *
 * Edition products allow creators to sell fixed or open edition NFTs
 * with optional allowlists, redemption codes, and pricing tiers.
 *
 * @public
 */
export interface EditionProduct extends BaseProduct<EditionPublicData> {
  /**
   * Product type identifier.
   */
  type: AppType.EDITION;

  /**
   * Off-chain product data.
   */
  data: PublicInstance<EditionPublicData>;

  /**
   * On-chain data (pricing, supply, etc.). Populated after calling fetchOnchainData().
   */
  onchainData?: EditionOnchainData;

  /**
   * Check allocation eligibility for a wallet address.
   * @param params - Parameters including recipient address
   * @returns Allocation details including eligibility and quantity
   */
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;

  /**
   * Prepare a purchase transaction with eligibility check and cost calculation.
   * @param params - Purchase parameters including address and quantity
   * @returns Prepared transaction details with cost breakdown
   */
  preparePurchase(params: PreparePurchaseParams<EditionPayload>): Promise<PreparedPurchase>;

  /**
   * Execute a purchase transaction.
   * @param params - Purchase execution parameters
   * @returns Order details with transaction receipts
   */
  purchase(params: PurchaseParams): Promise<Order>;

  /**
   * Get current product status (active, paused, completed, upcoming).
   * @returns Current product status
   */
  getStatus(): Promise<ProductStatus>;

  /**
   * Get preview media for the product.
   * @returns Media URLs for preview
   */
  getPreviewMedia(): Promise<Media | undefined>;

  /**
   * Get product metadata (name, description).
   * @returns Product metadata
   */
  getMetadata(): Promise<ProductMetadata>;

  /**
   * Get inventory information (supply, minted count).
   * @returns Inventory details
   */
  getInventory(): Promise<ProductInventory>;

  /**
   * Get product rules (dates, limits, restrictions).
   * @returns Product rule configuration
   */
  getRules(): Promise<ProductRule>;

  /**
   * Get provenance information (creator, contract details).
   * @returns Provenance details
   */
  getProvenance(): Promise<ProductProvenance>;

  /**
   * Fetch and populate on-chain data.
   * @returns On-chain data including pricing and supply
   */
  fetchOnchainData(): Promise<EditionOnchainData>;
}

export interface BurnRedeemProduct extends BaseProduct<BurnRedeemPublicData> {
  type: AppType.BURN_REDEEM;
  data: PublicInstance<BurnRedeemPublicData> & { publicData: BurnRedeemPublicData };

  onchainData?: BurnRedeemOnchainData;

  // Methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams<BurnRedeemPayload>): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BurnRedeemOnchainData>;
}

// Audience type enum
export type AudienceType = 'None' | 'Allowlist' | 'RedemptionCode';

/**
 * On-chain data for Edition products.
 *
 * @public
 */
export interface EditionOnchainData {
  /**
   * Total supply available (0 = unlimited).
   */
  totalSupply: number;

  /**
   * Total number of tokens minted.
   */
  totalMinted: number;

  /**
   * Maximum tokens per wallet.
   */
  walletMax: number;

  /**
   * Sale start date.
   */
  startDate: Date;

  /**
   * Sale end date.
   */
  endDate: Date;

  /**
   * Audience restriction type.
   */
  audienceType: AudienceType;

  /**
   * Cost per token.
   */
  cost: Money;

  /**
   * Address receiving payments.
   */
  paymentReceiver: string;
}

export interface BurnRedeemOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  audienceType: AudienceType;
  cost: Money;
  paymentReceiver: string;
  burnSet: BurnSetData;
}

// Additional types from documentation
export interface ProductMetadata {
  name: string;
  description?: string;
}

export interface ProductInventory {
  totalSupply: number;
  totalPurchased: number;
}

export type AudienceRestriction = 'allowlist' | 'none' | 'redemption-codes';

export interface ProductRule {
  startDate?: Date;
  endDate?: Date;
  audienceRestriction: AudienceRestriction;
  maxPerWallet?: number;
}

export interface ProductProvenance {
  creator: Creator;
  contract?: Contract;
  token?: Token;
  networkId?: number;
}

export interface Token {
  networkId: number;
  contract: Contract;
  tokenId: string;
  explorer: Explorer;
}

// Money type is now exported from common.ts to avoid circular dependencies

// Parameter types
export interface AllocationParams {
  recipientAddress: Address;
}

export interface AllocationResponse {
  isEligible: boolean;
  reason?: string;
  quantity: number;
}

// Burn/Redeem specific types
export interface BurnSetData {
  items: TokenItemRequirement[];
  requiredCount: number;
}

export interface TokenItemRequirement {
  quantity: number;
  burnSpec: 'manifold' | 'openZeppelin' | 'none';
  tokenSpec: 'erc721' | 'erc1155';
  tokenIds?: string[];
  maxTokenId?: string;
  minTokenId?: string;
  contractAddress: string;
  merkleRoot?: string;
  validationType: 'contract' | 'range' | 'merkleTree' | 'any';
}

// BlindMint specific types moved to blindmint.ts

// Union type for Product
export type Product = EditionProduct | BurnRedeemProduct | BlindMintProduct;

// Export from blindmint.ts
export type { BlindMintPublicData, BlindMintOnchainData, BlindMintProduct } from './blindmint';

// PreviewData type (from InstancePreview)
export type PreviewData = InstancePreview;

// Re-export purchase-related types
export type {
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  TransactionStep,
  TransactionReceipt,
} from './purchase';
