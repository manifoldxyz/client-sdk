// =============================================================================
// ACCOUNT ADAPTER EXPORTS
// =============================================================================

// Main adapter implementations
export { Ethers5Adapter, createEthers5Adapter, isEthers5Compatible } from './ethers5-adapter';
export { ViemAdapter, createViemAdapter, isViemCompatible } from './viem-adapter';

// Factory for creating adapters
export { AccountAdapterFactory, accountAdapterFactory } from './account-adapter-factory';

// Re-export types for convenience
export type {
  IAccountAdapter,
  IAccountAdapterFactory,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  AccountAdapterError,
  FactoryError,
  AdapterType,
  AccountAdapterErrorCode,
  FactoryErrorCode,
  ProviderDetection,
  AdapterNetworkConfig,
  AdapterCreationOptions,
  TypedDataPayload,
} from '../types/account-adapter';

// Re-export Money for convenience
export { Money } from '../libs/money';