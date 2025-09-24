# BlindMint Type Contract Specification

## Overview

This document specifies the comprehensive TypeScript type contracts for the BlindMint implementation in the Manifold Client SDK. These types enable type-safe, robust contract interactions, data validation, and error handling for gacha-style NFT minting.

## Architecture

### Design Principles

1. **Type Safety First**: All interactions are fully typed to prevent runtime errors
2. **Extensibility**: Types support future enhancements and customizations
3. **Compatibility**: Full compatibility with ethers v5.7.0 and existing SDK patterns
4. **Error Transparency**: Comprehensive error types with actionable messages
5. **Performance**: Optimized for efficient caching and data transformation

### File Organization

```
src/types/
├── blindmint.ts          # Core BlindMint interfaces and gacha configuration
├── contracts.ts          # Contract interaction types and dual-provider patterns
├── data-flow.ts          # API responses, data transformation, and state sync
├── enhanced-errors.ts    # BlindMint-specific error types and classifications
├── config.ts             # Configuration types for providers, networks, and caching
└── index.ts              # Main export file
```

## Core Type Hierarchy

### 1. BlindMint Core Types (`blindmint.ts`)

#### Primary Interfaces

```typescript
interface BlindMintOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  audienceType: 'None' | 'Allowlist' | 'RedemptionCode';
  cost: Money;
  paymentReceiver: Address;
  tokenVariations: number;
  startingTokenId: number;
  gachaConfig?: GachaConfig;
  storageProtocol: StorageProtocol;
  metadataLocation: string;
}

interface BlindMintPublicData {
  title: string;
  description?: string;
  network: number;
  contract: Contract;
  extensionAddress: Address;
  tierProbabilities: BlindMintTierProbability;
  pool: BlindMintPool[];
  previewMedia?: Media;
  thumbnail?: string;
  attributes?: Record<string, unknown>;
}

interface BlindMintProduct {
  type: 'blind-mint';
  id: string;
  data: InstanceDataWithBlindMint;
  previewData: PreviewDataWithMint;
  onchainData?: BlindMintOnchainData;
  
  // Standard product methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<BlindMintStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<BlindMintInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BlindMintOnchainData>;
  
  // BlindMint-specific methods
  getTokenVariations(): Promise<TokenVariation[]>;
  getGachaConfig(): Promise<GachaConfig>;
  getTierProbabilities(): Promise<GachaTier[]>;
  getClaimableTokens(walletAddress: Address): Promise<ClaimableToken[]>;
  estimateMintGas(quantity: number, walletAddress: Address): Promise<bigint>;
  validateMint(params: MintValidationParams): Promise<MintValidation>;
  getFloorPrices(): Promise<FloorPriceData[]>;
  getMintHistory(walletAddress?: Address): Promise<MintHistoryItem[]>;
}
```

#### Gacha Configuration

```typescript
interface GachaConfig {
  tiers: GachaTier[];
  immediateReveal: boolean;
  revealDelay?: number;
  allowDuplicates: boolean;
  floorPriceHandling?: FloorPriceConfig;
}

interface GachaTier {
  id: string;
  name: string;
  probability: number;
  tokenIds: number[];
  metadata?: Record<string, unknown>;
}
```

### 2. Contract Interaction Types (`contracts.ts`)

#### Contract Interfaces

