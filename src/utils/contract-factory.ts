import * as ethers from 'ethers';
import type { DualProvider } from './provider-factory';
import type { NetworkId, Address } from '../types/common';
import { getNetworkConfig } from '../config/networks';

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
  // Read functions
  'function totalSupply() external view returns (uint256)',
  'function totalMinted() external view returns (uint256)',
  'function walletMax() external view returns (uint256)',
  'function startDate() external view returns (uint256)',
  'function endDate() external view returns (uint256)',
  'function cost() external view returns (uint256)',
  'function paymentReceiver() external view returns (address)',
  'function tokenVariations() external view returns (uint256)',
  'function startingTokenId() external view returns (uint256)',
  'function metadataLocation() external view returns (string)',
  'function storageProtocol() external view returns (uint8)',
  
  // Claim functions
  'function mint(address to, uint256 count) external payable',
  'function mintBatch(address to, uint256[] calldata tokenIds) external payable',
  'function claim(bytes32[] calldata proof, address to, uint256 count) external payable',
  
  // Events
  'event Mint(address indexed to, uint256[] tokenIds)',
  'event Claim(address indexed to, uint256[] tokenIds, bytes32[] proof)'
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
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
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
  'function name() external view returns (string)'
] as const;

// =============================================================================
// CONTRACT TYPES
// =============================================================================

