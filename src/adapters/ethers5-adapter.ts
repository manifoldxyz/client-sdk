import { ethers } from 'ethers';
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
import { checkERC20Balance } from '../utils/gas-estimation';

// =============================================================================
// ERC-20 CONSTANTS
// =============================================================================

/**
 * Standard ERC-20 ABI fragments for balance and metadata queries
 * Note: Currently using utility functions from gas-estimation.ts
 */
// const ERC20_ABI = [
//   'function balanceOf(address owner) view returns (uint256)',
//   'function decimals() view returns (uint8)',
//   'function symbol() view returns (string)',
// ] as const;

// =============================================================================
// ETHERS V5 ADAPTER IMPLEMENTATION
// =============================================================================

/**
 * Account adapter implementation for ethers.js v5.x
 *
 * Provides a unified interface for wallet operations across different Web3 libraries.
 * This adapter specifically handles ethers v5 Provider and Signer instances.
 *
 * @example
 * ```typescript
 * import { ethers } from 'ethers'; // v5
 * import { Ethers5Adapter } from './adapters/ethers5-adapter';
 *
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 * const adapter = new Ethers5Adapter(signer);
 *
 * // Use unified interface
 * const balance = await adapter.getBalance();
 * const networkId = await adapter.getConnectedNetworkId();
 * ```
 */
export class Ethers5Adapter implements IAccountAdapter {
  readonly adapterType: AdapterType = 'ethers5';

  private _address: string | null = null;
  private _provider: ethers.providers.Provider;
  private _signer: ethers.Signer | null;

