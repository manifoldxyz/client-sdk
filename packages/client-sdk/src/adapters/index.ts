/**
 * @module adapters
 *
 * Wallet adapter implementations for the Manifold SDK.
 *
 * Provides a unified interface for interacting with different Web3 libraries,
 * allowing seamless integration regardless of your wallet provider choice.
 *
 * ## Supported Libraries
 *
 * - **Ethers v5**: Most widely used, works with MetaMask, WalletConnect, etc.
 * - **Ethers v6**: Latest version with improved TypeScript support
 * - **Viem**: Modern, lightweight alternative with great performance
 *
 * ## Usage Examples
 *
 * ### Ethers v5
 * ```typescript
 * import { ethers } from 'ethers';
 * import { createAccountEthers5 } from '@manifoldxyz/client-sdk/adapters';
 *
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 * const adapter = createAccountEthers5({ signer });
 * ```
 *
 * ### Viem
 * ```typescript
 * import { createWalletClient } from 'viem';
 * import { createAccountViem } from '@manifoldxyz/client-sdk/adapters';
 *
 * const walletClient = createWalletClient({ ... });
 * const adapter = createAccountViem(walletClient);
 * ```
 */

// =============================================================================
// ACCOUNT ADAPTER EXPORTS
// =============================================================================

// Main adapter implementations
export {
  createAccount as createAccountEthers5,
  createPublicProvider as createPublicProviderEthers5,
} from './ethers5-adapter';
export {
  createAccount as createAccountViem,
  createPublicProvider as createPublicProviderViem,
  viemAdapter,
  ViemAccount,
  ViemPublicProvider,
} from './viem-adapter';

// =============================================================================
// PUBLIC PROVIDER EXPORTS
// =============================================================================

// Export the interface for public providers
export type { IPublicProvider } from '../types/account-adapter';
