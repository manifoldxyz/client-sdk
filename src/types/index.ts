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
  GachaConfig,
  TokenVariation,
  MintValidation
} from './blindmint';

// Essential contract types
export type {
  ClaimExtensionContract,
  ERC20Contract,
  ContractCallOptions,
  TransactionResult
} from './contracts';

// Enhanced error handling
export type {
  BlindMintError,
  BlindMintErrorCode,
  ErrorSeverity,
  ErrorCategory,
  ErrorMetadata
} from './enhanced-errors';

// Configuration
export type {
  NetworkConfig,
  CacheConfig,
  ApiConfig,
  GasConfig,
  ProviderConfig
} from './config';

// Account adapter interfaces (CON-2740)
export type {
  // Core interfaces
  IAccountAdapter,
  IAccountAdapterFactory,
  
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
  AccountAdapterError,
  AccountAdapterErrorCode,
  FactoryError,
  FactoryErrorCode,
  
  // Utility types
  AccountAdapterTypeGuard,
  ProviderDetection
} from './account-adapter';

// Re-export Money class and related types for backward compatibility
export { Money, isMoney } from './money';
export type { MoneyData, Cost } from './money';
