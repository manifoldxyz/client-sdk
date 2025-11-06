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
 * Supports both single client and multi-network client configurations with fallback support
 *
 * @param config - Map of network IDs to PublicClients (single client or array of clients for fallback)
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
 * // With fallback providers as arrays
 * const providers = {
 *   1: [
 *     createPublicProvider({ chain: mainnet, transport: http('PRIMARY_RPC') }),
 *     createPublicProvider({ chain: mainnet, transport: http('BACKUP_RPC') }),
 *   ],
 *   8453: createPublicProvider({ chain: base, ... }),
 * };
 * const publicProvider = createPublicProvider(providers);
 */
export function createPublicProvider(
  config: Record<number, PublicClient | PublicClient[]>,
): ViemPublicProvider {
  return new ViemPublicProvider(config);
}
