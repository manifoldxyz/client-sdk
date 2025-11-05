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
 * Supports both single provider and multi-network provider configurations
 *
 * @param config - Either a single provider or a map of network IDs to providers
 * @param fallbackProviders - Optional fallback providers when primary providers fail or are misconfigured
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
 * // With fallback providers
 * const providers = {
 *   1: new ethers.providers.JsonRpcProvider('https://primary-rpc...'),
 * };
 * const fallbackProviders = {
 *   1: new ethers.providers.JsonRpcProvider('https://backup-rpc...'),
 * };
 * const publicClient = createPublicProvider(providers, fallbackProviders);
 */
export function createPublicProvider(
  config: Record<number, providers.JsonRpcProvider>,
  fallbackProviders?: Record<number, providers.JsonRpcProvider>,
): Ethers5PublicProvider {
  return new Ethers5PublicProvider(config, fallbackProviders);
}