```typescript
interface ClaimExtensionContract {
  readonly networkId: NetworkId;
  readonly contractAddress: Address;
  readonly creatorContractAddress: Address;
  readonly claimIndex: number;

  // Read operations with fallback support
  getClaim(spec: ClaimType): Promise<OnChainClaimData>;
  getClaimForToken(tokenId: number): Promise<OnChainClaimData>;
  getTotalMinted(): Promise<number>;
  getWalletMinted(walletAddress: Address): Promise<number>;
  getClaimState(): Promise<ClaimState>;

  // Write operations
  mint(quantity: number, paymentAmount: BigNumber, walletAddress: Address): Promise<TransactionResponse>;
  mintWithProofs(
    quantity: number,
    paymentAmount: BigNumber,
    walletAddress: Address,
    merkleProofs: string[]
  ): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasMint(walletAddress: Address, quantity: number, paymentAmount: BigNumber): Promise<BigNumber>;
  estimateGasMintWithProofs(
    walletAddress: Address,
    quantity: number,
    paymentAmount: BigNumber,
    merkleProofs: string[]
  ): Promise<BigNumber>;

  // Utility methods
  isValidNetwork(): boolean;
  switchToCorrectNetwork(): Promise<void>;
}

interface ERC20Contract {
  readonly networkId: NetworkId;
  readonly contractAddress: Address;

  // Read operations
  getBalance(walletAddress: Address): Promise<BigNumber>;
  getAllowance(owner: Address, spender: Address): Promise<BigNumber>;
  getERC20Symbol(): Promise<string>;
  getERC20Decimals(): Promise<number>;
  getERC20Name(): Promise<string>;
  getTotalSupply(): Promise<BigNumber>;

  // Write operations
  approve(spender: Address, amount: BigNumber): Promise<TransactionResponse>;
  transfer(to: Address, amount: BigNumber): Promise<TransactionResponse>;

  // Gas estimation
  estimateGasApprove(spender: Address, amount: BigNumber): Promise<BigNumber>;
  estimateGasTransfer(to: Address, amount: BigNumber): Promise<BigNumber>;
}
```

#### Transaction Types

```typescript
interface TransactionResponse extends ContractTransaction {
  sdkTxId: string;
  estimatedGas: BigNumber;
  provider: 'wallet' | 'bridge';
  type: TransactionType;
  context?: TransactionContext;
}

interface TransactionResult {
  transaction: TransactionResponse;
  receipt: ContractReceipt;
  success: boolean;
  error?: ContractError;
  gasUsed: BigNumber;
  gasPrice: BigNumber;
  gasCost: BigNumber;
  gasCostUSD?: number;
  executionTime: number;
}
```

### 3. Data Flow Types (`data-flow.ts`)

#### API Response Types

```typescript
interface InstanceDataResponse {
  id: string;
  creator: Workspace;
  publicData: BlindMintPublicData;
  appId: number;
  appName: string;
  metadata: ApiResponseMetadata;
}

interface PreviewDataResponse {
  title?: string;
  description?: string;
  contract?: Contract;
  thumbnail?: string;
  payoutAddress?: Address;
  network?: NetworkId;
  startDate?: string;
  endDate?: string;
  price?: Money;
  media?: Media[];
  attributes?: Record<string, unknown>;
  metadata: ApiResponseMetadata;
}
```

#### Allocation and Pricing

```typescript
interface AllocationRequest {
  recipientAddress: Address;
  instanceId: string;
  quantity: number;
  redemptionCode?: string;
  networkId: NetworkId;
  params?: AllocationParams;
}

interface AllocationResponse {
  isEligible: boolean;
  reason?: string;
  quantity: number;
  remainingAllocation: number;
  merkleProofs?: string[];
  tierInfo?: AllocationTierInfo;
  metadata: AllocationMetadata;
}

interface PriceCalculation {
  subtotal: Money;
  platformFee: Money;
  gasEstimate: GasEstimation;
  total: Money;
  breakdown: PriceBreakdownItem[];
  exchangeRates: ExchangeRateInfo;
  metadata: PriceCalculationMetadata;
}
```

### 4. Enhanced Error Types (`enhanced-errors.ts`)

#### Error Classification

