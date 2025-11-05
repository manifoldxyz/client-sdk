import type { IPublicProvider } from '../../types/account-adapter';
import type { PublicClient } from 'viem';
import { getBalance, readContract } from 'viem/actions';
import { wrapError } from '../ethers5-adapter/utilts';
import { ClientSDKError, ErrorCode } from '../../types';
import { ERC20ABI } from '../../abis';

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
  private publicClients: Map<number, PublicClient>;
  private fallbackProviders: Map<number, PublicClient>;

  /**
   * Initialize the public client with viem public client(s).
   *
   * @param publicClients - Map of network IDs to public clients for multi-network support
   * @param fallbackProviders - Optional fallback providers when primary providers fail or are misconfigured
   */
  constructor(
    publicClients: Record<number, PublicClient>,
    fallbackProviders?: Record<number, PublicClient>,
  ) {
    this.publicClients = new Map(
      Object.entries(publicClients).map(([networkId, client]) => [Number(networkId), client]),
    );
    this.fallbackProviders = new Map(
      fallbackProviders
        ? Object.entries(fallbackProviders).map(([networkId, client]) => [
            Number(networkId),
            client,
          ])
        : [],
    );
  }

  private async getClient(networkId: number): Promise<PublicClient> {
    const primaryClient = this.publicClients.get(networkId);
    const fallbackClient = this.fallbackProviders.get(networkId);

    // If we have a primary client, try to validate it
    if (primaryClient) {
      try {
        const chainId = await primaryClient.getChainId();
        if (chainId === networkId) {
          return primaryClient;
        }
        // Primary client is on wrong network, try fallback
        if (fallbackClient) {
          const fallbackChainId = await fallbackClient.getChainId();
          if (fallbackChainId === networkId) {
            return fallbackClient;
          }
        }
        throw new ClientSDKError(
          ErrorCode.WRONG_NETWORK,
          `Primary client is on network ${chainId}, expected ${networkId}`,
        );
      } catch (error) {
        // Primary client failed, try fallback
        if (fallbackClient) {
          try {
            const fallbackChainId = await fallbackClient.getChainId();
            if (fallbackChainId === networkId) {
              return fallbackClient;
            }
          } catch {
            // Fallback also failed
          }
        }
        throw error;
      }
    }

    // No primary client, try fallback
    if (fallbackClient) {
      try {
        const fallbackChainId = await fallbackClient.getChainId();
        if (fallbackChainId === networkId) {
          return fallbackClient;
        }
        throw new ClientSDKError(
          ErrorCode.WRONG_NETWORK,
          `Fallback client is on network ${fallbackChainId}, expected ${networkId}`,
        );
      } catch (error) {
        throw new ClientSDKError(
          ErrorCode.UNSUPPORTED_NETWORK,
          `Failed to connect to fallback provider for network ${networkId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw new ClientSDKError(
      ErrorCode.UNSUPPORTED_NETWORK,
      `No public provider configured for network ${networkId}`,
    );
  }

  /**
   * Get the balance of an address (native token or ERC20).
   */
  async getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint> {
    const { address, networkId, tokenAddress } = params;
    const client = await this.getClient(networkId);
    try {
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
    } catch (error) {
      throw wrapError(error, 'getBalance', params);
    }
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
    const { contractAddress, abi, functionName, args = [], from, value, networkId } = params;
    const client = await this.getClient(networkId);
    try {
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
    } catch (error) {
      throw wrapError(error, 'estimateContractGas', params);
    }
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
    const { contractAddress, abi, functionName, args = [], networkId } = params;
    const client = await this.getClient(networkId);

    try {
      // Use viem's readContract
      const result = await readContract(client, {
        address: contractAddress as `0x${string}`,
        abi: abi as never,
        functionName: functionName as never,
        args: args as never,
      });

      return result as T;
    } catch (error) {
      throw wrapError(error, 'readContract', params);
    }
  }
}
