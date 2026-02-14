import type { IPublicProvider } from '../../types/account-adapter';
import type { Config } from '@wagmi/core';
import { getBalance, readContract, getPublicClient, watchContractEvent } from '@wagmi/core';
import { ClientSDKError, ErrorCode } from '../../types';
import { ERC20ABI } from '../../abis';
import type { Log } from 'viem';
import { normalizeAbi } from '../utils/normalize-abi';

/**
 * Public provider implementation for Wagmi
 *
 * Provides read-only blockchain interactions using Wagmi's Config object.
 * This provider leverages Wagmi's public clients for balance queries, gas estimation, and contract reads.
 *
 * @example
 * ```typescript
 * import { createConfig, http } from '@wagmi/core';
 * import { mainnet, base } from '@wagmi/core/chains';
 * import { WagmiPublicProvider } from '@manifoldxyz/client-sdk/adapters';
 *
 * const config = createConfig({
 *   chains: [mainnet, base],
 *   transports: {
 *     [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/...'),
 *     [base.id]: http('https://base-mainnet.g.alchemy.com/v2/...'),
 *   },
 * });
 *
 * const provider = new WagmiPublicProvider({ config });
 *
 * // Get balance
 * const balance = await provider.getBalance({
 *   address: '0x...',
 *   networkId: 1
 * });
 * ```
 *
 * @public
 */
export class WagmiPublicProvider implements IPublicProvider {
  private config: Config;

  /**
   * Initialize the public provider with Wagmi Config.
   *
   * @param params - Object containing Wagmi config
   */
  constructor(params: { config: Config }) {
    this.config = params.config;
  }

  /**
   * Get the balance of an address (native token or ERC20).
   *
   * @param params - Parameters for balance query
   * @returns Promise resolving to balance in wei
   */
  async getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint> {
    const { address, networkId, tokenAddress } = params;

    try {
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance
        const balance = await getBalance(this.config, {
          address: address as `0x${string}`,
          chainId: networkId,
        });
        return balance.value;
      } else {
        // Get ERC20 token balance
        const balance = await readContract(this.config, {
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
          chainId: networkId,
        });
        return balance;
      }
    } catch (error) {
      throw this._wrapError(error, 'getBalance', params);
    }
  }

  /**
   * Estimate gas for a contract function call.
   *
   * @param params - Parameters for gas estimation
   * @returns Promise resolving to estimated gas amount
   */
  async estimateContractGas(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    from: string;
    value?: bigint;
    networkId: number;
  }): Promise<bigint> {
    const { contractAddress, abi, functionName, args = [], from, value, networkId } = params;
    try {
      // Get the public client for the specific chain
      const client = getPublicClient(this.config, { chainId: networkId });

      if (!client) {
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_NETWORK,
          `No client configured for network ${networkId}`,
        );
      }

      if (!client.estimateContractGas) {
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_NETWORK,
          `No estimateContractGas method available, make sure your wagmi config is configured with PublicClient Transport`,
        );
      }

      // Use viem's estimateContractGas from the client
      const gasEstimate = await client.estimateContractGas({
        address: contractAddress as `0x${string}`,
        abi: normalizeAbi(abi) as never,
        functionName: functionName as never,
        args: args as never,
        account: from as `0x${string}`,
        value,
      });

      return gasEstimate;
    } catch (error) {
      throw this._wrapError(error, 'estimateContractGas', params);
    }
  }

  /**
   * Read data from a contract (call a view/pure function).
   *
   * @param params - Parameters for contract read
   * @returns Promise resolving to the contract function result
   */
  async readContract<T = unknown>(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    networkId: number;
  }): Promise<T> {
    const { contractAddress, abi, functionName, args = [], networkId } = params;
    try {
      const result = await readContract(this.config, {
        address: contractAddress as `0x${string}`,
        abi: normalizeAbi(abi) as never,
        functionName: functionName as never,
        args: args as never,
        chainId: networkId,
      });

      return result as T;
    } catch (error) {
      throw this._wrapError(error, 'readContract', params);
    }
  }

  async subscribeToContractEvents(params: {
    contractAddress: string;
    abi: readonly unknown[];
    networkId: number;
    topics: string[];
    callback: (log: unknown) => void;
  }): Promise<() => void> {
    const { contractAddress, abi, networkId, topics, callback } = params;

    try {
      // Get the public client for the specific chain
      const client = getPublicClient(this.config, { chainId: networkId });

      if (!client) {
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_NETWORK,
          `No client configured for network ${networkId}`,
        );
      }

      const unwatch = watchContractEvent(this.config, {
        address: contractAddress as `0x${string}`,
        abi: normalizeAbi(abi) as never,
        onLogs: (logs: Log[]) => {
          for (const log of logs) {
            // Check if log has enough topics and all match
            if (log.topics.length < topics.length) continue;

            let matches = true;
            for (let i = 0; i < topics.length; i++) {
              if (log.topics[i] !== topics[i]) {
                matches = false;
                break;
              }
            }

            if (matches) {
              callback(log);
            }
          }
        },
      });

      return unwatch;
    } catch (error: unknown) {
      throw this._wrapError(error, 'subscribeToContractEvents', params);
    }
  }

  /**
   * Wrap errors in ClientSDKError with context
   */
  private _wrapError(error: unknown, method: string, _context?: Record<string, unknown>): Error {
    const message = error instanceof Error ? error.message : String(error);
    const errorMessage = `Wagmi public provider ${method} failed: ${message}`;

    // Check for specific error types
    if (message.includes('chain not configured')) {
      return new ClientSDKError(ErrorCode.UNSUPPORTED_NETWORK, errorMessage);
    }

    if (message.includes('contract') || message.includes('revert')) {
      return new ClientSDKError(ErrorCode.CONTRACT_ERROR, errorMessage);
    }

    if (message.includes('gas')) {
      return new ClientSDKError(ErrorCode.GAS_ESTIMATION_FAILED, errorMessage);
    }

    return new ClientSDKError(ErrorCode.UNKNOWN_ERROR, errorMessage);
  }
}
