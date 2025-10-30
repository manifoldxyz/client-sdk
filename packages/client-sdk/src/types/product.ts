import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client-public';
import type { Address, AppId, AppType, ProductStatus } from './common';
import type {
  PreparedPurchase,
  PurchaseParams,
  PreparePurchaseParams,
  EditionPayload,
  Receipt,
  TokenOrder,
} from './purchase';
import type { BlindMintProduct } from './blindmint';
import type { EditionOnchainData } from './edition';
import type { ContractSpec } from './contracts';

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

export type EditionPublicData = Omit<EditionPublicDataResponse, 'contract'> & {
  /**
   * Smart contract details for the NFT.
   */
  contract: Contract;
};

/**
 * Public configuration data for Edition products.
 *
 * @public
 */
export type EditionPublicDataResponse = {
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
  contract: ManifoldContract;

  extensionAddress721: {
    value: string;
    version: number;
  };
  extensionAddress1155: {
    value: string;
    version: number;
  };

  /**
   * Allowlist configuration for the Edition.
   */
  instanceAllowlist?: {
    merkleTreeId?: number;
  };
};

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

  image?: string;
  image_url?: string;
  image_preview?: string;
  animation?: string;
  animation_preview: string;
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
  image?: string;

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

export interface ManifoldContract {
  /**
   * Manifold Contract ID.
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
  spec: ContractSpec;
}

/**
 * Smart contract information for an NFT.
 *
 * @public
 */
export interface Contract {
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
  spec: ContractSpec;

  /**
   * Explorer links for the contract.
   */
  explorer: Explorer;
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
   * @returns Receipt details including transaction and minted token information
   */
  purchase(params: PurchaseParams): Promise<Omit<Receipt, 'order'> & { order: TokenOrder }>;

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

// Audience type enum
export type AudienceType = 'None' | 'Allowlist' | 'RedemptionCode';

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
  explorerUrl: Explorer;
  media: Media;
}

// Money type is now exported from common.ts to avoid circular dependencies

// Parameter types
export interface AllocationParams {
  recipientAddress: Address;
}

export interface AllocationResponse {
  isEligible: boolean;
  reason?: string;
  quantity: number | null; // null indicates no limit
}

// BlindMint specific types moved to blindmint.ts

// Union type for Product
export type Product = EditionProduct | BlindMintProduct;

// PreviewData type (from InstancePreview)
export type PreviewData = InstancePreview;

/**
 * Storage protocol for NFT metadata
 */
export enum StorageProtocol {
  INVALID = 0,
  NONE = 1,
  ARWEAVE = 2,
  IPFS = 3,
}
