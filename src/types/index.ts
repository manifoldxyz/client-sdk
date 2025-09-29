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

// Re-export Money class for backward compatibility
export { Money, isMoney } from './money';
