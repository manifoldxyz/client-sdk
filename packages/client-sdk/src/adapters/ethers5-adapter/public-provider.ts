import type { providers } from 'ethers';
import { BigNumber, Contract } from 'ethers';
import type { IPublicProvider } from '../../types/account-adapter';
import { ClientSDKError, ErrorCode } from '../../types/errors';
import { ERC20ABI } from '../../abis/ERC20ABI';

export class Ethers5PublicProvider implements IPublicProvider {
  private providers: Map<number, providers.JsonRpcProvider>;
  private fallbackProviders: Map<number, providers.JsonRpcProvider>;

  constructor(
    providers: Record<number, providers.JsonRpcProvider>,
    fallbackProviders?: Record<number, providers.JsonRpcProvider>,
  ) {
    this.providers = new Map(
      Object.entries(providers).map(([networkId, provider]) => [Number(networkId), provider]),
    );
    this.fallbackProviders = new Map(
      fallbackProviders
        ? Object.entries(fallbackProviders).map(([networkId, provider]) => [
            Number(networkId),
            provider,
          ])
        : [],
    );
  }

  private async getProvider(networkId: number): Promise<providers.JsonRpcProvider> {
    const primaryProvider = this.providers.get(networkId);
    const fallbackProvider = this.fallbackProviders.get(networkId);

    // If we have a primary provider, try to validate it
    if (primaryProvider) {
      try {
        const network = await primaryProvider.getNetwork();
        if (network.chainId === networkId) {
          return primaryProvider;
        }
        // Primary provider is on wrong network, try fallback
        if (fallbackProvider) {
          const fallbackNetwork = await fallbackProvider.getNetwork();
          if (fallbackNetwork.chainId === networkId) {
            return fallbackProvider;
          }
        }
        throw new ClientSDKError(
          ErrorCode.WRONG_NETWORK,
          `Primary provider is on network ${network.chainId}, expected ${networkId}`,
        );
      } catch (error) {
        // Primary provider failed, try fallback
        if (fallbackProvider) {
          try {
            const fallbackNetwork = await fallbackProvider.getNetwork();
            if (fallbackNetwork.chainId === networkId) {
              return fallbackProvider;
            }
          } catch {
            // Fallback also failed
          }
        }
        throw error;
      }
    }

    // No primary provider, try fallback
    if (fallbackProvider) {
      try {
        const fallbackNetwork = await fallbackProvider.getNetwork();
        if (fallbackNetwork.chainId === networkId) {
          return fallbackProvider;
        }
        throw new ClientSDKError(
          ErrorCode.WRONG_NETWORK,
          `Fallback provider is on network ${fallbackNetwork.chainId}, expected ${networkId}`,
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
      `No provider configured for network ${networkId}`,
    );
  }

  async getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint> {
    const { address, networkId, tokenAddress } = params;

    // Get the provider for the target network
    const provider = await this.getProvider(networkId);

    try {
      if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const contract = new Contract(tokenAddress, ERC20ABI, provider);
        const balanceOf = contract.balanceOf as (address: string) => Promise<BigNumber>;
        const balance = await balanceOf(address);
        return BigInt(balance.toString());
      } else {
        const balance = await provider.getBalance(address);
        return BigInt(balance.toString());
      }
    } catch (error) {
      throw new ClientSDKError(
        ErrorCode.UNKNOWN_ERROR,
        `Failed to get balance: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

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
    // Get the provider for the target network
    const provider = await this.getProvider(networkId);
    try {
      const contract = new Contract(contractAddress, abi as never, provider);

      const estimateFunction = contract.estimateGas[functionName];
      if (!estimateFunction || typeof estimateFunction !== 'function') {
        throw new Error(`Function ${functionName} not found in contract ABI`);
      }
      const gasEstimate: BigNumber = await estimateFunction(...args, {
        from,
        value: value ? BigNumber.from(value.toString()) : undefined,
      });
      return BigInt(gasEstimate.toString());
    } catch (error) {
      throw new ClientSDKError(
        ErrorCode.GAS_ESTIMATION_FAILED,
        `Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async readContract<T = unknown>(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    networkId: number;
  }): Promise<T> {
    const { contractAddress, abi, functionName, args = [], networkId } = params;
    try {
      // Get the provider for the target network
      const provider = await this.getProvider(networkId);

      const contract = new Contract(contractAddress, abi as never, provider);

      const method = contract[functionName] as (...args: readonly unknown[]) => Promise<T>;
      if (typeof method !== 'function') {
        throw new Error(`Function ${functionName} not found in contract ABI`);
      }
      const result = await method(...(args || []));
      return result;
    } catch (error) {
      throw new ClientSDKError(
        ErrorCode.CONTRACT_ERROR,
        `Failed to read contract: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
