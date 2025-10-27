import type { AudienceType } from './product';
import type { Money } from './money';
import type * as ethers from 'ethers';

/**
 * Token specification enum for Edition products
 */
export enum EditionSpec {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

/**
 * Claim data structure for ERC721 Edition claims
 */
export interface ERC721ClaimData {
  total: number;
  totalMax: number;
  walletMax: number;
  startDate: number;
  endDate: number;
  storageProtocol: number;
  contractVersion: number;
  identical: boolean;
  merkleRoot: string;
  location: string;
  cost: ethers.BigNumber;
  paymentReceiver: string;
  erc20: string;
  signingAddress: string;
}

/**
 * Claim data structure for ERC1155 Edition claims
 */
export interface ERC1155ClaimData {
  total: number;
  totalMax: number;
  walletMax: number;
  startDate: number;
  endDate: number;
  storageProtocol: number;
  merkleRoot: string;
  location: string;
  tokenId: ethers.BigNumber;
  cost: ethers.BigNumber;
  paymentReceiver: string;
  erc20: string;
  signingAddress: string;
}

export type EditionClaimData = ERC721ClaimData | ERC1155ClaimData;

/**
 * Type guard to check if claim data is for ERC721
 */
export function isERC721ClaimData(data: EditionClaimData): data is ERC721ClaimData {
  return 'identical' in data;
}

/**
 * Type guard to check if claim data is for ERC1155
 */
export function isERC1155ClaimData(data: EditionClaimData): data is ERC1155ClaimData {
  return 'tokenId' in data;
}

/**
 * Edition claim contract interface for ERC721 and ERC1155
 */
export type EditionClaimContract = ethers.Contract & {
  // Platform fee methods
  MINT_FEE(): Promise<ethers.BigNumber>;
  MINT_FEE_MERKLE(): Promise<ethers.BigNumber>;

  // Get claim data
  getClaim(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
  ): Promise<EditionClaimData>;

  // Get total mints for a user
  getTotalMints(
    minter: string,
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
  ): Promise<number>;

  // Mint proxy method for executing mints
  mintProxy(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
    mintCount: number,
    mintIndices: number[],
    merkleProofs: string[][],
    mintFor: string,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;

  // Regular mint method
  mint(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
    mintIndex: number,
    merkleProof: string[],
    mintFor: string,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;

  // Batch mint method
  mintBatch(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
    mintCount: number,
    mintIndices: number[],
    merkleProofs: string[][],
    mintFor: string,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;

  // Additional utility methods
  checkMintIndex(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
    mintIndex: number,
  ): Promise<boolean>;

  checkMintIndices(
    creatorContractAddress: string,
    instanceId: number | ethers.BigNumberish,
    mintIndices: number[],
  ): Promise<boolean[]>;

  getClaimForToken(
    creatorContractAddress: string,
    tokenId: number | ethers.BigNumberish,
  ): Promise<{
    instanceId: ethers.BigNumber;
    claim: EditionClaimData;
  }>;

  tokenURI(creatorContractAddress: string, tokenId: number | ethers.BigNumberish): Promise<string>;
};

export type IERCCoreEditionOnchainData = {
  /**
   * Total supply available (null = unlimited).
   */
  totalMax: number | null;

  /**
   * Total number of tokens minted.
   */
  total: number;

  /**
   * Maximum tokens per wallet (null = unlimited).
   */
  walletMax: number | null;

  /**
   * Sale start date (null = no start date).
   */
  startDate: Date | null;

  /**
   * Sale end date (null = no end date).
   */
  endDate: Date | null;

  /**
   * Audience restriction type.
   */
  audienceType: AudienceType;

  /**
   * Cost per token.
   */
  cost: Money;

  /**
   * Platform fee per mint for standard mints.
   */
  platformFee: Money;

  /**
   * Platform fee per mint for merkle/allowlist mints.
   */
  merklePlatformFee: Money;

  signingAddress: string;

  /**
   * Address receiving payments.
   */
  paymentReceiver: string;

  /**
   * Metadata location.
   */
  location: string;

  /**
   * Merkle root for allowlist verification.
   */
  merkleRoot: string;

  /**
   * Storage protocol for metadata.
   */
  storageProtocol: number;
};

/**
 * On-chain data for 721 Edition products.
 *
 * @public
 */
export type IERC721EditionOnchainData = {
  identical: boolean;
} & IERCCoreEditionOnchainData;

/**
 * On-chain data for 1155 Edition products.
 *
 * @public
 */
export type IERC1155EditionOnchainData = {
  tokenId: string;
} & IERCCoreEditionOnchainData;

export type EditionOnchainData = IERC721EditionOnchainData | IERC1155EditionOnchainData;

/**
 * Claimable merkle information for a wallet
 */
export interface ClaimableMerkleInfo {
  /** Available mint indices */
  mintIndices: number[];
  /** Whether the address is in the allowlist */
  isInAllowlist: boolean;
  /** Corresponding merkle proofs */
  merkleProofs: string[][];
}

/**
 * Platform fee types for Edition minting
 */
export enum PlatformFeeType {
  /** Standard mint fee */
  MINT_FEE = 'MINT_FEE',
  /** Merkle mint fee (for allowlist mints) */
  MINT_FEE_MERKLE = 'MINT_FEE_MERKLE',
}
