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
 * import { Ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';
 *
 * const provider = new ethers.providers.Web3Provider(window.ethereum);
 * const signer = provider.getSigner();
 * const adapter = new Ethers5Adapter(client, { signer });
 * ```
 *
 * ### Viem
 * ```typescript
 * import { createWalletClient } from 'viem';
 * import { ViemAdapter } from '@manifoldxyz/client-sdk/adapters';
 *
 * const walletClient = createWalletClient({ ... });
 * const adapter = new ViemAdapter(client, walletClient);
 * ```
 */

// =============================================================================
// ACCOUNT ADAPTER EXPORTS
// =============================================================================

// Main adapter implementations
export { createAccount as createAccountEthers5 } from './ethers5-adapter';
export { createAccount as createAccountViem } from './viem-adapter';

// Re-export types for convenience
export type {
  IAccount,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  FactoryError,
  AdapterType,
  FactoryErrorCode,
  ProviderDetection,
  AdapterNetworkConfig,
  AdapterCreationOptions,
  TypedDataPayload,
} from '../types/account-adapter';
