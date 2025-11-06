export { Ethers5Account } from './account';
export { Ethers5PublicProvider } from './public-provider';

import { Ethers5PublicProvider } from './public-provider';

import type { providers, Wallet } from 'ethers';
import { Ethers5Account } from './account';

export function createAccount(provider: { signer?: providers.JsonRpcSigner; wallet?: Wallet }) {
  return new Ethers5Account(provider);
}

/**
 * Helper function to create an Ethers5PublicProvider
 * Supports both single provider and multi-network provider configurations with fallback support
 *
 * @param config - Map of network IDs to providers (single provider or array of providers for fallback)
 * @returns Ethers5PublicProvider instance
 *
 * @example
 * // Multiple providers for different networks
 * const providers = {
 *   1: new ethers.providers.JsonRpcProvider('https://mainnet...'),
 *   8453: new ethers.providers.JsonRpcProvider('https://base...'),
 * };
 * const publicClient = createPublicProvider(providers);
 *
 * @example
 * // With fallback providers as arrays
 * const providers = {
 *   1: [
 *     new ethers.providers.JsonRpcProvider('https://primary-rpc...'),
 *     new ethers.providers.JsonRpcProvider('https://backup-rpc...'),
 *   ],
 *   8453: new ethers.providers.JsonRpcProvider('https://base...'),
 * };
 * const publicClient = createPublicProvider(providers);
 */
export function createPublicProvider(
  config: Record<number, providers.JsonRpcProvider | providers.JsonRpcProvider[]>,
): Ethers5PublicProvider {
  return new Ethers5PublicProvider(config);
}
