import type { Money } from '../libs/money';

// =============================================================================
// UNIVERSAL TRANSACTION TYPES
// =============================================================================

/**
 * Universal transaction request format that normalizes across different Web3 libraries
 * (ethers v5, ethers v6, viem). All string values use hex or decimal string format
 * to avoid BigNumber incompatibilities between libraries.
 *
 * @example
 * ```typescript
 * const txRequest: UniversalTransactionRequest = {
 *   to: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
 *   value: '1000000000000000000', // 1 ETH in wei
 *   data: '0xa9059cbb...',
 *   gasLimit: '21000',
 *   maxFeePerGas: '30000000000', // 30 gwei
 *   maxPriorityFeePerGas: '2000000000' // 2 gwei
 * };
 * ```
 */
export interface UniversalTransactionRequest {
  /** Target contract or wallet address */
  to: string;

  /** Value to send in wei (as string) */
  value?: string;

  /** Transaction data (method call encoded) */
  data?: string;

  /** Gas limit (as string) */
  gasLimit?: string;

  /** Legacy gas price in wei (as string) - for pre-EIP-1559 */
  gasPrice?: string;

  /** Maximum fee per gas in wei (as string) - EIP-1559 */
  maxFeePerGas?: string;

  /** Maximum priority fee per gas in wei (as string) - EIP-1559 */
  maxPriorityFeePerGas?: string;

  /** Transaction nonce (optional, provider will set if not provided) */
  nonce?: number;

  /** Chain ID for transaction (optional, adapter will use connected network) */
  chainId?: number;

  /** Transaction type (0 = Legacy, 2 = EIP-1559) */
  type?: number;
}

/**
 * Universal transaction response format that normalizes transaction results
 * across different Web3 libraries. Provides consistent interface regardless
 * of underlying provider implementation.
 *
 * @example
 * ```typescript
 * const response = await adapter.sendTransaction(request);
 * console.log(`Transaction sent: ${response.hash}`);
 * console.log(`Status: ${response.status}`);
 * console.log(`Confirmations: ${response.confirmations || 0}`);
 * ```
 */
export interface UniversalTransactionResponse {
  /** Transaction hash */
  hash: string;

  /** Block number where transaction was mined (undefined if pending) */
  blockNumber?: number;

  /** Block hash where transaction was mined */
  blockHash?: string;

  /** From address (sender) */
  from: string;

  /** To address (recipient) */
  to: string;

  /** Gas actually used (as string, only available after mining) */
  gasUsed?: string;

  /** Effective gas price paid (as string, only available after mining) */
  effectiveGasPrice?: string;

  /** Transaction status */
  status?: TransactionStatus;

  /** Number of confirmations (0 if pending) */
  confirmations?: number;

  /** Transaction nonce */
  nonce?: number;

  /** Chain ID where transaction was sent */
  chainId?: number;

  /** Normalized receipt details when available */
  receipt?: TransactionConfirmationResult;
}

/**
 * Transaction status enumeration
 */
export type TransactionStatus =
  | 'pending' // Transaction submitted but not mined
  | 'confirmed' // Transaction mined and confirmed
  | 'failed'; // Transaction reverted or failed

/**
 * Normalized transaction confirmation result returned by adapters
 */
export interface TransactionConfirmationResult {
  /** Transaction hash */
  hash: string;

  /** Block number where transaction was mined */
  blockNumber?: number;

  /** Gas used (as string) */
  gasUsed?: string;

  /** Effective gas price paid (as string) */
  effectiveGasPrice?: string;

  /** Transaction status */
  status: TransactionStatus;

  /** Network ID where transaction was confirmed */
  networkId: number;

  /** Number of confirmations observed */
  confirmations: number;
}

// =============================================================================
// ACCOUNT ADAPTER INTERFACES
// =============================================================================

/**
 * Adapter type enumeration for different Web3 libraries
 */
export type AdapterType =
  | 'ethers5' // ethers.js v5.x
  | 'ethers6' // ethers.js v6.x
  | 'viem'; // viem client

/**
 * Main account adapter interface that abstracts wallet operations across
 * different Web3 libraries. Provides a unified API for transaction sending,
 * balance queries, and network management.
 *
 * This interface is the core abstraction that allows the Manifold SDK to work
 * with ethers v5, ethers v6, and viem without breaking changes.
 *
 * @example
 * ```typescript
 * // Create adapter with explicit factory method
 * const account = AccountAdapterFactory.fromEthers5(signer);
 *
 * // Use unified interface
 * const balance = await account.getBalance();
 * const networkId = await account.getConnectedNetworkId();
 *
 * // Send transaction
 * const response = await account.sendTransaction({
 *   to: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
 *   value: '1000000000000000000', // 1 ETH
 *   data: '0xa9059cbb...'
 * });
 * ```
 */
export interface IAccountAdapter {
  /**
   * Wallet address (checksummed)
   * @readonly
   */
  readonly address: string;

  /**
   * Adapter type identifier for debugging and type checking
   * @readonly
   */
  readonly adapterType: AdapterType;