export type BlindMintClaimContract = ethers.Contract & {
  totalSupply(): Promise<ethers.BigNumber>;
  totalMinted(): Promise<ethers.BigNumber>;
  walletMax(): Promise<ethers.BigNumber>;
  startDate(): Promise<ethers.BigNumber>;
  endDate(): Promise<ethers.BigNumber>;
  cost(): Promise<ethers.BigNumber>;
  paymentReceiver(): Promise<string>;
  tokenVariations(): Promise<ethers.BigNumber>;
  startingTokenId(): Promise<ethers.BigNumber>;
  metadataLocation(): Promise<string>;
  storageProtocol(): Promise<number>;
  
  mint(to: string, count: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  mintBatch(to: string, tokenIds: ethers.BigNumberish[], options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  claim(proof: string[], to: string, count: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
};

export type CreatorContract = ethers.Contract & {
  balanceOf(owner: string): Promise<ethers.BigNumber>;
  ownerOf(tokenId: ethers.BigNumberish): Promise<string>;
  tokenURI(tokenId: ethers.BigNumberish): Promise<string>;
  totalSupply(): Promise<ethers.BigNumber>;
  contractURI(): Promise<string>;
  
  approve(to: string, tokenId: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  setApprovalForAll(operator: string, approved: boolean, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  transferFrom(from: string, to: string, tokenId: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
};

export type ERC20Contract = ethers.Contract & {
  balanceOf(owner: string): Promise<ethers.BigNumber>;
  allowance(owner: string, spender: string): Promise<ethers.BigNumber>;
  decimals(): Promise<number>;
  symbol(): Promise<string>;
  name(): Promise<string>;
  
  approve(spender: string, amount: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  transfer(to: string, amount: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
  transferFrom(from: string, to: string, amount: ethers.BigNumberish, options?: ethers.Overrides): Promise<ethers.ContractTransaction>;
};

// =============================================================================
// CONTRACT FACTORY
// =============================================================================

export interface ContractFactoryOptions {
  provider: DualProvider;
  networkId: NetworkId;
  signer?: ethers.Signer;
  enableDebug?: boolean;
}

/**
 * Factory for creating contract instances with dual provider support
 */
export class ContractFactory {
  private provider: DualProvider;
  private networkId: NetworkId;
  private signer?: ethers.Signer;
  private enableDebug: boolean;
  
  constructor(options: ContractFactoryOptions) {
    this.provider = options.provider;
    this.networkId = options.networkId;
    this.signer = options.signer;
    this.enableDebug = options.enableDebug ?? false;
  }

  /**
   * Create BlindMint claim extension contract instance
   */
  createBlindMintContract(address: Address): BlindMintClaimContract {
    if (this.enableDebug) {
      console.log(`Creating BlindMint contract at ${address} on network ${this.networkId}`);
    }

    // Use primary provider for write operations if signer is available
    const providerOrSigner = this.signer || this.provider.current;
    
    return new ethers.Contract(
      address,
      BLINDMINT_CLAIM_ABI,
      providerOrSigner
    ) as BlindMintClaimContract;
  }

  /**
   * Create Creator (ERC721) contract instance
   */
  createCreatorContract(address: Address): CreatorContract {
    if (this.enableDebug) {
      console.log(`Creating Creator contract at ${address} on network ${this.networkId}`);
    }

    const providerOrSigner = this.signer || this.provider.current;
    
    return new ethers.Contract(
      address,
      CREATOR_CONTRACT_ABI,
      providerOrSigner
    ) as CreatorContract;
  }

  /**
   * Create ERC20 token contract instance
   */
  createERC20Contract(address: Address): ERC20Contract {
    if (this.enableDebug) {
      console.log(`Creating ERC20 contract at ${address} on network ${this.networkId}`);
    }

    const providerOrSigner = this.signer || this.provider.current;
    
    return new ethers.Contract(
      address,
      ERC20_ABI,
      providerOrSigner
    ) as ERC20Contract;
  }

  /**
   * Get well-known contract instances for the current network
   */
  getWellKnownContracts() {
    const networkConfig = getNetworkConfig(this.networkId);
    const contracts = networkConfig.contracts;

    return {
      // ERC20 tokens
      usdc: contracts.erc20Tokens.usdc ? this.createERC20Contract(contracts.erc20Tokens.usdc) : null,
      usdt: contracts.erc20Tokens.usdt ? this.createERC20Contract(contracts.erc20Tokens.usdt) : null,
      weth: contracts.erc20Tokens.weth ? this.createERC20Contract(contracts.erc20Tokens.weth) : null,

      // Claim extensions
      blindMint: contracts.claimExtensions.blindMint ? this.createBlindMintContract(contracts.claimExtensions.blindMint) : null,
      gacha: contracts.claimExtensions.gacha ? this.createBlindMintContract(contracts.claimExtensions.gacha) : null
    };
  }

  /**
   * Update the signer (when user connects wallet)
   */
  setSigner(signer: ethers.Signer) {
    this.signer = signer;
    if (this.enableDebug) {
      console.log('Updated contract factory signer');
    }
  }

  /**
   * Remove the signer (when user disconnects wallet)
   */
  removeSigner() {
    this.signer = undefined;
    if (this.enableDebug) {
      console.log('Removed contract factory signer');
    }
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
  fallbackGas: ethers.BigNumberish = 200000
): Promise<ethers.BigNumber> {
  try {
    return await contract.estimateGas[methodName](...args);
  } catch (error) {
    console.warn(`Gas estimation failed for ${methodName}, using fallback:`, error);
    return ethers.BigNumber.from(fallbackGas);
  }
}

/**
 * Call contract method with retry logic
 */
export async function callWithRetry<T>(
  contractCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await contractCall();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
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
  maxConcurrent: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (call, index) => {
        try {
          return await call();
        } catch (error) {
          console.warn(`Batch call ${i + index} failed:`, error);
          throw error;
        }
      })
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
  expectedMethods: string[]
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
        missingMethods: expectedMethods
      };
    }

    // Create temporary contract to test method calls
    const tempContract = new ethers.Contract(address, [
      'function supportsInterface(bytes4 interfaceId) external view returns (bool)'
    ], provider);

    const supportedMethods: string[] = [];
    const missingMethods: string[] = [];

    // Test each expected method
    for (const method of expectedMethods) {
      try {
        // Try to call the method with empty parameters
        await tempContract.callStatic[method]?.();
        supportedMethods.push(method);
      } catch (error) {
        // Method might not exist or might require parameters
        missingMethods.push(method);
      }
    }

    return {
      isValid: missingMethods.length === 0,
      hasCode: true,
      supportedMethods,
      missingMethods
    };

  } catch (error) {
    return {
      isValid: false,
      hasCode: false,
      supportedMethods: [],
      missingMethods: expectedMethods
    };
  }
}

/**
 * Parse contract events from transaction receipt
 */
export function parseContractEvents(
  contract: ethers.Contract,
  receipt: ethers.providers.TransactionReceipt
): ethers.utils.LogDescription[] {
  const events: ethers.utils.LogDescription[] = [];
  
  receipt.logs.forEach(log => {
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

/**
 * Create a mock contract for testing
 */
export function createMockContract(
  address: Address,
  abi: readonly string[],
  mockImplementation: Record<string, any> = {}
): ethers.Contract {
  // Create a mock provider that returns predefined values
  const mockProvider = {
    call: async (transaction: any) => {
      const method = transaction.data?.slice(0, 10); // Function selector
      return mockImplementation[method] || '0x';
    },
    
    estimateGas: async () => ethers.BigNumber.from('21000'),
    
    getNetwork: async () => ({ chainId: 1, name: 'homestead' })
  } as any;

  return new ethers.Contract(address, abi, mockProvider);
}

/**
 * Contract factory for testing
 */
export function createTestContractFactory(
  networkId: NetworkId,
  mockContracts: Record<Address, any> = {}
): ContractFactory {
  const mockProvider = {
    current: {
      call: async (transaction: any) => {
        const address = transaction.to;
        const mockContract = mockContracts[address];
        
        if (mockContract) {
          const method = transaction.data?.slice(0, 10);
          return mockContract[method] || '0x';
        }
        
        return '0x';
      },
      
      estimateGas: async () => ethers.BigNumber.from('21000')
    }
  } as any;

  return new ContractFactory({
    provider: mockProvider,
    networkId,
    enableDebug: false
  });
}