import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client-public';
import type { Address, AppId, AppType } from './common';
import type { BlindMintProduct } from './blindmint';
import type { EditionProduct } from './edition';
import type { ManiDeckProduct } from './manideck';
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

// Union type for Product
export type Product = EditionProduct | BlindMintProduct | ManiDeckProduct;

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
