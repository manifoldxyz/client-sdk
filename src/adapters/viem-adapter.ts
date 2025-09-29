import type {
  IAccountAdapter,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AccountAdapterError,
  AccountAdapterErrorCode,
  AdapterType,
} from '../types/account-adapter';
import { Money } from '../libs/money';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { checkERC20BalanceViem } from '../utils/gas-estimation';
import { ethers } from 'ethers';

// =============================================================================
// VIEM TYPES (CONDITIONAL IMPORTS)
// =============================================================================

/**
 * Conditional type imports for viem to avoid hard dependency
 * These types will be available when viem is installed
 */
type ViemWalletClient = unknown;
type ViemPublicClient = unknown;
type ViemTransactionRequest = unknown;
type ViemTransactionHash = unknown;
type ViemAddress = unknown;

// =============================================================================
// VIEM ADAPTER IMPLEMENTATION
// =============================================================================

/**
 * Account adapter implementation for viem
 *
 * Provides a unified interface for wallet operations using viem's WalletClient and PublicClient.
 * This adapter handles both WalletClient (for transactions) and PublicClient (for read operations).
 *
 * @example
 * ```typescript
 * import { createWalletClient, custom } from 'viem';
 * import { mainnet } from 'viem/chains';
 * import { ViemAdapter } from './adapters/viem-adapter';
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum)
 * });
 *
 * const adapter = new ViemAdapter(client);
 *
 * // Use unified interface
 * const balance = await adapter.getBalance();
 * const networkId = await adapter.getConnectedNetworkId();
 * ```
 */
export class ViemAdapter implements IAccountAdapter {
  readonly adapterType: AdapterType = 'viem';

  private _address: string | null = null;
  private _walletClient: unknown = null;
  private _publicClient: unknown = null;
  private _viem: unknown = null; // Dynamically imported viem module

