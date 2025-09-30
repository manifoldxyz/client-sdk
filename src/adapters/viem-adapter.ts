import type {
  IAccountAdapter,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AdapterType,
} from '../types/account-adapter';
import { Money } from '../libs/money';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { checkERC20BalanceViem } from '../utils/gas-estimation';
import { ethers } from 'ethers';

// =============================================================================
// VIEM TYPE IMPORTS
// =============================================================================

import type * as Viem from 'viem';
import type { WalletClient as ViemWalletClient, PublicClient as ViemPublicClient } from 'viem';

/**
 * Import viem types conditionally to support optional peer dependency
 * Using type-only imports to avoid runtime errors when viem is not installed
 */
type ViemModule = typeof Viem;
type ViemAddress = `0x${string}`;
type ViemHash = `0x${string}`;
type ViemClient = ViemWalletClient | ViemPublicClient;

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
  private _walletClient: ViemWalletClient | null = null;
  private _publicClient: ViemPublicClient | null = null;
  private _viem: ViemModule | null = null; // Dynamically imported viem module

  /**
   * Initialize adapter with viem WalletClient or PublicClient
   *
   * @param client - viem WalletClient (for transactions) or PublicClient (read-only)
   * @throws {ClientSDKError} When client is invalid or viem is not installed
   */
  constructor(client: ViemClient) {
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
   * @throws {ClientSDKError} When transaction fails or is rejected
   */
  async sendTransaction(request: UniversalTransactionRequest): Promise<string> {
    try {
      const walletClient = this._getWalletClient();
      await this._ensureAddress();

      // Convert universal request to viem transaction request
      const viemRequest = this._convertToViemRequest(request);

      // Send transaction using viem
      const walletClientTyped = walletClient;
      const hash = await walletClientTyped.sendTransaction(viemRequest);

      return hash;
    } catch (error) {
      throw this._wrapError(error, 'sendTransaction', { request });
    }
  }

  async sendTransactionWithConfirmation(
    request: UniversalTransactionRequest,
    options: { confirmations?: number } = {},
  ): Promise<UniversalTransactionResponse> {
    const confirmations = options.confirmations ?? 1;
    const networkId = await this.getConnectedNetworkId();
    try {
      const hash = (await this.sendTransaction(request)) as `0x{string}`;

      // waitForViemReceipt handles TransactionReplaced internally
      const receipt = await this._waitForViemReceipt(hash, confirmations);
      const baseResponse = this._convertToUniversalResponse(networkId, hash, receipt);

      return baseResponse;
    } catch (error) {
      throw this._wrapError(error, 'sendTransactionWithConfirmation', { request, confirmations });
    }
  }

  /**
   * Get token balance for connected wallet
   *
   * @param tokenAddress - ERC-20 token address (optional, defaults to native token)
   * @returns Promise resolving to Money instance with balance
   * @throws {ClientSDKError} When balance query fails
   */
  async getBalance(tokenAddress?: string): Promise<Money> {
    try {
      await this._ensureAddress();
      const publicClient = this._getPublicClient();
      const networkId = await this.getConnectedNetworkId();

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance using viem
        const publicClientTyped = publicClient;
        const balance = await publicClientTyped.getBalance({
          address: this._address as ViemAddress,
        });

        // Convert viem bigint to ethers BigNumber for Money class
        const ethersBN = ethers.BigNumber.from(balance.toString());

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
        const ethersBN = ethers.BigNumber.from(balance.toString());
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
   * @throws {ClientSDKError} When network query fails
   */
  async getConnectedNetworkId(): Promise<number> {
    try {
      const publicClient = this._getPublicClient();
      const chainId = await publicClient.getChainId();
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
   * @throws {ClientSDKError} When network switch fails or is rejected
   */
  async switchNetwork(chainId: number): Promise<void> {
    try {
      const walletClient = this._getWalletClient();

      // Use viem's switchChain action
      const walletClientTyped = walletClient;
      await walletClientTyped.switchChain({ id: chainId });
    } catch (error) {
      throw this._wrapError(error, 'switchNetwork', { chainId });
    }
  }

  /**
   * Sign a message with the connected wallet
   *
   * @param message - Message to sign
   * @returns Promise resolving to signature string
   * @throws {ClientSDKError} When signing fails or is rejected
   */
  async signMessage(message: string): Promise<string> {
    try {
      const walletClient = this._getWalletClient();
      await this._ensureAddress();

      const walletClientTyped = walletClient;
      const signature = await walletClientTyped.signMessage({
        account: this._address as ViemAddress,
        message,
      });

      return signature;
    } catch (error) {
      throw this._wrapError(error, 'signMessage', { message });
    }
  }

  /**
   * Send raw RPC calls to the wallet provider
   * Useful for wallet-specific methods like adding custom networks, tokens, etc.
   *
   * @param method - RPC method name (e.g., 'wallet_addEthereumChain')
   * @param params - Method parameters
   * @returns Promise resolving to the RPC response
   * @throws {ClientSDKError} When RPC call fails or is not supported
   */
  async sendCalls(method: string, params?: unknown[]): Promise<unknown> {
    try {
      const client = this._walletClient || this._publicClient;

      if (!client) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'No client available to send RPC calls');
      }

      // Access the transport's request method
      const transport = (client as { transport?: unknown }).transport;

      if (transport && typeof transport === 'object' && 'request' in transport) {
        const transportWithRequest = transport as {
          request: (params: unknown) => Promise<unknown>;
        };
        return await transportWithRequest.request({
          method,
          params,
        });
      }

      // If the client itself has a request method (some viem configurations)
      const clientWithRequest = client as unknown as Record<string, unknown>;
      if (typeof clientWithRequest.request === 'function') {
        return await (clientWithRequest.request as (params: unknown) => Promise<unknown>)({
          method,
          params,
        });
      }

      throw new ClientSDKError(
        ErrorCode.UNSUPPORTED_TYPE,
        `Client does not support RPC method calls. The sendCalls method requires a client with accessible transport.`,
      );
    } catch (error) {
      throw this._wrapError(error, 'sendCalls', { method, params });
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Dynamically import viem to avoid hard dependency
   */
  protected _initializeViem(): void {
    try {
      // Try to require viem - this will throw if not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this._viem = require('viem') as ViemModule;
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
    if (!this._viem) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Viem module not properly initialized');
    }

    const { createPublicClient } = this._viem;

    if (typeof createPublicClient !== 'function') {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'createPublicClient function not found in viem module',
      );
    }

    const clientWithProps = walletClient as ViemWalletClient & {
      chain?: unknown;
      transport?: unknown;
    };

    const { chain, transport } = clientWithProps;

    if (!chain || !transport) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Wallet client missing chain or transport required to create public client',
      );
    }

    type PublicClientConfig = Parameters<typeof createPublicClient>[0];

    const config: PublicClientConfig = {
      chain: chain as PublicClientConfig['chain'],
      transport: transport as unknown as PublicClientConfig['transport'],
    };

    return createPublicClient(config) as ViemPublicClient;
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
        const walletClient = this._walletClient;

        // Get address from wallet client
        if (walletClient.account) {
          // Account is hoisted on the client
          const account = walletClient.account;
          if ('address' in account && typeof account.address === 'string') {
            this._address = account.address;
          } else {
            throw new ClientSDKError(
              ErrorCode.INVALID_INPUT,
              'Invalid account address format in wallet client',
            );
          }
        } else if (typeof walletClient.getAddresses === 'function') {
          // Get addresses from provider (JSON-RPC account)
          const addresses = await walletClient.getAddresses();
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
  private _convertToViemRequest(
    request: UniversalTransactionRequest,
  ): Parameters<ViemWalletClient['sendTransaction']>[0] {
    const viemRequest: Record<string, unknown> = {
      to: request.to as ViemAddress,
    };

    // Add account if not hoisted
    const walletClient = this._walletClient;
    if (!walletClient?.account) {
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

    return viemRequest as Parameters<ViemWalletClient['sendTransaction']>[0];
  }

  /**
   * Convert viem transaction hash to universal response format
   */
  private _convertToUniversalResponse(
    chainId: number,
    hash: ViemHash,
    receipt: Viem.TransactionReceipt,
  ): UniversalTransactionResponse {
    const hashStr = hash as string;

    const response: UniversalTransactionResponse = {
      hash: hashStr,
      from: (receipt.from as string) || this._address || '',
      to: (receipt.to as string) || '',
      status: 'pending', // viem sendTransaction only returns hash, transaction is initially pending
      chainId,
    };

    return response;
  }

  private async _waitForViemReceipt(hash: ViemHash, confirmations: number) {
    const publicClient = this._getPublicClient();
    const publicClientTyped = publicClient;

    return await publicClientTyped.waitForTransactionReceipt({
      hash,
      confirmations,
    });
  }

  /**
   * Create a mock ethers provider that implements the minimal interface needed by Money class
   */
  private _createMockEthersProvider(publicClient: ViemPublicClient): Record<string, unknown> {
    const client = publicClient;

    return {
      // Mock the methods that Money class might use
      getNetwork: async () => ({
        chainId: await client.getChainId(),
      }),
      // Add other methods as needed by the Money class
    };
  }

  /**
   * Normalize errors into ClientSDKError instances
   */
  private _wrapError(error: unknown, method?: string, params?: unknown): ClientSDKError {
    // Determine error code based on error type
    let code = ErrorCode.UNKNOWN_ERROR;
    let message = 'An unexpected error occurred';

    if (error instanceof ClientSDKError) {
      // Re-throw ClientSDK errors directly
      throw error;
    }

    // Handle viem-specific errors with type guards
    const errorObj = error as Record<string, unknown> & {
      code?: string | number;
      message?: string;
      data?: { message?: string };
      cancelled?: boolean;
      replacement?: unknown;
      name?: string;
      cause?: { reason?: string };
    };

    const errorMessage = errorObj?.message?.toLowerCase() ?? '';
    const dataMessage = (errorObj?.data?.message as string)?.toLowerCase() ?? '';
    const causeReason = (errorObj?.cause?.reason as string)?.toLowerCase() ?? '';

    // Handle user rejection cases (viem specific and standard)
    if (
      errorObj?.name === 'UserRejectedRequestError' ||
      errorObj?.code === 'ACTION_REJECTED' ||
      errorObj?.code === 4001 || // MetaMask user rejected
      errorMessage.includes('user denied transaction signature') ||
      errorMessage.includes('userrefusedondevice') ||
      (errorMessage.includes('cancelled') && !errorObj?.cancelled) ||
      errorMessage.includes('rejected transaction') ||
      dataMessage.includes('rejected transaction') ||
      errorMessage.includes('user rejected')
    ) {
      code = ErrorCode.TRANSACTION_REJECTED;
      message = 'Transaction Rejected';
    }
    // Handle network switch rejection
    else if (errorObj?.code === 4902) {
      code = ErrorCode.NETWORK_ERROR;
      message = 'Network not available in wallet';
    }
    // Handle transaction replacement cases (viem specific)
    else if (
      errorObj?.name === 'TransactionReplacedError' ||
      errorObj?.code === 'TRANSACTION_REPLACED'
    ) {
      code = ErrorCode.TRANSACTION_REPLACED;
      if (errorObj.cancelled) {
        message = 'Transaction was cancelled';
      } else if (errorObj.replacement) {
        message = 'Transaction was replaced with a new transaction (usually due to speed up)';
      }
    }
    // Handle Ledger specific errors
    else if (errorMessage.includes('ledger') || dataMessage.includes('ledger')) {
      code = ErrorCode.HARDWARE_WALLET_ERROR;
      message = 'Error with Ledger device. Please ensure device is connected and unlocked';
    }
    // Handle pending transaction errors
    else if (
      errorObj?.code === -32002 &&
      errorMessage.includes('pending') &&
      dataMessage.includes('pending')
    ) {
      code = ErrorCode.TRANSACTION_PENDING;
      message = 'Transaction already pending in wallet. Please check your wallet';
    }
    // Handle invalid amount errors
    else if (dataMessage.includes('invalid amount') || errorMessage.includes('invalid amount')) {
      code = ErrorCode.INVALID_INPUT;
      message = 'Price calculation is incorrect, contact support!';
    }
    // Handle insufficient funds (viem specific and standard)
    else if (
      errorObj?.name === 'InsufficientFundsError' ||
      errorObj?.code === 'INSUFFICIENT_FUNDS' ||
      dataMessage.includes('insufficient funds') ||
      errorMessage.includes('insufficient funds') ||
      causeReason.includes('insufficient funds')
    ) {
      code = ErrorCode.INSUFFICIENT_FUNDS;
      message =
        'Your wallet does not have enough funds to complete this transaction. Please try again with a different wallet or add more funds to your wallet.';
    }
    // Handle insufficient balance for transaction
    else if (
      dataMessage.includes('balance too low to proceed') ||
      errorMessage.includes('balance too low to proceed')
    ) {
      code = ErrorCode.INSUFFICIENT_FUNDS;
      message =
        'Your wallet does not have enough funds to complete this transaction. Please try again with a different wallet or add more funds to your wallet.';
    }
    // Handle nonce too low errors
    else if (
      errorObj?.name === 'NonceExhaustedError' ||
      dataMessage.includes('nonce too low') ||
      errorMessage.includes('nonce too low')
    ) {
      code = ErrorCode.NONCE_ERROR;
      message = 'Transaction nonce is too low. Please try again';
    }
    // Handle gas price too low (viem specific)
    else if (
      errorObj?.name === 'FeeCapTooLowError' ||
      errorMessage.includes('max fee per gas less than block base fee') ||
      dataMessage.includes('max fee per gas less than block base fee')
    ) {
      code = ErrorCode.GAS_PRICE_TOO_LOW;
      message = 'Gas price too low for current network conditions. Please try again';
    }
    // Handle timeout errors (viem specific)
    else if (
      errorObj?.name === 'TimeoutError' ||
      errorObj?.code === 'TIMEOUT' ||
      dataMessage.includes('timeout') ||
      errorMessage.includes('timeout')
    ) {
      code = ErrorCode.TIMEOUT;
      message =
        'Transaction timed out. Your wallet connection is having issues. Disconnect and reconnect your wallet, then please try again';
    }
    // Handle network disconnection
    else if (
      dataMessage.includes('network disconnected') ||
      errorMessage.includes('network disconnected')
    ) {
      code = ErrorCode.NETWORK_ERROR;
      message = 'Network connection lost. Please check your internet connection and try again';
    }
    // Handle wrong network errors (viem specific)
    else if (
      errorObj?.name === 'ChainMismatchError' ||
      dataMessage.includes('wrong network') ||
      errorMessage.includes('wrong network')
    ) {
      code = ErrorCode.WRONG_NETWORK;
      message = 'Wrong network selected. Please switch to the correct network';
    }
    // Handle user balance too low to pay for gas fees
    else if (
      dataMessage.includes('insufficient funds for gas') ||
      errorMessage.includes('insufficient funds for gas')
    ) {
      code = ErrorCode.INSUFFICIENT_FUNDS;
      message =
        'Your wallet does not have enough funds to pay for gas fees. Please try again with a different wallet or add more funds to your wallet.';
    }
    // Handle ERC20 transfer amount exceeds balance
    else if (errorMessage.includes('erc20: transfer amount exceeds balance')) {
      code = ErrorCode.INSUFFICIENT_FUNDS;
      message = 'You do not have the required amount of ERC20 tokens to complete this transaction.';
    }
    // Handle base case gas estimation failures (viem specific)
    else if (
      errorObj?.name === 'EstimateGasExecutionError' ||
      errorObj?.code === 'UNPREDICTABLE_GAS_LIMIT' ||
      errorMessage.includes('cannot estimate gas') ||
      dataMessage.includes('cannot estimate gas')
    ) {
      code = ErrorCode.GAS_ESTIMATION_FAILED;
      console.error('Gas estimation error:', error);
      message =
        'Unable to estimate gas for transaction. The transaction may fail. Please try again.';
    }
    // Handle call exceptions (viem specific)
    else if (
      errorObj?.name === 'ContractFunctionExecutionError' ||
      errorObj?.code === 'CALL_EXCEPTION'
    ) {
      code = ErrorCode.CONTRACT_ERROR;
      message = 'Transaction failed due to contract execution error';
    }
    // Handle revert errors (viem specific)
    else if (
      errorObj?.name === 'ContractFunctionRevertedError' ||
      errorMessage.includes('revert') ||
      errorMessage.includes('reverted')
    ) {
      code = ErrorCode.TRANSACTION_REVERTED;
      message = 'Transaction reverted';
    }
    // Handle transaction execution errors (viem specific)
    else if (errorObj?.name === 'TransactionExecutionError') {
      code = ErrorCode.TRANSACTION_FAILED;
      message = 'Transaction execution failed';
    }
    // Handle network errors
    else if (
      errorObj?.code === 'NETWORK_ERROR' ||
      errorMessage.includes('network') ||
      errorObj?.name === 'HttpRequestError'
    ) {
      code = ErrorCode.NETWORK_ERROR;
      message = 'Network error occurred';
    }
    // Default case - use original message if available
    else if (errorObj?.message) {
      // For debugging purposes, log the full error
      console.error('Transaction error:', error);
      message = 'Transaction failed. Please try again. If it fails again, please contact support.';
    }

    return new ClientSDKError(code, message, {
      adapterCode: code,
      adapterType: this.adapterType,
      method,
      params,
      originalError: error instanceof Error ? error : undefined,
    });
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

  return new ViemAdapter(client as ViemClient);
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
