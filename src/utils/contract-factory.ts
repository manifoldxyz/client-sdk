import * as ethers from 'ethers';
import type { NetworkId, Address } from '../types/common';
import { getNetworkConfig } from '../config/networks';

type DualProvider = {
  current: ethers.providers.Provider;
  primary?: ethers.providers.Provider;
  bridge?: ethers.providers.Provider;
};

/**
 * Contract factory for BlindMint operations
 * Based on CONTRACT_PATTERNS.md analysis and ethers v5 patterns
 */

// =============================================================================
// CONTRACT INTERFACES AND ABIS
// =============================================================================

/**
 * BlindMint claim extension ABI (simplified)
 * Based on gachapon-widgets contract analysis
 */
export const BLINDMINT_CLAIM_ABI = [
  // Read functions from ABIv2
  'function MINT_FEE() external view returns (uint256)',
  'function getClaim(address creatorContractAddress, uint256 instanceId) external view returns (tuple(uint8 storageProtocol, uint32 total, uint32 totalMax, uint48 startDate, uint48 endDate, uint80 startingTokenId, uint8 tokenVariations, string location, address paymentReceiver, uint96 cost, address erc20))',
  'function getUserMints(address minter, address creatorContractAddress, uint256 instanceId) external view returns (tuple(uint32 reservedCount, uint32 deliveredCount))',

  // Additional read functions
  'function getClaimForToken(address creatorContractAddress, uint256 tokenId) external view returns (uint256 instanceId, tuple(uint8 storageProtocol, uint32 total, uint32 totalMax, uint48 startDate, uint48 endDate, uint80 startingTokenId, uint8 tokenVariations, string location, address paymentReceiver, uint96 cost, address erc20))',
  'function tokenURI(address creatorContractAddress, uint256 tokenId) external view returns (string)',

  // Mint functions from ABIv2
  'function mintReserve(address creatorContractAddress, uint256 instanceId, uint32 mintCount) external payable',
  // Admin functions
  'function initializeClaim(address creatorContractAddress, uint256 instanceId, tuple(uint8 storageProtocol, uint32 totalMax, uint48 startDate, uint48 endDate, uint8 tokenVariations, string location, address paymentReceiver, uint96 cost, address erc20) claimParameters) external payable',
  'function updateClaim(address creatorContractAddress, uint256 instanceId, tuple(uint8 storageProtocol, address paymentReceiver, uint32 totalMax, uint48 startDate, uint48 endDate, uint96 cost, string location) updateClaimParameters) external',

  // Events
  'event SerendipityMintReserved(address indexed creatorContract, uint256 indexed instanceId, address indexed collector, uint32 mintCount)',
  'event SerendipityClaimInitialized(address indexed creatorContract, uint256 indexed instanceId, address initializer)',
  'event SerendipityClaimUpdated(address indexed creatorContract, uint256 indexed instanceId)',
] as const;

/**
 * ERC721 Creator Contract ABI (simplified)
 */
export const CREATOR_CONTRACT_ABI = [
  // Standard ERC721 functions
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId) external',

  // Creator-specific functions
  'function totalSupply() external view returns (uint256)',
  'function contractURI() external view returns (string)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
] as const;

/**
 * ERC20 Token ABI (for payment tokens)
 */
export const ERC20_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
] as const;

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
  provider: DualProvider;
  networkId: NetworkId;
  signer?: ethers.Signer;
}

/**
 * Factory for creating contract instances with dual provider support
 */
export class ContractFactory {
  private provider: DualProvider;
  private networkId: NetworkId;
  private signer?: ethers.Signer;

  constructor(options: ContractFactoryOptions) {
    this.provider = options.provider;
    this.networkId = options.networkId;
    this.signer = options.signer;
  }

  /**
   * Create BlindMint claim extension contract instance
   */
  createBlindMintContract(address: Address): BlindMintClaimContract {
    // Use primary provider for write operations if signer is available
    const providerOrSigner = this.signer || this.provider.current;

    const contract = new ethers.Contract(
      address,
      BLINDMINT_CLAIM_ABI,
      providerOrSigner,
    ) as BlindMintClaimContract;

    // Add getTotalMints method implementation using getUserMints
    contract.getTotalMints = async (
      minter: string,
      creatorContractAddress: string,
      instanceId: number,
    ): Promise<number> => {
      try {
        const userMints = await contract.getUserMints(
          minter,
          creatorContractAddress,
          instanceId,
        );
        // Return sum of reserved and delivered counts
        return userMints.reservedCount + userMints.deliveredCount;
      } catch (error) {
        // If getUserMints fails, return 0 (no mints found)
        console.warn('Failed to get user mints:', error);
        return 0;
      }
    };

    return contract;
  }

