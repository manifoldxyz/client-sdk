// Core types
export * from './client';
export * from './product';
export * from './purchase';
export * from './errors';
export * from './common';

// BlindMint-specific types (selective exports to avoid conflicts)
export type { 
  BlindMintProduct as BlindMintProductInterface,
  BlindMintOnchainData as BlindMintOnchainDataType,
  BlindMintPublicData as BlindMintPublicDataType,
  BlindMintPool as BlindMintPoolType,
  BlindMintTierProbability as BlindMintTierProbabilityType,
  GachaConfig,
  TokenVariation
} from './blindmint';

export type {
  ClaimExtensionContract,
  ERC20Contract,
  ContractCallOptions,
  TransactionResult,
  GasConfig as BlindMintGasConfig,
  ProviderConfig as BlindMintProviderConfig,
  NetworkError as BlindMintNetworkError
} from './contracts';

export type {
  InstanceDataResponse,
  PreviewDataResponse,
  AllocationRequest,
  AllocationResponse as BlindMintAllocationResponse,
  PriceCalculation,
  MintValidation,
  ApiError as BlindMintApiError,
  TransformationRule as BlindMintTransformationRule
} from './data-flow';

export type {
  BlindMintError,
  BlindMintErrorCode,
  ValidationError as BlindMintValidationError,
  ErrorClassification,
  RecoveryAction
} from './enhanced-errors';

export type {
  NetworkConfig,
  CacheConfig,
  APIConfig
} from './config';
