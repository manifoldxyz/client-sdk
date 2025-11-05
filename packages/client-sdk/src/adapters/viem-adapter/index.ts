export { ViemAccount } from './account';
export { ViemPublicProvider } from './public-provider';

import type { WalletClient, Transport, Chain, Account, PublicClient } from 'viem';
import { ViemAccount } from './account';
import { ViemPublicProvider } from './public-provider';

export function createAccount(provider: { walletClient: WalletClient<Transport, Chain, Account> }) {
  return new ViemAccount(provider);
}

// Convenience export with more intuitive name
export const viemAdapter = createAccount;

/**
 * Helper function to create a ViemPublicProvider
 * Supports both single client and multi-network client configurations
 *
 * @param config - Either a single PublicProvider or a map of network IDs to PublicClients
 * @param fallbackProviders - Optional fallback providers when primary providers fail or are misconfigured
 * @returns ViemPublicProvider instance
 *
 * @example
 * // Multiple providers for different networks
 * const providers = {
 *   1: createPublicProvider({ chain: mainnet, ... }),
 *   8453: createPublicProvider({ chain: base, ... }),
 * };
 * const publicProvider = createPublicProvider(providers);
 *
 * @example
 * // With fallback providers
 * const providers = {
 *   1: createPublicProvider({ chain: mainnet, transport: http('PRIMARY_RPC') }),
 * };
 * const fallbackProviders = {
 *   1: createPublicProvider({ chain: mainnet, transport: http('BACKUP_RPC') }),
 * };
 * const publicProvider = createPublicProvider(providers, fallbackProviders);
 */
export function createPublicProvider(
  config: Record<number, PublicClient>,
  fallbackProviders?: Record<number, PublicClient>,
): ViemPublicProvider {
  return new ViemPublicProvider(config, fallbackProviders);
}
