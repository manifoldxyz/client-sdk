import { createPublicClientForChain } from '../utils/viemClients';
import { createClient, createPublicProviderViem, type Product } from '@manifoldxyz/client-sdk';

export async function fetchManifoldProduct(instanceId: string): Promise<Product> {
  // Create public clients for supported chains
  const publicClients: Record<number, any> = {
    8453: createPublicClientForChain(8453), // Base mainnet
    10: createPublicClientForChain(10), // Optimism
    1: createPublicClientForChain(1), // Ethereum Mainnet
    11155111: createPublicClientForChain(11155111), // Base Sepolia
    84532: createPublicClientForChain(84532), // Base Sepolia
  };

  const publicProvider = createPublicProviderViem(publicClients);
  const client = createClient({ publicProvider });

  const product = await client.getProduct(instanceId);
  await product.fetchOnchainData();
  return product;
}