  /**
   * Initialize adapter with viem WalletClient or PublicClient
   *
   * @param client - viem WalletClient (for transactions) or PublicClient (read-only)
   * @throws {ClientSDKError} When client is invalid or viem is not installed
   */
  constructor(client: ViemWalletClient) {
    this._initializeViem();

    if (this._isWalletClient(client)) {
      this._walletClient = client;
      // Don't create public client in constructor to avoid transport issues
      this._publicClient = null;
    } else if (this._isPublicClient(client)) {
      this._publicClient = client;
      this._walletClient = null;
    } else {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Invalid viem client. Must be WalletClient or PublicClient instance',
      );
    }
  }

  /**
   * Get wallet address (cached after first call)
   */
  get address(): string {
    if (!this._address) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Address not initialized. Call an async method first to initialize address.',
      );
    }
    return this._address;
  }

  /**
   * Send a transaction through the connected wallet
   *
   * @param request - Universal transaction request
   * @returns Promise resolving to universal transaction response
   * @throws {AccountAdapterError} When transaction fails or is rejected
   */
  async sendTransaction(
    request: UniversalTransactionRequest,
  ): Promise<UniversalTransactionResponse> {
    try {
      const walletClient = this._getWalletClient();
      await this._ensureAddress();

      // Convert universal request to viem transaction request
      const viemRequest = this._convertToViemRequest(request);

      // Send transaction using viem
      const walletClientObj = walletClient as {
        sendTransaction: (req: unknown) => Promise<unknown>;
      };
      const hash: ViemTransactionHash = await walletClientObj.sendTransaction(viemRequest);

      // Convert response to universal format
      return this._convertToUniversalResponse(hash, viemRequest);
    } catch (error) {
      throw this._wrapError(error, 'sendTransaction', { request });
    }
  }

  /**
   * Get token balance for connected wallet
   *
   * @param tokenAddress - ERC-20 token address (optional, defaults to native token)
   * @returns Promise resolving to Money instance with balance
   * @throws {AccountAdapterError} When balance query fails
   */
  async getBalance(tokenAddress?: string): Promise<Money> {
    try {
      await this._ensureAddress();
      const networkId = await this.getConnectedNetworkId();
      const publicClient = this._getPublicClient();

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance using viem
        const publicClientObj = publicClient as {
          getBalance: (params: { address: unknown }) => Promise<unknown>;
        };
        const balance = await publicClientObj.getBalance({
          address: this._address as ViemAddress,
        });

        // Convert viem bigint to ethers BigNumber for Money class
        const ethersBN = ethers.BigNumber.from((balance as bigint).toString());

        // Create a mock provider for Money class (it only needs basic functionality)
        const mockProvider = this._createMockEthersProvider(publicClient);

        return Money.create({
          value: ethersBN,
          networkId,
          provider: mockProvider as unknown as
            | ethers.providers.JsonRpcProvider
            | ethers.providers.Web3Provider,
          fetchUSD: true,
        });
      } else {
        // Get ERC-20 token balance using viem
        const balance = await checkERC20BalanceViem(tokenAddress, this._address!, publicClient);

        // Convert viem bigint to ethers BigNumber
        const ethersBN = ethers.BigNumber.from((balance as bigint).toString());
        const mockProvider = this._createMockEthersProvider(publicClient);

        return Money.create({
          value: ethersBN,
          networkId,
          erc20: tokenAddress,
          provider: mockProvider as unknown as
            | ethers.providers.JsonRpcProvider
            | ethers.providers.Web3Provider,
          fetchUSD: true,
        });
      }
    } catch (error) {
      throw this._wrapError(error, 'getBalance', { tokenAddress });
    }
  }

  /**
   * Get the currently connected network ID
   *
   * @returns Promise resolving to network ID (chain ID)
   * @throws {AccountAdapterError} When network query fails
   */
  async getConnectedNetworkId(): Promise<number> {
    try {
      const publicClient = this._getPublicClient();
      const publicClientObj = publicClient as { getChainId: () => Promise<unknown> };
      const chainId = await publicClientObj.getChainId();
      return Number(chainId);
    } catch (error) {
      throw this._wrapError(error, 'getConnectedNetworkId');
    }
  }

  /**
   * Switch to a different network
   *
   * @param chainId - Target network ID to switch to
   * @returns Promise resolving when network switch is complete
   * @throws {AccountAdapterError} When network switch fails or is rejected
   */
  async switchNetwork(chainId: number): Promise<void> {
    try {
      const walletClient = this._getWalletClient();

      // Use viem's switchChain action
      const walletClientObj = walletClient as {
        switchChain: (params: { id: number }) => Promise<void>;
      };
      await walletClientObj.switchChain({ id: chainId });
    } catch (error) {
      throw this._wrapError(error, 'switchNetwork', { chainId });
    }
  }

  /**
   * Sign a message with the connected wallet
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {AccountAdapterError} When signing fails or is rejected
   */
  async signMessage(message: string): Promise<string> {
    try {
      const walletClient = this._getWalletClient();
      await this._ensureAddress();

      const walletClientObj = walletClient as {
        signMessage: (params: { account: unknown; message: string }) => Promise<string>;
      };
      const signature = await walletClientObj.signMessage({
        account: this._address as ViemAddress,
        message,
      });

      return signature;
    } catch (error) {
      throw this._wrapError(error, 'signMessage', { message });
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Dynamically import viem to avoid hard dependency
   */
  private _initializeViem(): void {
    try {
      // Try to require viem - this will throw if not installed
      this._viem = require('viem');
    } catch (error) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Viem is not installed. Please install viem as a peer dependency: npm install viem',
      );
    }
  }

  /**
   * Type guard to check if client is a viem WalletClient
   */
  private _isWalletClient(obj: unknown): obj is ViemWalletClient {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const client = obj as Record<string, unknown>;
    return (
      typeof client.sendTransaction === 'function' &&
      typeof client.signMessage === 'function' &&
      Boolean(client.account || client.getAddresses)
    );
  }

  /**
   * Type guard to check if client is a viem PublicClient
   */
  private _isPublicClient(obj: unknown): obj is ViemPublicClient {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const client = obj as Record<string, unknown>;
    return (
      typeof client.getBalance === 'function' &&
      typeof client.getChainId === 'function' &&
      typeof client.readContract === 'function' &&
      !client.sendTransaction
    ); // PublicClient doesn't have sendTransaction
  }

  /**
   * Create a PublicClient from WalletClient's transport and chain
   */
  private _createPublicClient(walletClient: ViemWalletClient): ViemPublicClient {
    if (!this._viem || typeof this._viem !== 'object' || this._viem === null) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Viem module not properly initialized');
    }

    const viemModule = this._viem as { createPublicClient: (config: unknown) => unknown };

    if (typeof viemModule.createPublicClient !== 'function') {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'createPublicClient function not found in viem module',
      );
    }

    const walletClientObj = walletClient as Record<string, unknown>;

    return viemModule.createPublicClient({
      chain: walletClientObj.chain,
      transport: walletClientObj.transport,
    });
  }

  /**
   * Get wallet client, throwing error if not available
   */
  private _getWalletClient(): ViemWalletClient {
    if (!this._walletClient) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'No wallet client available. Cannot perform transactions with read-only client.',
      );
    }
    return this._walletClient;
  }

  /**
   * Get public client for read operations
   */
  private _getPublicClient(): ViemPublicClient {
    if (this._publicClient) {
      return this._publicClient;
    }

    // If we have a wallet client, try to create a public client from it
    if (this._walletClient) {
      this._publicClient = this._createPublicClient(this._walletClient);
      return this._publicClient;
    }

    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      'No public client available for read operations',
    );
  }

  /**
   * Ensure address is initialized by fetching it from client
   */
  private async _ensureAddress(): Promise<void> {
    if (!this._address) {
      if (this._walletClient) {
        const walletClientObj = this._walletClient as Record<string, unknown>;

        // Get address from wallet client
        if (
          walletClientObj.account &&
          typeof walletClientObj.account === 'object' &&
          walletClientObj.account !== null
        ) {
          // Account is hoisted on the client
          const account = walletClientObj.account as Record<string, unknown>;
          if (typeof account.address === 'string') {
            this._address = account.address;
          } else {
            throw new ClientSDKError(
              ErrorCode.INVALID_INPUT,
              'Invalid account address format in wallet client',
            );
          }
        } else if (typeof walletClientObj.getAddresses === 'function') {
          // Get addresses from provider (JSON-RPC account)
          const addresses = await (walletClientObj.getAddresses as () => Promise<string[]>)();
          if (!Array.isArray(addresses) || addresses.length === 0) {
            throw new ClientSDKError(
              ErrorCode.INVALID_INPUT,
              'No accounts available from wallet client',
            );
          }
          this._address = addresses[0]!;
        } else {
          throw new ClientSDKError(
            ErrorCode.INVALID_INPUT,
            'Wallet client has no account or getAddresses method',
          );
        }
      } else {
        throw new ClientSDKError(
          ErrorCode.INVALID_INPUT,
          'Cannot get address from read-only client',
        );
      }
    }
  }

  /**
   * Convert universal transaction request to viem format
   */
  private _convertToViemRequest(request: UniversalTransactionRequest): ViemTransactionRequest {
    const viemRequest: Record<string, unknown> = {
      to: request.to as ViemAddress,
    };

    // Add account if not hoisted
    const walletClientObj = this._walletClient as Record<string, unknown> | null;
    if (!walletClientObj?.account) {
      viemRequest.account = this._address as ViemAddress;
    }

    if (request.value) {
      viemRequest.value = BigInt(request.value);
    }

    if (request.data) {
      viemRequest.data = request.data as `0x${string}`;
    }

    if (request.gasLimit) {
      viemRequest.gas = BigInt(request.gasLimit);
    }

    if (request.nonce !== undefined) {
      viemRequest.nonce = request.nonce;
    }

    if (request.chainId !== undefined) {
      viemRequest.chainId = request.chainId;
    }

    if (request.type !== undefined) {
      viemRequest.type = request.type === 0 ? 'legacy' : 'eip1559';
    }

    // Handle gas pricing (legacy vs EIP-1559)
    if (request.gasPrice) {
      viemRequest.gasPrice = BigInt(request.gasPrice);
    } else if (request.maxFeePerGas && request.maxPriorityFeePerGas) {
      viemRequest.maxFeePerGas = BigInt(request.maxFeePerGas);
      viemRequest.maxPriorityFeePerGas = BigInt(request.maxPriorityFeePerGas);
    }

    return viemRequest as ViemTransactionRequest;
  }

  /**
   * Convert viem transaction hash to universal response format
   */
  private _convertToUniversalResponse(
    hash: ViemTransactionHash,
    request: ViemTransactionRequest,
  ): UniversalTransactionResponse {
    const requestObj = request as Record<string, unknown>;
    const hashStr = hash as string;

    const response: UniversalTransactionResponse = {
      hash: hashStr,
      from: (requestObj.account as string) || this._address || '',
      to: (requestObj.to as string) || '',
      status: 'pending', // viem sendTransaction only returns hash, transaction is initially pending
      confirmations: 0,
      nonce: requestObj.nonce as number | undefined,
      chainId: requestObj.chainId as number | undefined,
    };

    return response;
  }

  /**
   * Create a mock ethers provider that implements the minimal interface needed by Money class
   */
  private _createMockEthersProvider(publicClient: ViemPublicClient): Record<string, unknown> {
    const publicClientObj = publicClient as { getChainId: () => Promise<unknown> };

    return {
      // Mock the methods that Money class might use
      getNetwork: async () => ({
        chainId: await publicClientObj.getChainId(),
      }),
      // Add other methods as needed by the Money class
    };
  }

  /**
   * Wrap errors in AccountAdapterError format
   */
  private _wrapError(error: unknown, method?: string, params?: unknown): AccountAdapterError {
    // Determine error code based on error type
    let code: AccountAdapterErrorCode = 'UNKNOWN_ERROR';
    let message = 'An unexpected error occurred';

    if (error instanceof ClientSDKError) {
      // Re-throw ClientSDK errors directly
      throw error;
    }

    // Handle viem-specific errors with type guards
    const errorObj = error as Record<string, unknown>;

    if (errorObj?.name === 'UserRejectedRequestError' || errorObj?.code === 4001) {
      code = 'TRANSACTION_REJECTED';
      message = 'Transaction was rejected by user';
    } else if (
      errorObj?.name === 'InsufficientFundsError' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('insufficient funds'))
    ) {
      code = 'INSUFFICIENT_BALANCE';
      message = 'Insufficient balance for transaction';
    } else if (
      errorObj?.name === 'ChainMismatchError' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('chain'))
    ) {
      code = 'NETWORK_MISMATCH';
      message = 'Network mismatch error';
    } else if (
      errorObj?.name === 'TimeoutError' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('timeout'))
    ) {
      code = 'TIMEOUT';
      message = 'Operation timed out';
    } else if (
      errorObj?.name === 'ContractFunctionExecutionError' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('reverted'))
    ) {
      code = 'TRANSACTION_FAILED';
      message = 'Transaction execution failed';
    } else if (errorObj?.name === 'TransactionExecutionError') {
      code = 'TRANSACTION_FAILED';
      message = 'Transaction execution failed';
    } else if (typeof errorObj?.message === 'string') {
      message = errorObj.message;
    }

    const adapterError: AccountAdapterError = Object.assign(new Error(message), {
      code,
      adapterType: this.adapterType,
      context: {
        method,
        params,
        originalError: error instanceof Error ? error : undefined,
      },
    });

    return adapterError;
  }
}