  /**
   * Initialize adapter with ethers v5 provider or signer
   *
   * @param providerOrSigner - ethers v5 Provider or Signer instance
   * @throws {ClientSDKError} When provider is invalid or missing account
   */
  constructor(providerOrSigner: ethers.providers.Provider | ethers.Signer) {
    if (this._isProvider(providerOrSigner)) {
      this._provider = providerOrSigner;
      this._signer = null;
    } else if (this._isSigner(providerOrSigner)) {
      this._signer = providerOrSigner;
      this._provider = providerOrSigner.provider!;

      if (!this._provider) {
        throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Signer must have a connected provider');
      }
    } else {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Invalid provider or signer instance for ethers v5',
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
      const signer = await this._getSigner();
      await this._ensureAddress();

      // Convert universal request to ethers v5 transaction request
      const ethersRequest = this._convertToEthersRequest(request);

      // Send transaction
      const tx = await signer.sendTransaction(ethersRequest);

      // Convert response to universal format
      return this._convertToUniversalResponse(tx);
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

      if (!tokenAddress || tokenAddress === ethers.constants.AddressZero) {
        // Get native token balance
        const balance = await this._provider.getBalance(this._address!);

        return Money.create({
          value: balance,
          networkId,
          provider: this._provider as
            | ethers.providers.JsonRpcProvider
            | ethers.providers.Web3Provider,
          fetchUSD: true,
        });
      } else {
        // Get ERC-20 token balance
        const balance = await checkERC20Balance(tokenAddress, this._address!, this._provider);

        return Money.create({
          value: balance,
          networkId,
          erc20: tokenAddress,
          provider: this._provider as
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
      const network = await this._provider.getNetwork();
      return network.chainId;
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
      // For ethers v5, we need to use the provider's request method if available
      const provider = this._provider as unknown as Record<string, unknown>;

      if (typeof provider.request === 'function') {
        // This is likely a Web3Provider connected to MetaMask or similar
        await (provider.request as (params: unknown) => Promise<unknown>)({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } else {
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_TYPE,
          'Network switching not supported by this provider',
        );
      }
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
      const signer = await this._getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      throw this._wrapError(error, 'signMessage', { message });
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Type guard to check if object is an ethers v5 Provider
   */
  private _isProvider(obj: unknown): obj is ethers.providers.Provider {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const provider = obj as Record<string, unknown>;
    return (
      typeof provider.getNetwork === 'function' &&
      typeof provider.getBalance === 'function' &&
      !provider.signTransaction
    ); // Signer has signTransaction, Provider doesn't
  }

  /**
   * Type guard to check if object is an ethers v5 Signer
   */
  private _isSigner(obj: unknown): obj is ethers.Signer {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const signer = obj as Record<string, unknown>;
    return typeof signer.signTransaction === 'function' && typeof signer.getAddress === 'function';
  }

  /**
   * Get signer instance, throwing error if only provider is available
   */
  private async _getSigner(): Promise<ethers.Signer> {
    if (this._signer) {
      return this._signer;
    }

    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      'No signer available. Cannot perform transactions with read-only provider.',
    );
  }

  /**
   * Ensure address is initialized by fetching it from signer
   */
  private async _ensureAddress(): Promise<void> {
    if (!this._address) {
      if (this._signer) {
        this._address = await this._signer.getAddress();
      } else {
        throw new ClientSDKError(
          ErrorCode.INVALID_INPUT,
          'Cannot get address from read-only provider',
        );
      }
    }
  }

  /**
   * Convert universal transaction request to ethers v5 format
   */
  private _convertToEthersRequest(
    request: UniversalTransactionRequest,
  ): ethers.providers.TransactionRequest {
    const ethersRequest: ethers.providers.TransactionRequest = {
      to: request.to,
    };

    if (request.value) {
      ethersRequest.value = ethers.BigNumber.from(request.value);
    }

    if (request.data) {
      ethersRequest.data = request.data;
    }

    if (request.gasLimit) {
      ethersRequest.gasLimit = ethers.BigNumber.from(request.gasLimit);
    }

    if (request.nonce !== undefined) {
      ethersRequest.nonce = request.nonce;
    }

    if (request.chainId !== undefined) {
      ethersRequest.chainId = request.chainId;
    }

    if (request.type !== undefined) {
      ethersRequest.type = request.type;
    }

    // Handle gas pricing (legacy vs EIP-1559)
    if (request.gasPrice) {
      ethersRequest.gasPrice = ethers.BigNumber.from(request.gasPrice);
    } else if (request.maxFeePerGas && request.maxPriorityFeePerGas) {
      ethersRequest.maxFeePerGas = ethers.BigNumber.from(request.maxFeePerGas);
      ethersRequest.maxPriorityFeePerGas = ethers.BigNumber.from(request.maxPriorityFeePerGas);
    }

    return ethersRequest;
  }

  /**
   * Convert ethers v5 transaction response to universal format
   */
  private _convertToUniversalResponse(
    tx: ethers.providers.TransactionResponse,
  ): UniversalTransactionResponse {
    const response: UniversalTransactionResponse = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      confirmations: tx.confirmations,
      nonce: tx.nonce,
      chainId: tx.chainId,
    };

    if (tx.blockNumber) {
      response.blockNumber = tx.blockNumber;
    }

    if (tx.blockHash) {
      response.blockHash = tx.blockHash;
    }

    // Note: gasUsed and effectiveGasPrice are not available on TransactionResponse
    // They would be available on TransactionReceipt after waiting for confirmation
    // if (tx.gasUsed) {
    //   response.gasUsed = tx.gasUsed.toString();
    // }

    // if (tx.effectiveGasPrice) {
    //   response.effectiveGasPrice = tx.effectiveGasPrice.toString();
    // }

    // Determine transaction status
    if (tx.confirmations === 0) {
      response.status = 'pending';
    } else if (tx.confirmations > 0) {
      response.status = 'confirmed';
    }

    return response;
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

    const errorObj = error as Record<string, unknown>;

    if (
      errorObj?.code === 4001 ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('User denied'))
    ) {
      code = 'TRANSACTION_REJECTED';
      message = 'Transaction was rejected by user';
    } else if (
      errorObj?.code === 'INSUFFICIENT_FUNDS' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('insufficient funds'))
    ) {
      code = 'INSUFFICIENT_BALANCE';
      message = 'Insufficient balance for transaction';
    } else if (
      errorObj?.code === 'NETWORK_ERROR' ||
      (typeof errorObj?.message === 'string' && errorObj.message.includes('network'))
    ) {
      code = 'NETWORK_MISMATCH';
      message = 'Network error occurred';
    } else if (typeof errorObj?.message === 'string' && errorObj.message.includes('timeout')) {
      code = 'TIMEOUT';
      message = 'Operation timed out';
    } else if (
      typeof errorObj?.message === 'string' &&
      (errorObj.message.includes('revert') || errorObj.message.includes('reverted'))
    ) {
      code = 'TRANSACTION_FAILED';
      message = 'Transaction reverted';
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
 * Create Ethers5Adapter from ethers v5 provider or signer
 *
 * @param provider - ethers v5 Provider or Signer instance
 * @returns Ethers5Adapter instance
 * @throws {ClientSDKError} When provider is invalid
 *
 * @example
 * ```typescript
 * import { ethers } from 'ethers'; // v5
 * import { createEthers5Adapter } from './adapters/ethers5-adapter';
 *
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 * const adapter = createEthers5Adapter(signer);
 * ```
 */
export function createEthers5Adapter(provider: unknown): IAccountAdapter {
  if (!provider || typeof provider !== 'object') {
    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      'Provider must be a valid ethers v5 Provider or Signer instance',
    );
  }

  return new Ethers5Adapter(provider as ethers.providers.Provider | ethers.Signer);
}

// =============================================================================
// TYPE GUARDS AND DETECTION
// =============================================================================

/**
 * Detect if a provider instance is compatible with ethers v5
 *
 * @param provider - Unknown provider instance
 * @returns True if provider appears to be ethers v5 compatible
 */
export function isEthers5Compatible(provider: unknown): boolean {
  if (!provider || typeof provider !== 'object') {
    return false;
  }

  const obj = provider as Record<string, unknown>;

  // Check for ethers v5 specific patterns
  const hasProviderMethods =
    typeof obj.getNetwork === 'function' && typeof obj.getBalance === 'function';

  const hasSignerMethods =
    typeof obj.signTransaction === 'function' && typeof obj.getAddress === 'function';

  // Must have either provider or signer methods
  if (!hasProviderMethods && !hasSignerMethods) {
    return false;
  }

  // Check for ethers v5 specific properties (not present in v6)
  const providerObj = obj.provider as Record<string, unknown> | undefined;
  const hasV5Properties =
    obj._isProvider === true || // ethers v5 providers have this
    (providerObj && providerObj._isProvider === true); // signers reference providers

  // Check for v6-like patterns that should be rejected
  const requestObj = obj.request as Record<string, unknown> | undefined;
  const hasV6Patterns =
    (requestObj?.constructor as Record<string, unknown> | undefined)?.name
      ?.toString()
      .includes('v6') || false;

  return Boolean(hasV5Properties) && !hasV6Patterns;
}
