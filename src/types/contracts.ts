import { BigNumber } from 'ethers';
import type { ContractTransaction, ContractReceipt } from 'ethers';
import type { Address, NetworkId } from './common';

// =============================================================================
// CONTRACT INTERFACES
// =============================================================================

/**
 * Claim Extension Contract Interface
 * Based on CONTRACT_PATTERNS.md dual-provider architecture
 */
export interface ClaimExtensionContract {
  /** Network ID where contract is deployed */
  readonly networkId: NetworkId;
  /** Contract address */
  readonly contractAddress: Address;
  /** Creator contract address */
  readonly creatorContractAddress: Address;
  /** Claim index within the creator contract */
  readonly claimIndex: number;

  // Read operations with fallback support
  getClaim(spec: ClaimType): Promise<OnChainClaimData>;
  getClaimForToken(tokenId: number): Promise<OnChainClaimData>;
  getTotalMinted(): Promise<number>;
  getWalletMinted(walletAddress: Address): Promise<number>;
  getClaimState(): Promise<ClaimState>;

  // Write operations
  mint(quantity: number, paymentAmount: BigNumber, walletAddress: Address): Promise<TransactionResponse>;
  mintWithProofs(
    quantity: number,
    paymentAmount: BigNumber,
    walletAddress: Address,
    merkleProofs: string[]
  ): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasMint(walletAddress: Address, quantity: number, paymentAmount: BigNumber): Promise<BigNumber>;
  estimateGasMintWithProofs(
    walletAddress: Address,
    quantity: number,
    paymentAmount: BigNumber,
    merkleProofs: string[]
  ): Promise<BigNumber>;

  // Utility methods
  isValidNetwork(): boolean;
  switchToCorrectNetwork(): Promise<void>;
}

/**
 * ERC20 Contract Interface for payment tokens
 */
export interface ERC20Contract {
  /** Network ID where contract is deployed */
  readonly networkId: NetworkId;
  /** ERC20 contract address */
  readonly contractAddress: Address;

  // Read operations
  getBalance(walletAddress: Address): Promise<BigNumber>;
  getAllowance(owner: Address, spender: Address): Promise<BigNumber>;
  getERC20Symbol(): Promise<string>;
  getERC20Decimals(): Promise<number>;
  getERC20Name(): Promise<string>;
  getTotalSupply(): Promise<BigNumber>;

  // Write operations
  approve(spender: Address, amount: BigNumber): Promise<TransactionResponse>;
  transfer(to: Address, amount: BigNumber): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasApprove(spender: Address, amount: BigNumber): Promise<BigNumber>;
  estimateGasTransfer(to: Address, amount: BigNumber): Promise<BigNumber>;
}

// =============================================================================
// CONTRACT CALL CONFIGURATION
// =============================================================================

/**
 * Options for contract method calls
 * Based on timeout and fallback patterns from CONTRACT_PATTERNS.md
 */
export interface ContractCallOptions {
  /** Gas limit for the transaction */
  gasLimit?: BigNumber;
  /** Gas price in wei */
  gasPrice?: BigNumber;
  /** Value to send with transaction (for payable methods) */
  value?: BigNumber;
  /** Use bridge provider instead of wallet provider */
  useBridge?: boolean;
  /** Use unchecked mode (for WalletConnect compatibility) */
  unchecked?: boolean;
  /** Timeout in milliseconds (default: 1500) */
  timeout?: number;
  /** Number of retry attempts on failure */
  retries?: number;
}

/**
 * Gas configuration settings
 */
export interface GasConfig {
  /** Base gas limit for mint operations */
  baseMintGas: number;
  /** Gas buffer as percentage (e.g., 0.25 for 25%) */
  bufferPercentage: number;
  /** Maximum gas limit to prevent runaway transactions */
  maxGasLimit: BigNumber;
  /** Minimum gas limit for simple operations */
  minGasLimit: BigNumber;
  /** Gas estimation timeout in milliseconds */
  estimationTimeout: number;
}

