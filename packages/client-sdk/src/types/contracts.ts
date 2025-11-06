import type { ContractTransaction, ContractReceipt } from 'ethers';
import type { Address } from './common';

// =============================================================================
// CONTRACT INTERFACES
// =============================================================================

/**
 * Claim Extension Contract Interface
 * Based on CONTRACT_PATTERNS.md dual-provider architecture
 */
export interface ClaimExtensionContract {
  /** Network ID where contract is deployed */
  readonly networkId: number;
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
  mint(
    quantity: number,
    paymentAmount: bigint,
    walletAddress: Address,
  ): Promise<TransactionResponse>;
  mintWithProofs(
    quantity: number,
    paymentAmount: bigint,
    walletAddress: Address,
    merkleProofs: string[],
  ): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasMint(walletAddress: Address, quantity: number, paymentAmount: bigint): Promise<bigint>;
  estimateGasMintWithProofs(
    walletAddress: Address,
    quantity: number,
    paymentAmount: bigint,
    merkleProofs: string[],
  ): Promise<bigint>;

  // Utility methods
  isValidNetwork(): boolean;
  switchToCorrectNetwork(): Promise<void>;
}

/**
 * ERC20 Contract Interface for payment tokens
 */
export interface ERC20Contract {
  /** Network ID where contract is deployed */
  readonly networkId: number;
  /** ERC20 contract address */
  readonly contractAddress: Address;

  // Read operations
  getBalance(walletAddress: Address): Promise<bigint>;
  getAllowance(owner: Address, spender: Address): Promise<bigint>;
  getERC20Symbol(): Promise<string>;
  getERC20Decimals(): Promise<number>;
  getERC20Name(): Promise<string>;
  getTotalSupply(): Promise<bigint>;

  // Write operations
  approve(spender: Address, amount: bigint): Promise<TransactionResponse>;
  transfer(to: Address, amount: bigint): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasApprove(spender: Address, amount: bigint): Promise<bigint>;
  estimateGasTransfer(to: Address, amount: bigint): Promise<bigint>;
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
  gasLimit?: bigint;
  /** Gas price in wei */
  gasPrice?: bigint;
  /** Value to send with transaction (for payable methods) */
  value?: bigint;
  /** Use bridge provider instead of wallet provider */
  useBridge?: boolean;
  /** Use unchecked mode (for WalletConnect compatibility) */
  unchecked?: boolean;
  /** Timeout in milliseconds (default: 1500) */
  timeout?: number;
  /** Number of retry attempts on failure */
  retries?: number;
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
export interface TransactionResponse extends Omit<ContractTransaction, 'type'> {
  /** SDK-generated transaction ID for tracking */
  sdkTxId: string;
  /** Estimated gas used */
  estimatedGas: bigint;
  /** Provider used (wallet or bridge) */
  provider: 'wallet' | 'bridge';
  /** Transaction type for categorization */
  type: TransactionType;
  /** Additional context data */
  context?: TransactionContext;
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
 * Based on gachapon-widgets Gachapon structure
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
  startingTokenId: bigint;
  /** Metadata location string */
  location: string;
  /** Token ID (for specific token queries) */
  tokenId?: bigint;
  /** Cost per token in wei */
  cost: bigint;
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

export type ClaimStatus = 'not-started' | 'active' | 'ended' | 'sold-out' | 'paused';

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
    gasEstimate?: bigint;
    provider?: 'wallet' | 'bridge';
  };
}

export type NetworkErrorType =
  | 'wrong-network'
  | 'network-unavailable'
  | 'rpc-error'
  | 'provider-error'
  | 'timeout';

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface CallRequest {
  to: Address;
  data: string;
  blockTag?: string | number;
}

export interface TransactionRequest {
  to: Address;
  data: string;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint;
  from?: Address;
}

export type ContractSpec = 'erc721' | 'erc1155';