  /**
   * Send a transaction through the connected wallet
   *
   * @param request - Universal transaction request
   * @returns Promise resolving to universal transaction response
   * @throws {AccountAdapterError} When transaction fails or is rejected
   *
   * @example
   * ```typescript
   * const response = await adapter.sendTransaction({
   *   to: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
   *   value: '1000000000000000000', // 1 ETH in wei
   *   gasLimit: '21000'
   * });
   * ```
   */
  sendTransaction(request: UniversalTransactionRequest): Promise<string>;

  /**
   * Send a transaction and wait for confirmation
   *
   * @param request - Universal transaction request
   * @param options - Confirmation options
   * @returns Promise resolving to normalized confirmation result
   * @throws {AccountAdapterError} When transaction submission or confirmation fails
   */
  sendTransactionWithConfirmation(
    request: UniversalTransactionRequest,
    options?: { confirmations?: number },
  ): Promise<UniversalTransactionResponse>;

  /**
   * Get token balance for connected wallet
   *
   * @param tokenAddress - ERC-20 token address (optional, defaults to native token)
   * @returns Promise resolving to Money instance with balance
   * @throws {AccountAdapterError} When balance query fails
   *
   * @example
   * ```typescript
   * // Get native token balance (ETH, MATIC, etc.)
   * const ethBalance = await adapter.getBalance();
   *
   * // Get ERC-20 token balance
   * const usdcBalance = await adapter.getBalance('0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B');
   * ```
   */
  getBalance(tokenAddress?: string): Promise<Money>;

  /**
   * Get the currently connected network ID
   *
   * @returns Promise resolving to network ID (chain ID)
   * @throws {AccountAdapterError} When network query fails
   *
   * @example
   * ```typescript
   * const networkId = await adapter.getConnectedNetworkId();
   * console.log(`Connected to network: ${networkId}`);
   * // Output: "Connected to network: 1" (Ethereum mainnet)
   * ```
   */
  getConnectedNetworkId(): Promise<number>;

  /**
   * Switch to a different network
   *
   * @param chainId - Target network ID to switch to
   * @returns Promise resolving when network switch is complete
   * @throws {AccountAdapterError} When network switch fails or is rejected
   *
   * @example
   * ```typescript
   * // Switch to Polygon
   * await adapter.switchNetwork(137);
   *
   * // Verify switch was successful
   * const newNetworkId = await adapter.getConnectedNetworkId();
   * console.log(`Now connected to network: ${newNetworkId}`);
   * ```
   */
  switchNetwork(chainId: number): Promise<void>;

  /**
   * Sign a message with the connected wallet (optional enhancement)
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {AccountAdapterError} When signing fails or is rejected
   *
   * @example
   * ```typescript
   * const signature = await adapter.signMessage?.('Hello, Web3!');
   * console.log(`Signature: ${signature}`);
   * ```
   */
  signMessage?(message: string): Promise<string>;

  /**
   * Sign typed data (EIP-712) with the connected wallet (optional enhancement)
   *
   * @param typedData - EIP-712 typed data payload
   * @returns Promise resolving to signature string
   * @throws {AccountAdapterError} When signing fails or is rejected
   */
  signTypedData?(typedData: TypedDataPayload): Promise<string>;

  /**
   * Send raw RPC calls to the wallet provider (optional)
   * Useful for wallet-specific methods like adding custom networks, tokens, etc.
   *
   * @param method - RPC method name (e.g., 'wallet_addEthereumChain')
   * @param params - Method parameters
   * @returns Promise resolving to the RPC response
   * @throws {AccountAdapterError} When RPC call fails or is not supported
   *
   * @example
   * ```typescript
   * // Add a custom network
   * await adapter.sendCalls?.('wallet_addEthereumChain', [{
   *   chainId: '0x89',
   *   chainName: 'Polygon',
   *   nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
   *   rpcUrls: ['https://polygon-rpc.com'],
   *   blockExplorerUrls: ['https://polygonscan.com']
   * }]);
   * ```
   */
  sendCalls?(method: string, params?: unknown[]): Promise<unknown>;
}

/**
 * EIP-712 Typed Data structure for signTypedData method
 */
export interface TypedDataPayload {
  /** EIP-712 domain separator */
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
  };

  /** Primary type being signed */
  primaryType: string;

  /** Type definitions */
  types: Record<
    string,
    Array<{
      name: string;
      type: string;
    }>
  >;

  /** Message data to sign */
  message: Record<string, unknown>;
}

// =============================================================================
// ADAPTER FACTORY INTERFACE
// =============================================================================

/**
 * Factory interface for creating account adapters with explicit type safety.
 * Provides type-safe methods for each supported Web3 library and includes
 * backward compatibility with auto-detection.
 *
 * @example
 * ```typescript
 * // Recommended: Explicit factory methods (type-safe)
 * const ethers5Adapter = AccountAdapterFactory.fromEthers5(signer);
 * const ethers6Adapter = AccountAdapterFactory.fromEthers6(provider);
 * const viemAdapter = AccountAdapterFactory.fromViem(walletClient);
 *
 * // Legacy: Auto-detect (may be deprecated in future)
 * const adapter = AccountAdapterFactory.create(provider);
 * ```
 */
