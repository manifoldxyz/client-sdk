import type {
  IAccount,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AdapterType,
} from '../types/account-adapter';
import { Money } from '../libs/money';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { ethers } from 'ethers';

// =============================================================================
// VIEM TYPE IMPORTS
// =============================================================================

import type { WalletClient, PublicClient, TransactionReceipt } from 'viem';

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
class ViemAccount implements IAccount {
  readonly adapterType: AdapterType = 'viem';
  _address: string;

  private _walletClient: WalletClient;
  private _publicClient: PublicClient;

  /**
   * Initialize adapter with viem WalletClient or PublicClient
   *
   * @param client - Manifold client instance
   * @param provider - Object containing viem wallet or public client
   * @throws {ClientSDKError} When client is invalid or viem is not installed
   */
  constructor(provider: { walletClient: WalletClient; publicClient: PublicClient }) {
    const { walletClient, publicClient } = provider;
    this._walletClient = walletClient;
    const account = this._walletClient.account;
    if (!account) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Account not foud, please pass Account explicitly when creating viem client.',
      );
    }
    this._publicClient = publicClient;
    this._address = account.address;
  }

  /**
   * Get wallet address
   */
  async getAddress(): Promise<string> {
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
      // Convert universal request to viem transaction request
      const viemRequest = this._convertToViemRequest(request);

      // Send transaction using viem
      const hash = await this._walletClient.sendTransaction(viemRequest);

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
      const hash = (await this.sendTransaction(request)) as `0x${string}`;

      // waitForViemReceipt handles TransactionReplaced internally
      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });
      const baseResponse = this._convertToUniversalResponse(networkId, hash, receipt);

      return baseResponse;
    } catch (error) {
      throw this._wrapError(error, 'sendTransactionWithConfirmation', { request, confirmations });
    }
  }

  /**
   * Get token balance for connected wallet
   *
   * @param networkId - Network ID to get balance on
   * @param tokenAddress - ERC-20 token address (optional, defaults to native token)
   * @returns Promise resolving to Money instance with balance
   * @throws {ClientSDKError} When balance query fails
   */
  async getBalance(networkId: number, tokenAddress?: string): Promise<Money> {
    try {
      // Switch to the requested network if needed
      const currentNetworkId = await this.getConnectedNetworkId();
      if (currentNetworkId !== networkId) {
        await this.switchNetwork(networkId);
      }

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance using viem
        const balance = await this._publicClient.getBalance({
          address: this._address as `0x${string}`,
        });

        // Convert viem bigint to ethers BigNumber for Money class
        const ethersBN = ethers.BigNumber.from(balance.toString());

        return Money.create({
          value: ethersBN,
          networkId,
          fetchUSD: true,
        });
      } else {
        // Get ERC-20 token balance using viem
        const balance = await this._checkERC20BalanceViem(
          tokenAddress,
          this._address,
          this._publicClient,
        );

        // Convert viem bigint to ethers BigNumber
        const ethersBN = ethers.BigNumber.from(balance.toString());

        return Money.create({
          value: ethersBN,
          networkId,
          erc20: tokenAddress,
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
      const chainId = await this._walletClient.getChainId();
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
      // Use viem's switchChain action
      await this._walletClient.switchChain({ id: chainId });
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
      const signature = await this._walletClient.signMessage({
        account: this._address as `0x${string}`,
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
   * Check ERC20 token balance using viem client
   */
  private async _checkERC20BalanceViem(
    tokenAddress: string,
    ownerAddress: string,
    publicClient: Pick<PublicClient, 'readContract'>,
  ): Promise<bigint> {
    const erc20Abi = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ] as const;

    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [ownerAddress as `0x${string}`],
    });

    return balance;
  }

  /**
   * Convert universal transaction request to viem format
   */
  private _convertToViemRequest(
    request: UniversalTransactionRequest,
  ): Parameters<WalletClient['sendTransaction']>[0] {
    const viemRequest: Record<string, unknown> = {
      to: request.to,
    };

    // Add account if not hoisted
    const walletClient = this._walletClient;
    if (!walletClient?.account && this._address) {
      viemRequest.account = this._address;
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

    return viemRequest as Parameters<WalletClient['sendTransaction']>[0];
  }

  /**
   * Convert viem transaction hash to universal response format
   */
  private _convertToUniversalResponse(
    chainId: number,
    hash: string,
    receipt: TransactionReceipt,
  ): UniversalTransactionResponse {
    const hashStr = hash as `0x${string}`;

    const response: UniversalTransactionResponse = {
      hash: hashStr,
      from: receipt.from,
      to: (receipt.to as string) || '',
      chainId,
    };

    return response;
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

function createAccount(provider: { walletClient: WalletClient; publicClient: PublicClient }) {
  return new ViemAccount(provider);
}

export { createAccount };
