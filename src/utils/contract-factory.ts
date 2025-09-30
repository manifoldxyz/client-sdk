import * as ethers from 'ethers';
import type { NetworkId, Address } from '../types/common';
import { GachaExtensionERC1155ABIv2, CreatorContractABI, ERC20ABI } from '../abis';

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
  networkId: NetworkId;
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
   * Create Creator (ERC721) contract instance
   */
  createCreatorContract(address: Address): CreatorContract {
    const provider = this.provider;

    return new ethers.Contract(address, CreatorContractABI, provider) as CreatorContract;
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
 * Estimate gas for a contract call with fallback
 */
type EstimateGasFunction = (...fnArgs: unknown[]) => Promise<ethers.BigNumber>;

export async function estimateGasWithFallback(
  contract: ethers.Contract,
  methodName: string,
  args: ReadonlyArray<unknown>,
  fallbackGas: ethers.BigNumberish = 200000,
): Promise<ethers.BigNumber> {
  try {
    const estimateMethod = contract.estimateGas[methodName as keyof typeof contract.estimateGas];
    if (typeof estimateMethod === 'function') {
      return await (estimateMethod as EstimateGasFunction)(...args);
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
    const batchResults = await Promise.all(batch.map((call) => call()));

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
