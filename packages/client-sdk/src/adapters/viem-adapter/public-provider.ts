import type { IPublicProvider } from '../../types/account-adapter';
import type { Log, PublicClient } from 'viem';
import { getBalance, readContract } from 'viem/actions';
import { ERC20ABI } from '../../abis';
import { executeWithProviderFallback } from '../utils/fallback';

/**
 * Public provider implementation for viem
 *
 * Provides read-only blockchain interactions using viem public clients.
 * This client handles balance queries, gas estimation, and contract reads.
 *
 * @example
 * ```typescript
 * import { createPublicClient, http } from 'viem';
 * import { mainnet } from 'viem/chains';
 * import { ViemPublicClient } from '@manifoldxyz/client-sdk/adapters';
 *
 * const publicClient = createPublicClient({
 *   chain: mainnet,
 *   transport: http('https://eth-mainnet.g.alchemy.com/v2/...')
 * });
 *
 * const provider = new ViemPublicClient({ publicClient });
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
export class ViemPublicProvider implements IPublicProvider {
  private publicClients: Map<number, PublicClient[]>;

  /**
   * Initialize the public client with viem public client(s).
   *
   * @param publicClients - Map of network IDs to public clients (or arrays for fallback support)
   */
  constructor(publicClients: Record<number, PublicClient | PublicClient[]>) {
    this.publicClients = new Map(
      Object.entries(publicClients).map(([networkId, client]) => [
        Number(networkId),
        Array.isArray(client) ? client : [client],
      ]),
    );
  }

  private async executeWithFallback<T>(
    networkId: number,
    operation: (client: PublicClient) => Promise<T>,
  ): Promise<T> {
    const clientList = this.publicClients.get(networkId) || [];

    return executeWithProviderFallback<PublicClient, T>({
      networkId,
      providers: clientList,
      getChainId: async (client) => {
        return await client.getChainId();
      },
      // Viem clients don't support network switching
      switchNetwork: undefined,
      operation,
    });
  }

  /**
   * Get the balance of an address (native token or ERC20).
   */
  async getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint> {
    const { address, tokenAddress } = params;

    return this.executeWithFallback(params.networkId, async (client) => {
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Get native token balance using viem
        const balance = await getBalance(client, {
          address: address as `0x${string}`,
        });
        return balance;
      } else {
        // Get ERC20 token balance using viem
        const balance = (await readContract(client, {
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        })) as bigint;

        return balance;
      }
    });
  }

  /**
   * Estimate gas for a contract function call.
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
    const { contractAddress, abi, functionName, args = [], from, value } = params;

    return this.executeWithFallback(params.networkId, async (client) => {
      // Use viem's estimateContractGas
      const gasEstimate = await client.estimateContractGas({
        address: contractAddress as `0x${string}`,
        abi: abi as never,
        functionName: functionName as never,
        args: args as never,
        account: from as `0x${string}`,
        value,
      });

      return gasEstimate;
    });
  }

  async subscribeToContractEvents(params: {
    contractAddress: string;
    abi: readonly unknown[];
    networkId: number;
    topics: string[];
    callback: (log: unknown) => void;
  }): Promise<() => void> {
    const { contractAddress, abi, topics, callback } = params;

    return this.executeWithFallback(params.networkId, async (client) => {
      const unwatch = client.watchContractEvent({
        address: contractAddress as `0x${string}`,
        abi: abi as never,
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
    });
  }

  /**
   * Read data from a contract (call a view/pure function).
   */
  async readContract<T = unknown>(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    networkId: number;
  }): Promise<T> {
    const { contractAddress, abi, functionName, args = [] } = params;

    return this.executeWithFallback(params.networkId, async (client) => {
      // Use viem's readContract
      const result = await readContract(client, {
        address: contractAddress as `0x${string}`,
        abi: abi as never,
        functionName: functionName as never,
        args: args as never,
      });

      return result as T;
    });
  }
}
