// =============================================================================
// ACCOUNT ADAPTER EXPORTS
// =============================================================================

// Main adapter implementations
export { Ethers5Adapter } from './ethers5-adapter';
export { ViemAdapter, createViemAdapter, isViemCompatible } from './viem-adapter';

// Re-export types for convenience
export type {
  IAccountAdapter,
  IAccountAdapterFactory,
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

// Re-export Money for convenience
export { Money } from '../libs/money';
