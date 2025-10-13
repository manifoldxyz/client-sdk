// Core types
export * from './client';
export * from './product';
export * from './purchase';
export * from './errors';
export * from './common';

// BlindMint-specific types
export type {
  BlindMintProduct,
  BlindMintOnchainData,
  BlindMintPublicData,
  BlindMintTierProbability,
  TokenVariation,
  MintValidation,
  BlindMintPool,
} from './blindmint';

// Essential contract types
export type { ClaimExtensionContract, ERC20Contract, ContractCallOptions } from './contracts';

// Configuration
export type { NetworkConfig, CacheConfig, ApiConfig, GasConfig, ProviderConfig } from './config';

// Account adapter interfaces (CON-2740)
export type {
  // Core interfaces
  IAccount,
  // Transaction types
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  TransactionStatus,

  // Factory and configuration
  AdapterType,
  TypedDataPayload,
  AdapterNetworkConfig,
  SupportedNetwork,
  AdapterCreationOptions,

  // Error types
  FactoryError,
  FactoryErrorCode,

  // Utility types
  AccountAdapterTypeGuard,
  ProviderDetection,
} from './account-adapter';

// Re-export Money class and related types for backward compatibility
export { Money, isMoney } from './money';
export type { MoneyData, Cost } from './money';