// =============================================================================
// ADAPTER FACTORY HELPER
// =============================================================================

/**
 * Create ViemAdapter from viem WalletClient or PublicClient
 *
 * @param client - viem WalletClient or PublicClient instance
 * @returns ViemAdapter instance
 * @throws {ClientSDKError} When client is invalid
 *
 * @example
 * ```typescript
 * import { createWalletClient, custom } from 'viem';
 * import { mainnet } from 'viem/chains';
 * import { createViemAdapter } from './adapters/viem-adapter';
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum)
 * });
 *
 * const adapter = createViemAdapter(client);
 * ```
 */
export function createViemAdapter(client: unknown): IAccountAdapter {
  if (!client || typeof client !== 'object') {
    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      'Client must be a valid viem WalletClient or PublicClient instance',
    );
  }

  return new ViemAdapter(client as ViemWalletClient);
}

// =============================================================================
// TYPE GUARDS AND DETECTION
// =============================================================================

/**
 * Detect if a client instance is compatible with viem
 *
 * @param client - Unknown client instance
 * @returns True if client appears to be viem compatible
 */
export function isViemCompatible(client: unknown): boolean {
  if (!client || typeof client !== 'object') {
    return false;
  }

  const obj = client as Record<string, unknown>;

  // Check for viem specific patterns
  const hasViemMethods =
    (typeof obj.sendTransaction === 'function' && typeof obj.signMessage === 'function') || // WalletClient
    (typeof obj.getBalance === 'function' && typeof obj.readContract === 'function'); // PublicClient

  if (!hasViemMethods) {
    return false;
  }

  // Check for viem-specific properties
  const hasViemProperties = obj.transport && (obj.chain || obj.getChainId) && obj.mode !== 'anvil'; // Exclude test clients

  // Check against ethers patterns to avoid false positives
  const providerObj = obj.provider as Record<string, unknown> | undefined;
  const getNetworkObj = obj.getNetwork as Record<string, unknown> | undefined;

  const hasEthersPatterns =
    obj._isProvider === true ||
    providerObj?._isProvider === true ||
    (typeof getNetworkObj?.constructor === 'function' &&
      typeof getNetworkObj.constructor.name === 'string' &&
      getNetworkObj.constructor.name.includes('ethers'));

  return Boolean(hasViemProperties) && !hasEthersPatterns;
}
