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

  /** Chain ID for transaction */
  chainId: number;

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

  /** Number of confirmations (0 if pending) */
  confirmations?: number;

  /** Transaction nonce */
  nonce?: number;

  /** Chain ID where transaction was sent */
  chainId: number;

  /** Normalized receipt details when available */
  logs: Log[];
}

export type Log = {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  logIndex: number;
  transactionHash: string;
  transactionIndex: number;
  removed: boolean;
  topics: string[];
};

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
  | 'viem' // viem client
  | 'wagmi'; // wagmi config

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
export interface IAccount {
  /**
   * Wallet address (checksummed)
   */
  _address: string | undefined;

  /**
   * Adapter type identifier for debugging and type checking
   * @readonly
   */
  readonly adapterType: AdapterType;

  /**
   * Get wallet address asynchronously
   */
  getAddress(): Promise<string>;

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
  getBalance(networkId: number, tokenAddress?: string): Promise<Money>;

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
   * Sign a message with the connected wallet
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {AccountAdapterError} When signing fails or is rejected
   *
   * @example
   * ```typescript
   * const signature = await adapter.signMessage('Hello, Web3!');
   * console.log(`Signature: ${signature}`);
   * ```
   */
  signMessage(message: string): Promise<string>;

  /**
   * Sign typed data (EIP-712) with the connected wallet (optional enhancement)
   *
   * @param typedData - EIP-712 typed data payload
   * @returns Promise resolving to signature string
   * @throws {AccountAdapterError} When signing fails or is rejected
   */
  signTypedData?(typedData: TypedDataPayload): Promise<string>;

  /**
   * Send raw RPC calls to the wallet provider
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
   * await adapter.sendCalls('wallet_addEthereumChain', [{
   *   chainId: '0x89',
   *   chainName: 'Polygon',
   *   nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
   *   rpcUrls: ['https://polygon-rpc.com'],
   *   blockExplorerUrls: ['https://polygonscan.com']
   * }]);
   * ```
   */
  sendCalls(method: string, params?: unknown[]): Promise<unknown>;
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
// PUBLIC PROVIDER INTERFACES
// =============================================================================

/**
 * Public provider interface for read-only blockchain interactions.
 * Provides a unified API for balance queries, gas estimation, and contract reads
 * across different Web3 libraries (ethers, viem, etc).
 *
 * This interface abstracts the underlying provider implementation and provides
 * a consistent way to interact with the blockchain for read operations.
 *
 * @example
 * ```typescript
 * const provider = new Ethers5PublicClient({ provider: ethersProvider });
 *
 * // Get balance
 * const balance = await provider.getBalance({
 *   address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
 *   networkId: 1
 * });
 *
 * // Estimate gas for contract call
 * const gasEstimate = await provider.estimateContractGas({
 *   address: '0x...',
 *   abi: contractAbi,
 *   functionName: 'transfer',
 *   args: [recipient, amount],
 *   from: '0x...'
 * });
 * ```
 *
 * @public
 */
export interface IPublicProvider {
  /**
   * Get the balance of an address (native token or ERC20).
   *
   * @param params - Balance query parameters
   * @param params.address - The address to query balance for
   * @param params.networkId - The network ID to query on
   * @param params.tokenAddress - Optional ERC20 token address (omit for native token)
   * @returns Promise resolving to balance as bigint
   *
   * @example
   * ```typescript
   * // Get native token balance
   * const ethBalance = await provider.getBalance({
   *   address: '0x...',
   *   networkId: 1
   * });
   *
   * // Get ERC20 token balance
   * const usdcBalance = await provider.getBalance({
   *   address: '0x...',
   *   networkId: 1,
   *   tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
   * });
   * ```
   */
  getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint>;

  /**
   * Estimate gas for a contract function call.
   *
   * @param params - Gas estimation parameters
   * @param params.contractAddress - The contract address
   * @param params.abi - Contract ABI (can be partial, only needs the function being called)
   * @param params.functionName - Name of the function to call
   * @param params.args - Function arguments
   * @param params.from - The address that would send the transaction
   * @param params.value - Optional ETH value to send with the call (for payable functions)
   * @param params.networkId - The network ID for the estimation
   * @returns Promise resolving to estimated gas as bigint
   *
   * @example
   * ```typescript
   * const gasEstimate = await provider.estimateContractGas({
   *   contractAddress: '0x...',
   *   abi: erc20Abi,
   *   functionName: 'transfer',
   *   args: ['0xrecipient...', '1000000'],
   *   from: '0xsender...',
   *   networkId: 1
   * });
   * ```
   */
  estimateContractGas(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    from: string;
    value?: bigint;
    networkId: number;
  }): Promise<bigint>;

  /**
   * Read data from a contract (call a view/pure function).
   *
   * @param params - Contract read parameters
   * @param params.contractAddress - The contract address
   * @param params.abi - Contract ABI (can be partial, only needs the function being called)
   * @param params.functionName - Name of the function to call
   * @param params.args - Function arguments
   * @param params.networkId - The network ID for the read
   * @returns Promise resolving to the function return value
   *
   * @example
   * ```typescript
   * // Read ERC20 balance
   * const balance = await provider.readContract({
   *   contractAddress: '0xUSDC...',
   *   abi: erc20Abi,
   *   functionName: 'balanceOf',
   *   args: ['0xholder...'],
   *   networkId: 1
   * });
   *
   * // Read contract state
   * const totalSupply = await provider.readContract({
   *   contractAddress: '0x...',
   *   abi: nftAbi,
   *   functionName: 'totalSupply',
   *   networkId: 1
   * });
   * ```
   */
  readContract<T = unknown>(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    networkId: number;
  }): Promise<T>;

  /**
   * Subscribe to contract events (logs) matching specified topics.
   *
   * @param params - Event watching parameters
   * @param params.contractAddress - The contract address
   * @param params.abi - Contract ABI (can be partial, only needs the events being watched)
   * @param params.networkId - The network ID to watch on
   * @param params.topics - Array of topics to filter events
   * @param params.callback - Callback function invoked with each matching log
   * @returns Promise resolving to an unsubscribe function
   *
   * @example
   * ```typescript
   * // Subscribe to Transfer events
   * const unsubscribe = await provider.subscribeToContractEvents({
   *   contractAddress: '0x...',
   *   abi: erc20Abi,
   *   networkId: 1,
   *   topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'], // Transfer event signature
   *   callback: (log) => {
   *     console.log('Transfer event:', log);
   *   }
   * });
   *
   * // Later: unsubscribe from events
   * unsubscribe();
   * ```
   */
  subscribeToContractEvents(params: {
    contractAddress: string;
    abi: readonly unknown[];
    networkId: number;
    topics: string[];
    callback: (log: unknown) => void;
  }): Promise<() => void>;
}