  /**
   * Create Creator (ERC721) contract instance
   */
  createCreatorContract(address: Address): CreatorContract {
    const providerOrSigner = this.signer || this.provider.current;

    return new ethers.Contract(address, CREATOR_CONTRACT_ABI, providerOrSigner) as CreatorContract;
  }

  /**
   * Create ERC20 token contract instance
   */
  createERC20Contract(address: Address): ERC20Contract {
    const providerOrSigner = this.signer || this.provider.current;

    return new ethers.Contract(address, ERC20_ABI, providerOrSigner) as ERC20Contract;
  }

  /**
   * Get well-known contract instances for the current network
   */
  getWellKnownContracts() {
    const networkConfig = getNetworkConfig(this.networkId);
    const contracts = networkConfig.contracts;

    return {
      // ERC20 tokens
      usdc: contracts.erc20Tokens.usdc
        ? this.createERC20Contract(contracts.erc20Tokens.usdc)
        : null,
      usdt: contracts.erc20Tokens.usdt
        ? this.createERC20Contract(contracts.erc20Tokens.usdt)
        : null,
      weth: contracts.erc20Tokens.weth
        ? this.createERC20Contract(contracts.erc20Tokens.weth)
        : null,

      // Claim extensions
      blindMint: contracts.claimExtensions.blindMint
        ? this.createBlindMintContract(contracts.claimExtensions.blindMint)
        : null,
      gacha: contracts.claimExtensions.gacha
        ? this.createBlindMintContract(contracts.claimExtensions.gacha)
        : null,
    };
  }

  /**
   * Update the signer (when user connects wallet)
   */
  setSigner(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Remove the signer (when user disconnects wallet)
   */
  removeSigner() {
    this.signer = undefined;
  }
}

// =============================================================================
// CONTRACT UTILITIES
// =============================================================================

/**
 * Estimate gas for a contract call with fallback
 */
export async function estimateGasWithFallback(
  contract: ethers.Contract,
  methodName: string,
  args: any[],
  fallbackGas: ethers.BigNumberish = 200000,
): Promise<ethers.BigNumber> {
  try {
    const estimateMethod = contract.estimateGas[methodName];
    if (estimateMethod) {
      return await estimateMethod(...args);
    }
    return ethers.BigNumber.from(fallbackGas);
  } catch (error) {
    return ethers.BigNumber.from(fallbackGas);
  }
}

/**
 * Call contract method with retry logic
 */
export async function callWithRetry<T>(
  contractCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await contractCall();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
}

/**
 * Batch multiple contract calls efficiently
 */
export async function batchContractCalls<T>(
  calls: Array<() => Promise<T>>,
  maxConcurrent: number = 5,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (call) => {
        try {
          return await call();
        } catch (error) {
          throw error;
        }
      }),
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Validate contract address and ABI compatibility
 */
export async function validateContract(
  provider: ethers.providers.Provider,
  address: Address,
  expectedMethods: string[],
): Promise<{
  isValid: boolean;
  hasCode: boolean;
  supportedMethods: string[];
  missingMethods: string[];
}> {
  try {
    // Check if contract has code
    const code = await provider.getCode(address);
    const hasCode = code !== '0x';

    if (!hasCode) {
      return {
        isValid: false,
        hasCode: false,
        supportedMethods: [],
        missingMethods: expectedMethods,
      };
    }

    // Create temporary contract to test method calls
    const tempContract = new ethers.Contract(
      address,
      ['function supportsInterface(bytes4 interfaceId) external view returns (bool)'],
      provider,
    );

    const supportedMethods: string[] = [];
    const missingMethods: string[] = [];

    // Test each expected method
    for (const method of expectedMethods) {
      try {
        // Try to call the method with empty parameters
        const staticMethod = tempContract.callStatic[method];
        if (staticMethod) {
          await staticMethod();
          supportedMethods.push(method);
        } else {
          missingMethods.push(method);
        }
      } catch (error) {
        // Method might not exist or might require parameters
        missingMethods.push(method);
      }
    }

    return {
      isValid: missingMethods.length === 0,
      hasCode: true,
      supportedMethods,
      missingMethods,
    };
  } catch (error) {
    return {
      isValid: false,
      hasCode: false,
      supportedMethods: [],
      missingMethods: expectedMethods,
    };
  }
}

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

// =============================================================================
// DEVELOPMENT AND TESTING UTILITIES
// =============================================================================
