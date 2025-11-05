export { WagmiPublicProvider } from './public-provider';

import type { Config } from '@wagmi/core';
import { WagmiPublicProvider } from './public-provider';

/**
 * Create a Wagmi public provider
 *
 * @param params - Object containing Wagmi config
 * @returns WagmiPublicProvider instance
 *
 * @example
 * ```typescript
 * import { createConfig, http } from '@wagmi/core';
 * import { mainnet, base } from '@wagmi/core/chains';
 * import { createPublicProvider } from '@manifoldxyz/client-sdk/adapters/wagmi-adapter';
 *
 * const config = createConfig({
 *   chains: [mainnet, base],
 *   transports: {
 *     [mainnet.id]: http(),
 *     [base.id]: http(),
 *   },
 * });
 *
 * const provider = createPublicProvider({ config });
 * ```
 */
export function createPublicProvider(params: { config: Config }): WagmiPublicProvider {
  return new WagmiPublicProvider(params);
}
