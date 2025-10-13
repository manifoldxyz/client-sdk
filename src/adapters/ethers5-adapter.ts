import { ethers } from 'ethers';
import type {
  IAccountAdapter,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AdapterType,
} from '../types/account-adapter';
import { Money } from '../libs/money';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { checkERC20Balance } from '../utils/gas-estimation';
import type { ManifoldClient } from '../types';
import { ensureConnectedNetwork } from '../utils';
import type { NetworkConfigs } from '../utils/transactions';

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
 * import { Ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';
 *
 * // Browser wallet (MetaMask, etc.)
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 * const adapter = new Ethers5Adapter(client, { signer });
 *
 * // Private key wallet (server-side)
 * const wallet = new ethers.Wallet(privateKey, provider);
 * const adapter = new Ethers5Adapter(client, { wallet });
 *
 * // Use unified interface for purchases
 * const balance = await adapter.getBalance();
 * const tx = await adapter.sendTransaction(txRequest);
 * ```
 *
 * @public
 */
export class Ethers5Adapter implements IAccountAdapter {
  readonly adapterType: AdapterType = 'ethers5';

  private _signer: ethers.providers.JsonRpcSigner | undefined;
  private _wallet: ethers.Wallet | undefined;
  private _client: ManifoldClient;
  readonly address: string;

  /**
   * Initialize adapter with ethers v5 provider or signer.
   *
   * @param client - The ManifoldClient instance
   * @param provider - Provider configuration
   * @param provider.signer - ethers v5 JsonRpcSigner (for browser wallets)
   * @param provider.wallet - ethers v5 Wallet (for private key wallets)
   *
   * @throws {ClientSDKError} When:
   * - Neither signer nor wallet is provided
   * - Both signer and wallet are provided
   *
   * @example
   * ```typescript
   * // Browser wallet
   * const signer = provider.getSigner();
   * const adapter = new Ethers5Adapter(client, { signer });
   *
   * // Private key wallet
   * const wallet = new ethers.Wallet(privateKey);
   * const adapter = new Ethers5Adapter(client, { wallet });
   * ```
   */
  constructor(
    client: ManifoldClient,
    provider: {
      signer?: ethers.providers.JsonRpcSigner;
      wallet?: ethers.Wallet;
    },
  ) {
    const { signer, wallet } = provider;

    this._client = client;
    if (!signer && !wallet) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Signer or wallet is required');
    }
    if (signer && wallet) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Provide either signer or wallet, not both',
      );
    }
    if (wallet) {
      this._wallet = wallet;
    }
    if (signer) {
      this._signer = signer;
    }
    this.address = this._signer?._address || this._wallet?.address || '';
  }

  // Optionally specify a networkId to ensure the provider is on the correct network
  async getProvider(networkId?: number) {
    if (!networkId) {
      // We don't care about the networkId of the provider
      const provider = this._signer || this._wallet;
      if (!provider)
        throw new ClientSDKError(
          ErrorCode.UNKNOWN_ERROR,
          `Unknown error, could not locate provider`,
        );
      return provider;
    }
    // We do care about the networkId of the provider, need to ensure we are on the correct network
    const signer = this._signer;
    if (signer) {
      await this.switchNetwork(networkId);
      return signer;
    }
    const wallet = this._wallet;
    if (!wallet) {
      throw new ClientSDKError(ErrorCode.UNKNOWN_ERROR, `Unknown error, could not locate wallet`);
    }
    // Make sure the wallet is connected to the proper rpc
    const provider = this._client.providers?.[networkId];
    if (!provider) {
      throw new ClientSDKError(
        ErrorCode.MISSING_RPC_URL,
        `Missing RPC Url for networkId ${networkId}`,
      );
    }
    return wallet.connect(provider);
  }

  /**
   * Get wallet address (cached after first call)
   */
  async getAddress(): Promise<string> {
    return this._wallet?.address || this._signer!.getAddress();
  }

  /**
   * Send a transaction through the connected wallet
   *
   * @param request - Universal transaction request
   * @returns Promise resolving to universal transaction response
   * @throws {ClientSDKError} When transaction fails or is rejected
   */
  async sendTransaction(request: UniversalTransactionRequest): Promise<string> {
    const { chainId } = request;
    try {
      const provider = await this.getProvider(chainId);
      // Convert universal request to ethers v5 transaction request
      const ethersRequest = this._convertToEthersRequest(request);

      // Send transaction
      const tx = await provider.sendTransaction(ethersRequest);

      return tx.hash;
    } catch (error) {
      throw this._wrapError(error, 'sendTransaction', { request });
    }
  }

  async sendTransactionWithConfirmation(
    request: UniversalTransactionRequest,
    options: { confirmations?: number } = {},
  ): Promise<UniversalTransactionResponse> {
    const confirmations = options.confirmations ?? 1;
    const { chainId } = request;

    try {
      const provider = await this.getProvider(chainId);
      const ethersRequest = this._convertToEthersRequest(request);
      const tx = await provider.sendTransaction(ethersRequest);
      const receipt = await tx.wait(confirmations);
      return this._convertToUniversalResponse(tx, receipt);
    } catch (error) {
      const replacementReceipt = await this._handleReplacementTransaction(error, confirmations);
      if (replacementReceipt) {
        return this._createResponseFromReceipt(replacementReceipt, request, chainId);
      }

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
  async getBalance(networkId: number, tokenAddress?: string): Promise<Money> {
    try {
      let networkProvider:
        | ethers.providers.JsonRpcSigner
        | ethers.providers.JsonRpcProvider
        | undefined = this._client?.providers?.[networkId];
      if (!networkProvider) {
        // Try using signer provider
        await this.switchNetwork(networkId);
        networkProvider = this._signer;
      }
      if (!networkProvider) {
        throw new ClientSDKError(
          ErrorCode.UNKNOWN_ERROR,
          `Missing network provider for networkId ${networkId}`,
        );
      }
      if (!tokenAddress || tokenAddress === ethers.constants.AddressZero) {
        const address = await this.getAddress()
        // Get native token balance
        const balance = await (
          networkProvider as ethers.providers.JsonRpcSigner
        ).provider.getBalance(address);

        return Money.create({
          value: balance,
          networkId,
          fetchUSD: true,
        });
      } else {
        // Get ERC-20 token balance
        const balance = await checkERC20Balance(tokenAddress, this.address, networkProvider);

        return Money.create({
          value: balance,
          networkId,
          erc20: tokenAddress,
          provider: this._signer,
          fetchUSD: true,
        });
      }
    } catch (error) {
      console.error(error);
      throw this._wrapError(error, 'getBalance', { tokenAddress });
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
    if (this._wallet) {
      return;
    }
    const signer = this._signer;
    if (signer) {
      try {
        await ensureConnectedNetwork({
          getConnectedNetwork: () => signer.getChainId(),
          switchNetwork: () =>
            signer.provider.send('wallet_switchEthereumChain', [
              { chainId: `0x${chainId.toString(16)}` },
            ]),
          addNetwork: (networkConfig: NetworkConfigs) =>
            signer.provider.send('wallet_addEthereumChain', [networkConfig]),
          targetNetworkId: chainId,
        });
      } catch (error) {
        throw this._wrapError(error, 'switchNetwork', { chainId });
      }
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
    const provider = await this.getProvider();
    try {
      return provider.signMessage(message);
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
    if (this._wallet) {
      return;
    }
    if (this._signer) {
      try {
        const signerProvider = this._signer.provider;
        return signerProvider.send(method, params as unknown[]);
      } catch (error) {
        throw this._wrapError(error, 'sendCalls', { method, params });
      }
    }
    return;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

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
    txResponse: ethers.providers.TransactionResponse,
    receipt: ethers.providers.TransactionReceipt,
  ): UniversalTransactionResponse {
    const response: UniversalTransactionResponse = {
      hash: txResponse.hash,
      from: txResponse.from,
      to: txResponse.to || '',
      confirmations: txResponse.confirmations,
      nonce: txResponse.nonce,
      chainId: txResponse.chainId,
    };

    if (txResponse.blockNumber) {
      response.blockNumber = txResponse.blockNumber;
    }

    if (txResponse.blockHash) {
      response.blockHash = txResponse.blockHash;
    }

    // Note: gasUsed and effectiveGasPrice are not available on TransactionResponse
    // They would be available on TransactionReceipt after waiting for confirmation
    if (receipt.gasUsed) {
      response.gasUsed = receipt.gasUsed.toString();
    }

    if (receipt.effectiveGasPrice) {
      response.effectiveGasPrice = receipt.effectiveGasPrice.toString();
    }

    // Determine transaction status
    if (receipt.confirmations === 0) {
      response.status = 'pending';
    } else if (receipt.confirmations > 0) {
      response.status = 'confirmed';
    }

    return response;
  }

  private async _handleReplacementTransaction(
    error: unknown,
    confirmations: number,
  ): Promise<ethers.providers.TransactionReceipt | null> {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const err = error as Record<string, unknown> & {
      code?: unknown;
      cancelled?: boolean;
      replacement?: ethers.providers.TransactionResponse;
    };

    if (err.code === 'TRANSACTION_REPLACED' && !err.cancelled && err.replacement) {
      try {
        return await err.replacement.wait(confirmations);
      } catch (replacementError) {
        throw this._wrapError(replacementError, 'transactionReplacement', { confirmations });
      }
    }

    return null;
  }

  private _createResponseFromReceipt(
    receipt: ethers.providers.TransactionReceipt,
    request: UniversalTransactionRequest,
    networkId: number,
  ): UniversalTransactionResponse {
    return {
      hash: receipt.transactionHash,
      from: receipt.from ?? this.address ?? '',
      to: receipt.to ?? request.to ?? '',
      blockNumber: receipt.blockNumber ?? undefined,
      blockHash: receipt.blockHash ?? undefined,
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : undefined,
      effectiveGasPrice: receipt.effectiveGasPrice
        ? receipt.effectiveGasPrice.toString()
        : undefined,
      status: 'pending',
      confirmations: receipt.confirmations ?? 0,
      nonce: request.nonce,
      chainId: networkId,
    };
  }

  /**
   * Normalize errors into ClientSDKError instances
   */
  private _wrapError(error: unknown, method?: string, params?: unknown): ClientSDKError {
    // Determine error code based on error type
    let code: ErrorCode = ErrorCode.UNKNOWN_ERROR;
    let message = 'An unexpected error occurred';
    if (error instanceof ClientSDKError) {
      // Re-throw ClientSDK errors directly
      throw error;
    }

    const errorObj = error as Record<string, unknown> & {
      code?: string | number;
      message?: string;
      data?: { message?: string };
      cancelled?: boolean;
      replacement?: unknown;
    };

    const errorMessage = errorObj?.message?.toLowerCase() ?? '';
    const dataMessage = (errorObj?.data?.message as string)?.toLowerCase() ?? '';

    // Handle user rejection cases
    if (
      errorObj?.code === 'ACTION_REJECTED' ||
      errorObj?.code === 4001 || // MetaMask user rejected
      errorMessage.includes('user denied transaction signature') ||
      errorMessage.includes('userrefusedondevice') ||
      (errorMessage.includes('cancelled') && !errorObj?.cancelled) ||
      errorMessage.includes('rejected transaction') ||
      dataMessage.includes('rejected transaction')
    ) {
      code = ErrorCode.TRANSACTION_REJECTED;
      message = 'Transaction Rejected';
    }
    // Handle network switch rejection
    else if (errorObj?.code === 4902) {
      code = ErrorCode.NETWORK_ERROR;
      message = 'Network not available in wallet';
    }
    // Handle transaction replacement cases
    else if (errorObj?.code === 'TRANSACTION_REPLACED') {
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
    // Handle insufficient funds
    else if (
      errorObj?.code === 'INSUFFICIENT_FUNDS' ||
      dataMessage.includes('insufficient funds') ||
      errorMessage.includes('insufficient funds')
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
    else if (dataMessage.includes('nonce too low') || errorMessage.includes('nonce too low')) {
      code = ErrorCode.NONCE_ERROR;
      message = 'Transaction nonce is too low. Please try again';
    }
    // Handle gas price too low
    else if (
      errorMessage.includes('max fee per gas less than block base fee') ||
      dataMessage.includes('max fee per gas less than block base fee')
    ) {
      code = ErrorCode.GAS_PRICE_TOO_LOW;
      message = 'Gas price too low for current network conditions. Please try again';
    }
    // Handle timeout errors
    else if (
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
    // Handle wrong network errors
    else if (dataMessage.includes('wrong network') || errorMessage.includes('wrong network')) {
      code = ErrorCode.NETWORK_ERROR;
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
    // Handle base case gas estimation failures
    else if (
      errorObj?.code === 'UNPREDICTABLE_GAS_LIMIT' ||
      errorMessage.includes('cannot estimate gas') ||
      dataMessage.includes('cannot estimate gas')
    ) {
      code = ErrorCode.GAS_ESTIMATION_FAILED;
      console.error('Gas estimation error:', error);
      message =
        'Unable to estimate gas for transaction. The transaction may fail. Please try again.';
    }
    // Handle call exceptions
    else if (errorObj?.code === 'CALL_EXCEPTION') {
      code = ErrorCode.CONTRACT_ERROR;
      message = 'Transaction failed due to contract execution error';
    }
    // Handle revert errors
    else if (errorMessage.includes('revert') || errorMessage.includes('reverted')) {
      code = ErrorCode.TRANSACTION_REVERTED;
      message = 'Transaction reverted';
    }
    // Handle network errors
    else if (errorObj?.code === 'NETWORK_ERROR' || errorMessage.includes('network')) {
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