```typescript
enum BlindMintErrorCode {
  // Mint state errors
  MINT_NOT_ACTIVE = 'MINT_NOT_ACTIVE',
  MINT_ENDED = 'MINT_ENDED',
  MINT_NOT_STARTED = 'MINT_NOT_STARTED',
  SOLD_OUT = 'SOLD_OUT',
  EXCEEDS_WALLET_LIMIT = 'EXCEEDS_WALLET_LIMIT',
  EXCEEDS_TOTAL_SUPPLY = 'EXCEEDS_TOTAL_SUPPLY',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  
  // Allowlist errors
  INVALID_MERKLE_PROOF = 'INVALID_MERKLE_PROOF',
  INVALID_REDEMPTION_CODE = 'INVALID_REDEMPTION_CODE',
  NOT_ON_ALLOWLIST = 'NOT_ON_ALLOWLIST',
  
  // Payment errors
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  INVALID_PAYMENT_TOKEN = 'INVALID_PAYMENT_TOKEN',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Contract interaction errors
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
}

class BlindMintError extends ClientSDKError {
  constructor(
    code: ErrorCode | BlindMintErrorCode,
    message: string,
    public context?: BlindMintErrorContext,
    details?: unknown,
  ) {
    super(code as ErrorCode, message, details);
    this.name = 'BlindMintError';
  }
}
```

#### Error Metadata

```typescript
interface ErrorMetadata {
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: boolean;
  userActions?: string[];
  developerActions?: string[];
  documentationLinks?: string[];
  reportable: boolean;
  estimatedResolutionTime?: number;
}
```

### 5. Configuration Types (`config.ts`)

#### Provider Configuration

```typescript
interface ProviderConfig {
  primary: PrimaryProviderConfig;
  bridge: BridgeProviderConfig;
  networks: Record<NetworkId, NetworkConfig>;
  global: GlobalProviderConfig;
}

interface NetworkConfig {
  networkId: NetworkId;
  chainId: number;
  name: string;
  nativeCurrency: CurrencyConfig;
  rpc: RpcConfig;
  explorer: ExplorerConfig;
  gas: GasConfig;
  contracts: ContractAddresses;
  features: NetworkFeatures;
}
```

#### Cache Configuration

```typescript
interface CacheConfig {
  memory: MemoryCacheConfig;
  persistent: PersistentCacheConfig;
  invalidation: CacheInvalidationConfig;
  keyGeneration: CacheKeyConfig;
}
```

## Integration Points

### 1. With Existing SDK Types

The BlindMint types extend and integrate with existing SDK types:

- **BaseProduct**: BlindMintProduct extends the common product interface
- **Money**: Reuses the existing Money type for all pricing
- **Address**: Uses the existing Address type for all addresses
- **Contract**: Extends the existing Contract interface
- **TransactionStep**: Compatible with existing purchase flow

### 2. With ethers v5.7.0

All contract interaction types are designed for ethers v5.7.0 compatibility:

- **BigNumber**: All numeric blockchain values use ethers BigNumber
- **ContractTransaction**: Enhanced but compatible with ethers types
- **ContractReceipt**: Extended with SDK-specific metadata
- **Provider**: Supports both wallet and bridge providers

### 3. With Vue/Pinia Patterns

Types support reactive state management patterns:

- **Computed Properties**: All derived state is typed for computed values
- **Reactive Refs**: Compatible with Vue's reactive system
- **Store Actions**: All async operations return properly typed promises

## Usage Patterns

### 1. Product Initialization

```typescript
import { BlindMintProduct, InstanceDataResponse } from '@/types';

async function initializeBlindMint(
  instanceData: InstanceDataResponse
): Promise<BlindMintProduct> {
  const product = new BlindMintProductImpl(instanceData);
  await product.fetchOnchainData();
  return product;
}
```

### 2. Contract Interaction

```typescript
import { ClaimExtensionContract, ContractCallOptions } from '@/types';

const contract = new ClaimExtensionContract(
  networkId,
  extensionAddress,
  creatorAddress,
  claimIndex
);

const options: ContractCallOptions = {
  gasLimit: BigNumber.from('200000'),
  timeout: 5000,
  retries: 3
};

const result = await contract.mint(quantity, paymentAmount, walletAddress);
```

### 3. Error Handling

```typescript
import { 
  BlindMintError, 
  BlindMintErrorCode, 
  isRecoverableError,
  getSuggestedActions 
} from '@/types';

try {
  await blindMintProduct.purchase(params);
} catch (error) {
  if (error instanceof BlindMintError) {
    const actions = getSuggestedActions(error);
    const recoverable = isRecoverableError(error);
    
    if (error.code === BlindMintErrorCode.INSUFFICIENT_ALLOWANCE) {
      // Handle specific error type
      await handleInsufficientAllowance(error.context);
    }
  }
}
```

