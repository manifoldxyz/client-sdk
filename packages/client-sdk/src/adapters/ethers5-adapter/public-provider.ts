import type { providers } from 'ethers';
import { BigNumber, Contract } from 'ethers';
import type { IPublicProvider } from '../../types/account-adapter';
import { ERC20ABI } from '../../abis/ERC20ABI';
import { ensureConnectedNetwork } from '../../utils';
import type { Network } from '@manifoldxyz/js-ts-utils';
import { executeWithProviderFallback } from '../utils/fallback';

export class Ethers5PublicProvider implements IPublicProvider {
  private providers: Map<number, providers.JsonRpcProvider[]>;

  constructor(providers: Record<number, providers.JsonRpcProvider | providers.JsonRpcProvider[]>) {
    this.providers = new Map(
      Object.entries(providers).map(([networkId, provider]) => [
        Number(networkId),
        Array.isArray(provider) ? provider : [provider],
      ]),
    );
  }

  private async executeWithFallback<T>(
    networkId: number,
    operation: (provider: providers.JsonRpcProvider) => Promise<T>,
  ): Promise<T> {
    const providerList = this.providers.get(networkId) || [];

    return executeWithProviderFallback<providers.JsonRpcProvider, T>({
      networkId,
      providers: providerList,
      getChainId: async (provider: providers.JsonRpcProvider) => {
        const network = await provider.getNetwork();
        return network.chainId;
      },
      switchNetwork: async (provider: providers.JsonRpcProvider, targetNetworkId: number) => {
        try {
          await this._ensureConnectedNetwork(targetNetworkId, provider);
          // Verify the switch worked
          const network = await provider.getNetwork();
          return network.chainId === targetNetworkId;
        } catch {
          return false;
        }
      },
      operation,
    });
  }

  async getBalance(params: {
    address: string;
    networkId: number;
    tokenAddress?: string;
  }): Promise<bigint> {
    const { address, tokenAddress } = params;

    return this.executeWithFallback(params.networkId, async (provider) => {
      if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const contract = new Contract(tokenAddress, ERC20ABI, provider);
        const balanceOf = contract.balanceOf as (address: string) => Promise<BigNumber>;
        const balance = await balanceOf(address);
        return BigInt(balance.toString());
      } else {
        const balance = await provider.getBalance(address);
        return BigInt(balance.toString());
      }
    });
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
    const { contractAddress, abi, functionName, args = [], from, value } = params;

    return this.executeWithFallback(params.networkId, async (provider) => {
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
    });
  }

  async readContract<T = unknown>(params: {
    contractAddress: string;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
    networkId: number;
  }): Promise<T> {
    const { contractAddress, abi, functionName, args = [] } = params;

    return this.executeWithFallback(params.networkId, async (provider) => {
      const contract = new Contract(contractAddress, abi as never, provider);

      const method = contract[functionName] as (...args: readonly unknown[]) => Promise<T>;
      if (typeof method !== 'function') {
        throw new Error(`Function ${functionName} not found in contract ABI`);
      }
      const result = await method(...(args || []));
      return result;
    });
  }

  async contractInstance(params: {
    contractAddress: string;
    abi: readonly unknown[];
    networkId: number;
    withSigner?: boolean;
    unchecked?: boolean;
  }): Promise<Contract> {
    const { contractAddress, abi, networkId, withSigner = false, unchecked = false } = params;

    return this.executeWithFallback(networkId, async (provider) => {
      let contract = new Contract(contractAddress, abi as never, provider);

      // Attach the signer if the provider is the browser provider
      if (withSigner) {
        if (unchecked) {
          contract = contract.connect(provider.getUncheckedSigner());
        } else {
          contract = contract.connect(provider.getSigner());
        }
      }

      return contract;
    });
  }

  async resolveName(name: string, networkId: number): Promise<string | null> {
    return this.executeWithFallback(networkId, async (provider) => {
      const address = await provider.resolveName(name);
      return address;
    });
  }

  private async _ensureConnectedNetwork(networkId: number, provider: providers.JsonRpcProvider) {
    await ensureConnectedNetwork({
      getConnectedNetwork: () => provider.getNetwork().then((network) => network.chainId),
      switchNetwork: () =>
        provider.send('wallet_switchEthereumChain', [{ chainId: `0x${networkId.toString(16)}` }]),
      addNetwork: (networkConfig: Omit<Network.NetworkConfig, 'displayName'>) =>
        provider.send('wallet_addEthereumChain', [networkConfig]),
      targetNetworkId: networkId,
    });
  }
}
