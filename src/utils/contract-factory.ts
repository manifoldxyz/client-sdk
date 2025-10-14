import * as ethers from 'ethers';
import type { Address } from '../types/common';
import { GachaExtensionERC1155ABIv2, ERC20ABI } from '../abis';

// =============================================================================
// CONTRACT TYPES
// =============================================================================

export type BlindMintClaimContract = ethers.Contract & {
  // Main contract methods from spec
  MINT_FEE(): Promise<ethers.BigNumber>;
  getClaim(
    creatorContractAddress: string,
    instanceId: number,
  ): Promise<{
    storageProtocol: number;
    total: number;
    totalMax: number;
    startDate: number;
    endDate: number;
    startingTokenId: ethers.BigNumber;
    tokenVariations: number;
    location: string;
    paymentReceiver: string;
    cost: ethers.BigNumber;
    erc20: string;
  }>;
  getUserMints(
    minter: string,
    creatorContractAddress: string,
    instanceId: number,
  ): Promise<{
    reservedCount: number;
    deliveredCount: number;
  }>;

  // MintReserve - the main minting method (ABIv2)
  mintReserve(
    creatorContractAddress: string,
    instanceId: number,
    mintCount: number,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;

  // Additional methods
  getClaimForToken(
    creatorContractAddress: string,
    tokenId: number,
  ): Promise<{
    instanceId: ethers.BigNumber;
    claim: {
      storageProtocol: number;
      total: number;
      totalMax: number;
      startDate: number;
      endDate: number;
      startingTokenId: ethers.BigNumber;
      tokenVariations: number;
      location: string;
      paymentReceiver: string;
      cost: ethers.BigNumber;
      erc20: string;
    };
  }>;

  tokenURI(creatorContractAddress: string, tokenId: number): Promise<string>;
};

export type CreatorContract = ethers.Contract & {
  balanceOf(owner: string): Promise<ethers.BigNumber>;
  ownerOf(tokenId: ethers.BigNumberish): Promise<string>;
  tokenURI(tokenId: ethers.BigNumberish): Promise<string>;
  totalSupply(): Promise<ethers.BigNumber>;
  contractURI(): Promise<string>;

  approve(
    to: string,
    tokenId: ethers.BigNumberish,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
  setApprovalForAll(
    operator: string,
    approved: boolean,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
  transferFrom(
    from: string,
    to: string,
    tokenId: ethers.BigNumberish,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
};

export type ERC20Contract = ethers.Contract & {
  balanceOf(owner: string): Promise<ethers.BigNumber>;
  allowance(owner: string, spender: string): Promise<ethers.BigNumber>;
  decimals(): Promise<number>;
  symbol(): Promise<string>;
  name(): Promise<string>;

  approve(
    spender: string,
    amount: ethers.BigNumberish,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
  transfer(
    to: string,
    amount: ethers.BigNumberish,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
  transferFrom(
    from: string,
    to: string,
    amount: ethers.BigNumberish,
    options?: ethers.Overrides,
  ): Promise<ethers.ContractTransaction>;
};

// =============================================================================
// CONTRACT FACTORY
// =============================================================================

export interface ContractFactoryOptions {
  provider: ethers.providers.JsonRpcProvider;
  networkId: number;
  signer?: ethers.Signer;
}

/**
 * Factory for creating contract instances with dual provider support
 */
export class ContractFactory {
  private provider: ethers.providers.JsonRpcProvider;

  constructor(options: ContractFactoryOptions) {
    this.provider = options.provider;
  }

  /**
   * Create BlindMint claim extension contract instance
   */
  createBlindMintContract(address: Address): BlindMintClaimContract {
    // Use primary provider for write operations if signer is available
    const provider = this.provider;

    const contract = new ethers.Contract(
      address,
      GachaExtensionERC1155ABIv2,
      provider,
    ) as BlindMintClaimContract;

    return contract;
  }

  /**
   * Create ERC20 token contract instance
   */
  createERC20Contract(address: Address): ERC20Contract {
    const provider = this.provider;

    return new ethers.Contract(address, ERC20ABI, provider) as ERC20Contract;
  }
}

// =============================================================================
// CONTRACT UTILITIES
// =============================================================================

/**
 * Parse contract events from transaction receipt
 */
export function parseContractEvents(
  contract: ethers.Contract,
  receipt: ethers.providers.TransactionReceipt,
): ethers.utils.LogDescription[] {
  const events: ethers.utils.LogDescription[] = [];

  receipt.logs.forEach((log) => {
    try {
      const parsedLog = contract.interface.parseLog(log);
      events.push(parsedLog);
    } catch (error) {
      // Log doesn't match this contract's interface
    }
  });

  return events;
}