export interface IAccountAdapterFactory {
  /**
   * Create adapter from ethers v5 provider or signer
   *
   * @param provider - ethers v5 Provider or Signer instance
   * @returns IAccountAdapter instance configured for ethers v5
   * @throws {FactoryError} When provider is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { ethers } from 'ethers'; // v5
   *
   * const provider = new ethers.providers.Web3Provider(window.ethereum);
   * const signer = provider.getSigner();
   * const adapter = AccountAdapterFactory.fromEthers5(signer);
   * ```
   */
  fromEthers5(provider: unknown): IAccountAdapter;

  /**
   * Create adapter from ethers v6 provider or signer
   *
   * @param provider - ethers v6 Provider or Signer instance
   * @returns IAccountAdapter instance configured for ethers v6
   * @throws {FactoryError} When provider is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { ethers } from 'ethers'; // v6
   *
   * const provider = new ethers.BrowserProvider(window.ethereum);
   * const signer = await provider.getSigner();
   * const adapter = AccountAdapterFactory.fromEthers6(signer);
   * ```
   */
  fromEthers6(provider: unknown): IAccountAdapter;

  /**
   * Create adapter from viem wallet client
   *
   * @param client - viem WalletClient or PublicClient with account
   * @returns IAccountAdapter instance configured for viem
   * @throws {FactoryError} When client is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { createWalletClient, custom } from 'viem';
   * import { mainnet } from 'viem/chains';
   *
   * const client = createWalletClient({
   *   chain: mainnet,
   *   transport: custom(window.ethereum)
   * });
   * const adapter = AccountAdapterFactory.fromViem(client);
   * ```
   */
  fromViem(client: unknown): IAccountAdapter;

  /**
   * Auto-detect provider type and create appropriate adapter
   *
   * @deprecated Use explicit factory methods (fromEthers5, fromEthers6, fromViem) for better type safety
   * @param provider - Unknown provider instance to auto-detect
   * @returns IAccountAdapter instance for detected provider type
   * @throws {FactoryError} When provider type cannot be detected
   *
   * @example
   * ```typescript
   * // Legacy usage (may be deprecated)
   * const adapter = AccountAdapterFactory.create(unknownProvider);
   *
   * // Preferred: Use explicit methods
   * const adapter = AccountAdapterFactory.fromEthers5(ethersSigner);
   * ```
   */
  create(provider: unknown): IAccountAdapter;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Factory-specific error types
 */
export interface FactoryError extends Error {
  /** Factory error code */
  code: FactoryErrorCode;

  /** Provider type that was attempted */
  attemptedType?: string;

  /** Additional context */
  context?: {
    provider?: unknown;
    detectedFeatures?: string[];
  };
}

/**
 * Error codes for factory operations
 */
export type FactoryErrorCode =
  | 'UNSUPPORTED_PROVIDER' // Provider type not supported
  | 'INVALID_PROVIDER' // Provider instance is invalid
  | 'MISSING_ACCOUNT' // Provider has no connected account
  | 'DETECTION_FAILED' // Auto-detection failed
  | 'INITIALIZATION_FAILED'; // Adapter initialization failed

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

/**
 * Adapter-specific network configuration for supported blockchains
 */
export interface AdapterNetworkConfig {
  /** Chain ID */
  chainId: number;

  /** Human-readable network name */
  name: string;

  /** RPC endpoint URLs */
  rpcUrls: string[];

  /** Native currency configuration */
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };

  /** Block explorer URLs */
  blockExplorerUrls?: string[];

  /** Whether this is a testnet */
  isTestnet?: boolean;
}

/**
 * Supported networks enumeration
 */
export enum SupportedNetwork {
  ETHEREUM_MAINNET = 1,
  POLYGON = 137,
  OPTIMISM = 10,
  ARBITRUM_ONE = 42161,
  BASE = 8453,
  SEPOLIA_TESTNET = 11155111,
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Type guard utility for checking if an object is an IAccountAdapter
 */
export type AccountAdapterTypeGuard = (obj: unknown) => obj is IAccountAdapter;

/**
 * Provider detection utility type
 */
export interface ProviderDetection {
  /** Whether this appears to be an ethers v5 provider */
  isEthers5: boolean;

  /** Whether this appears to be an ethers v6 provider */
  isEthers6: boolean;

  /** Whether this appears to be a viem client */
  isViem: boolean;

  /** Detected features for debugging */
  features: string[];

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Adapter creation options for advanced use cases
 */
export interface AdapterCreationOptions {
  /** Timeout for operations in milliseconds */
  timeout?: number;

  /** Number of retry attempts for failed operations */
  retries?: number;

  /** Custom network configurations */
  networks?: Record<number, AdapterNetworkConfig>;

  /** Whether to automatically switch networks */
  autoSwitchNetwork?: boolean;

  /** Custom gas estimation strategy */
  gasEstimation?: {
    multiplier: number;
    maxGasLimit: string;
  };
}