### 4. Configuration

```typescript
import { ProviderConfig, GasConfig, CacheConfig } from '@/types';

const config: ProviderConfig = {
  primary: {
    required: true,
    timeout: 5000,
    retries: 3,
    detectWalletConnect: true,
    supportedWallets: ['metamask', 'walletconnect']
  },
  bridge: {
    baseUrl: 'https://bridge.manifold.xyz',
    timeout: 1500,
    retries: 2,
    enabled: true,
    fallbackStrategy: 'after-timeout'
  },
  networks: {},
  global: {
    defaultTimeout: 30000,
    maxConcurrentOps: 5,
    strictMode: false,
    debugMode: false
  }
};
```

## Migration from Mock Implementation

### 1. Type Replacement

Replace mock types with comprehensive types:

```typescript
// Before (mock)
interface SimpleMint {
  mint(): Promise<void>;
}

// After (full implementation)
interface BlindMintProduct {
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  validateMint(params: MintValidationParams): Promise<MintValidation>;
  // ... additional methods
}
```

### 2. Error Handling Enhancement

```typescript
// Before (basic)
throw new Error('Mint failed');

// After (typed)
throw new BlindMintError(
  BlindMintErrorCode.INSUFFICIENT_ALLOWANCE,
  'Insufficient token allowance for minting',
  {
    instanceId: product.id,
    walletAddress: params.account.address,
    quantity: params.preparedPurchase.quantity
  }
);
```

### 3. Configuration Migration

```typescript
// Before (hardcoded)
const gasLimit = 200000;

// After (configurable)
const gasConfig = await getGasConfig(networkId);
const gasLimit = gasConfig.limits.mint;
```

## Validation and Type Safety

### 1. Runtime Validation

Types include validation support:

```typescript
interface MintValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  estimatedGas?: bigint;
  estimatedCost?: Cost;
}
```

### 2. Schema Validation

Types support runtime schema validation:

```typescript
import { validateCreateUser } from '@/types';

try {
  const validatedData = validateCreateUser(requestData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.validationErrors);
  }
}
```

## Performance Considerations

### 1. Caching

Types include comprehensive caching configuration:

```typescript
interface CacheConfig {
  memory: {
    maxSizeMB: number;
    defaultTTL: number;
    ttlByType: Record<CacheDataType, number>;
  };
  persistent: {
    enabled: boolean;
    storage: CacheStorageType;
    maxSizeMB: number;
  };
  // ... additional cache settings
}
```

### 2. Lazy Loading

Types support lazy initialization patterns:

```typescript
interface LazyLoadable<T> {
  loaded: boolean;
  loading: boolean;
  load(): Promise<T>;
  reload(): Promise<T>;
}
```

## Future Extensibility

### 1. Plugin Architecture

Types support plugin extensions:

```typescript
interface BlindMintPlugin {
  name: string;
  version: string;
  initialize(product: BlindMintProduct): Promise<void>;
  hooks: PluginHooks;
}
```

### 2. Custom Validators

Types allow custom validation:

```typescript
interface CustomValidator {
  name: string;
  validate(data: unknown): ValidationResult;
}
```

## Testing Support

Types include test utilities:

```typescript
interface ContractTest<T> {
  valid: T[];
  invalid: Array<{
    data: unknown;
    error: string;
  }>;
}
```

## Conclusion

This type contract specification provides a comprehensive, type-safe foundation for the BlindMint implementation. The types enable:

- **Robust Development**: Full TypeScript support prevents common errors
- **Clear Interfaces**: Well-defined contracts between components
- **Error Handling**: Comprehensive error types with actionable information
- **Performance**: Optimized caching and data transformation patterns
- **Extensibility**: Support for future enhancements and customizations

All agents working on the BlindMint implementation should use these types to ensure consistency, type safety, and maintainability across the entire codebase.