/**
 * Provider configuration for dual-provider setup
 */
export interface ProviderConfig {
  /** Primary provider (user's wallet) */
  primary: {
    available: boolean;
    chainId?: number;
    address?: Address;
  };
  /** Fallback bridge provider */
  bridge: {
    endpoint: string;
    timeout: number;
    retries: number;
  };
  /** Network-specific RPC endpoints */
  networks: Record<NetworkId, NetworkProviderConfig>;
}

export interface NetworkProviderConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Chain ID */
  chainId: number;
  /** Native currency symbol */
  nativeCurrency: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Gas estimation multiplier for this network */
  gasMultiplier: number;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/**
 * Enhanced transaction response with SDK-specific metadata
 */
export interface TransactionResponse extends ContractTransaction {
  /** SDK-generated transaction ID for tracking */
  sdkTxId: string;
  /** Estimated gas used */
  estimatedGas: BigNumber;
  /** Provider used (wallet or bridge) */
  provider: 'wallet' | 'bridge';
  /** Transaction type for categorization */
  type: TransactionType;
  /** Additional context data */
  context?: TransactionContext;
}

/**
 * Enhanced transaction result after completion
 */
export interface TransactionResult {
  /** Original transaction response */
  transaction: TransactionResponse;
  /** Receipt after mining */
  receipt: ContractReceipt;
  /** Success/failure status */
  success: boolean;
  /** Error if transaction failed */
  error?: ContractError;
  /** Gas actually used */
  gasUsed: BigNumber;
  /** Gas price paid */
  gasPrice: BigNumber;
  /** Total gas cost in wei */
  gasCost: BigNumber;
  /** Network fees in USD (if available) */
  gasCostUSD?: number;
  /** Transaction execution time in milliseconds */
  executionTime: number;
}

export type TransactionType = 
  | 'approve'
  | 'mint'
  | 'mintWithProofs'
  | 'transfer'
  | 'burn'
  | 'bridge';

export interface TransactionContext {
  /** Number of tokens being minted */
  quantity?: number;
  /** Token IDs involved */
  tokenIds?: number[];
  /** Merkle proofs used */
  merkleProofs?: string[];
  /** Payment token address */
  paymentToken?: Address;
  /** Original method parameters */
  params?: unknown;
}

// =============================================================================
// ON-CHAIN DATA TYPES
// =============================================================================

/**
 * Raw on-chain claim data from contract
 * Based on gachapon-widgets OnChainGachaData structure
 */
export interface OnChainClaimData {
  /** Total tokens minted */
  total: number;
  /** Maximum total supply (0 = unlimited) */
  totalMax: number;
  /** Start timestamp (Unix seconds) */
  startDate: number;
  /** End timestamp (Unix seconds) */
  endDate: number;
  /** Storage protocol identifier */
  storageProtocol: number;
  /** Merkle root for allowlist */
  merkleRoot: string;
  /** Number of token variations */
  tokenVariations: number;
  /** Starting token ID */
  startingTokenId: BigNumber;
  /** Metadata location string */
  location: string;
  /** Token ID (for specific token queries) */
  tokenId?: BigNumber;
  /** Cost per token in wei */
  cost: BigNumber;
}

/**
 * Processed claim state with computed values
 */
export interface ClaimState {
  /** Current status */
  status: ClaimStatus;
  /** Whether claim is currently active */
  isActive: boolean;
  /** Whether claim has started */
  hasStarted: boolean;
  /** Whether claim has ended */
  hasEnded: boolean;
  /** Total minted vs total supply */
  mintProgress: {
    minted: number;
    total: number;
    percentage: number;
  };
  /** Time-based information */
  timing: {
    startDate: Date | null;
    endDate: Date | null;
    timeUntilStart?: number;
    timeUntilEnd?: number;
  };
}

export type ClaimStatus = 
  | 'not-started'
  | 'active'
  | 'ended'
  | 'sold-out'
  | 'paused';

