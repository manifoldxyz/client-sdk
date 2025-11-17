import type {
  IAccount,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AdapterType,
} from '../../types/account-adapter';
import { Money } from '../../libs/money';
import { ClientSDKError, ErrorCode } from '../../types/errors';

// =============================================================================
// VIEM TYPE IMPORTS
// =============================================================================

import type { TransactionReceipt, WalletClient, Account, Transport, Chain } from 'viem';
import { waitForTransactionReceipt, getBalance, readContract } from 'viem/actions';
import { optimism, base, sepolia, mainnet, shape, polygon } from 'viem/chains';
import { wrapError } from './utils';

// =============================================================================
// VIEM ACCOUNT ADAPTER IMPLEMENTATION
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
 * import { ViemAccount } from './adapters/viem-adapter';
 *
 * const client = createWalletClient({
 *   chain: mainnet,
 *   transport: custom(window.ethereum)
 * });
 *
 * const adapter = new ViemAccount({ walletClient: client });
 *
 * // Use unified interface
 * const balance = await adapter.getBalance();
 * const networkId = await adapter.getConnectedNetworkId();
 * ```
 */
export class ViemAccount implements IAccount {
  readonly adapterType: AdapterType = 'viem';
  _address: string;

  private _walletClient: WalletClient<Transport, Chain, Account>;

  /**
   * Initialize adapter with viem WalletClient or PublicClient
   *
   * @param provider - Object containing viem wallet or public client
   * @throws {ClientSDKError} When client is invalid or viem is not installed
   */
  constructor(provider: { walletClient: WalletClient<Transport, Chain, Account> }) {
    const { walletClient } = provider;
    this._walletClient = walletClient;
    const account = this._walletClient.account;
    if (!account) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Account not foud, please pass Account explicitly when creating viem client.',
      );
    }
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
      throw wrapError(error, 'sendTransaction', { request });
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
      const receipt = await waitForTransactionReceipt(this._walletClient, {
        hash,
        confirmations,
      });
      const baseResponse = this._convertToUniversalResponse(networkId, hash, receipt);

      return baseResponse;
    } catch (error) {
      throw wrapError(error, 'sendTransactionWithConfirmation', { request, confirmations });
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
      await this.switchNetwork(networkId);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance using viem
        const balance = await getBalance(this._walletClient, {
          address: this._address as `0x${string}`,
        });

        return Money.create({
          value: balance,
          networkId,
          fetchUSD: true,
        });
      } else {
        // Get ERC-20 token balance using viem
        const erc20Abi = [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          },
        ] as const;

        const balance = await readContract(this._walletClient, {
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [this._address as `0x${string}`],
        });

        return Money.create({
          value: balance,
          networkId,
          address: tokenAddress,
          fetchUSD: true,
        });
      }
    } catch (error) {
      throw wrapError(error, 'getBalance', { tokenAddress });
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
      throw wrapError(error, 'getConnectedNetworkId');
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
    // First check if there is a need to switch
    const currentConnectedNetwork = await this.getConnectedNetworkId();
    if (currentConnectedNetwork === chainId) {
      return;
    }
    try {
      // Use viem's switchChain action
      await this._walletClient.switchChain({ id: chainId });
    } catch (error) {
      throw wrapError(error, 'switchNetwork', { chainId });
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
      throw wrapError(error, 'signMessage', { message });
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
      const client = this._walletClient;

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
      throw wrapError(error, 'sendCalls', { method, params });
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

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
      viemRequest.chain = this._chainIdToViemChain(request.chainId);
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

  private _chainIdToViemChain(chainId: number): Chain {
    switch (chainId) {
      case 1:
        return mainnet;
      case 10:
        return optimism;
      case 11155111:
        return sepolia;
      case 8453:
        return base;
      case 360:
        return shape;
      case 137:
        return polygon;
      default:
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_TYPE,
          `Unsupported chain ID: ${chainId}. Please add support for this chain in the viem adapter.`,
        );
    }
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
      logs: receipt.logs.map((log) => ({
        address: log.address,
        blockHash: log.blockHash,
        blockNumber: Number(log.blockNumber),
        data: log.data,
        logIndex: Number(log.logIndex),
        transactionHash: log.transactionHash,
        transactionIndex: Number(log.transactionIndex),
        removed: log.removed,
        topics: log.topics,
      })),
    };

    return response;
  }
}
