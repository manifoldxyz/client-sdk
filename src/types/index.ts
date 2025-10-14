// Core types
export * from './client';
export * from './product';
export * from './purchase';
export * from './errors';
export * from './common';

// BlindMint-specific types
export * from './blindmint';

// Essential contract types
export type { ClaimExtensionContract, ERC20Contract, ContractCallOptions } from './contracts';

// Configuration
export type { CacheConfig, ApiConfig } from './config';

// Account adapter interfaces (CON-2740)
export type {
  // Core interfaces
  IAccount,
  // Transaction types
  UniversalTransactionRequest,
  UniversalTransactionResponse,

  // Factory and configuration
  AdapterType,
  TypedDataPayload,
} from './account-adapter';