export type ClaimType = 'erc721' | 'erc1155';

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Contract-specific error types
 * Based on CONTRACT_PATTERNS.md error handling patterns
 */
export interface ContractError extends Error {
  /** Error code from ethers or custom */
  code: string;
  /** Original error from ethers */
  reason?: string;
  /** Transaction that caused the error */
  transaction?: ContractTransaction;
  /** Receipt if transaction was mined but failed */
  receipt?: ContractReceipt;
  /** Whether transaction was cancelled by user */
  cancelled?: boolean;
  /** Replacement transaction if applicable */
  replacement?: ContractTransaction;
  /** Additional error context */
  context?: {
    method?: string;
    params?: unknown;
    gasEstimate?: BigNumber;
    provider?: 'wallet' | 'bridge';
  };
}

/**
 * Network-related errors
 */
export interface NetworkError extends Error {
  /** Network ID where error occurred */
  networkId: NetworkId;
  /** Expected network ID */
  expectedNetworkId?: NetworkId;
  /** Error type */
  type: NetworkErrorType;
  /** Whether error is recoverable */
  recoverable: boolean;
}

export type NetworkErrorType = 
  | 'wrong-network'
  | 'network-unavailable'
  | 'rpc-error'
  | 'provider-error'
  | 'timeout';

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Pre-transaction validation results
 */
export interface ContractValidation {
  /** Whether transaction would succeed */
  isValid: boolean;
  /** Validation errors */
  errors: ContractValidationError[];
  /** Validation warnings */
  warnings: ContractValidationWarning[];
  /** Gas estimation if valid */
  estimatedGas?: BigNumber;
  /** Required allowance for ERC20 payments */
  requiredAllowance?: BigNumber;
  /** Current allowance */
  currentAllowance?: BigNumber;
}

export interface ContractValidationError {
  /** Error code */
  code: ContractValidationErrorCode;
  /** Human-readable message */
  message: string;
  /** Field that caused the error */
  field?: string;
  /** Additional error data */
  data?: unknown;
}

export interface ContractValidationWarning {
  /** Warning code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
}

export type ContractValidationErrorCode = 
  | 'insufficient-balance'
  | 'insufficient-allowance'
  | 'invalid-quantity'
  | 'not-eligible'
  | 'mint-not-active'
  | 'exceeds-wallet-limit'
  | 'exceeds-total-supply'
  | 'invalid-proofs'
  | 'wrong-network'
  | 'gas-too-high';

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Manifold Bridge Provider interface
 */
export interface ManifoldBridgeProvider {
  /** Network ID this provider serves */
  readonly networkId: NetworkId;
  /** RPC endpoint URL */
  readonly rpcUrl: string;
  
  /** Get contract instance through bridge */
  getContract(address: Address, abi: unknown[]): BridgeContract;
  /** Execute read-only contract call */
  call(request: CallRequest): Promise<unknown>;
  /** Estimate gas for transaction */
  estimateGas(request: TransactionRequest): Promise<BigNumber>;
  /** Get current gas price */
  getGasPrice(): Promise<BigNumber>;
  /** Get block number */
  getBlockNumber(): Promise<number>;
}

export interface BridgeContract {
  /** Contract address */
  readonly address: Address;
  /** Contract ABI */
  readonly interface: unknown;
  
  /** Call read-only method */
  [methodName: string]: (...args: unknown[]) => Promise<unknown>;
}

export interface CallRequest {
  to: Address;
  data: string;
  blockTag?: string | number;
}

export interface TransactionRequest {
  to: Address;
  data: string;
  value?: BigNumber;
  gasLimit?: BigNumber;
  gasPrice?: BigNumber;
  from?: Address;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Storage protocol mapping */
export const STORAGE_PROTOCOLS = {
  0: 'none',
  1: 'ipfs',
  2: 'arweave',
  3: 'http'
} as const;

// Note: Gas configurations moved to config.ts for centralized management