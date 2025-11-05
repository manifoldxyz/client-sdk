import { createClient, createPublicProviderViem } from '@manifoldxyz/client-sdk'
import { createPublicClient, custom, PublicClient } from 'viem'
import { mainnet, base, sepolia } from 'viem/chains'

export function getClient() {
    const providers: Record<number, PublicClient> = {};
    providers[8453] = createPublicClient({
      chain: base,
      transport: custom(window.ethereum),
    }) as PublicClient;
    providers[1] = createPublicClient({
      chain: mainnet,
      transport: custom(window.ethereum),
    }) as PublicClient;
    providers[11155111] = createPublicClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    }) as PublicClient;
    const publicProvider = createPublicProviderViem(providers);
    
    return createClient({
      publicProvider,
    });
}
