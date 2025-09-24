# Integration Strategy

This document outlines how to integrate the analyzed patterns from gachapon-widgets into the BlindMint SDK implementation.

## Phase 1: Foundation Layer

### 1.1 Create Base Contract Infrastructure

**Location:** `src/contracts/base/`

```typescript
// src/contracts/base/BaseContract.ts
export abstract class BaseContract {
  protected networkId: number;
  protected contractAddress: string;
  protected manifoldBridgeProvider: ManifoldBridgeProvider | undefined;

  constructor(networkId: number, contractAddress: string) {
    this.networkId = networkId;
    this.contractAddress = contractAddress;
  }

  // Import patterns from CONTRACT_PATTERNS.md
  protected abstract getABI(): string[];
  protected _getContractInstance(withSigner?, bridge?, unchecked?): Contract;
  protected async _callWeb3WithServerFallback(functionName: string, args: any[]): Promise<any>;
  protected async _estimateGasWithServerFallback(functionSig: string, args: any[]): Promise<BigNumber>;
  protected async errorHandling(error: ContractError);
}
```

### 1.2 Implement Provider Management

**Location:** `src/providers/`

```typescript
// src/providers/ProviderManager.ts
export class ProviderManager {
  private static instance: ProviderManager;
  private bridgeProviders: Map<number, ManifoldBridgeProvider> = new Map();

  static getInstance(): ProviderManager {
    if (!this.instance) {
      this.instance = new ProviderManager();
    }
    return this.instance;
  }

  // Implement patterns from CONTRACT_PATTERNS.md and REUSABLE_COMPONENTS.md
}
```

### 1.3 Setup Utility Layer

**Location:** `src/utils/`

```typescript
// src/utils/index.ts
export { PriceCalculator } from './PriceCalculator';
export { DateUtils } from './DateUtils';
export { NetworkUtils } from './NetworkUtils';
export { StorageUtils } from './StorageUtils';
export { ValidationUtils } from './ValidationUtils';
export { ErrorHandler } from './ErrorHandler';
```

## Phase 2: BlindMint Contract Implementation

### 2.1 BlindMint Contract Class

**Location:** `src/contracts/BlindMintContract.ts`

```typescript
import { BaseContract } from './base/BaseContract';
import { BlindMintABI } from '../abis/BlindMintABI';

export class BlindMintContract extends BaseContract {
  protected getABI(): string[] {
    return BlindMintABI;
  }

  // Core BlindMint functions
  async getBlindMintData(): Promise<BlindMintData> {
    return await this._callWeb3WithServerFallback('getBlindMintData', []);
  }

  async getTotalSupply(): Promise<number> {
    return await this._callWeb3WithServerFallback('totalSupply', []);
  }

  async mint(quantity: number, walletAddress: string): Promise<TransactionResponse> {
    // Implement using patterns from ClaimExtensionContract.mint()
  }

  async estimateGasMint(quantity: number, walletAddress: string): Promise<BigNumber> {
    // Implement using patterns from ClaimExtensionContract.estimateGasMint()
  }
}
```

### 2.2 Payment Token Support

**Location:** `src/contracts/PaymentContract.ts`

```typescript
// Adapt ERC20Contract for BlindMint payment tokens
export class PaymentContract extends BaseContract {
  // Direct adaptation from ERC20Contract patterns
}
```

## Phase 3: State Management Layer

### 3.1 BlindMint Store

**Location:** `src/stores/BlindMintStore.ts`

```typescript
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

export const useBlindMintStore = defineStore('blindmint', () => {
  // State - adapted from claimStore patterns
  const networkId = ref<number>(1);
  const contractAddress = ref<string>('');
  const totalSupply = ref<number>(0);
  const maxSupply = ref<number | null>(null);
  const mintPrice = ref<BigNumber>(BigNumber.from(0));
  
  // Contract instances
  const blindMintContract = ref<BlindMintContract>();
  const paymentContract = ref<PaymentContract>();
  
  // User state
  const walletAddress = ref<string | null>(null);
  const balance = ref<BigNumber | null>(null);
  const quantity = ref<number>(1);
  
  // Computed properties - adapted from claimStore patterns
  const isActive = computed(() => {
    // Implement using DateUtils.isActive() pattern
  });
  
  const canMint = computed(() => {
    // Implement availability logic
  });
  
  const finalPrice = computed(() => {
    return PriceCalculator.calculateFinalPrice(
      mintPrice.value,
      quantity.value,
      networkId.value
    );
  });
  
  // Actions - adapted from claimStore patterns
  async function initialize(config: BlindMintConfig) {
    // Implement using claimStore.initialize() pattern
  }
  
  async function refreshState() {
    // Implement using claimStore.refreshWeb3State() pattern
  }
  
  async function mint() {
    // Implement mint transaction
  }
  
  // Watchers - adapted from claimStore patterns
  watch(walletAddress, () => {
    if (walletAddress.value) {
      refreshState();
    }
  });
  
  return {
    // State
    networkId, contractAddress, totalSupply, maxSupply, mintPrice,
    walletAddress, balance, quantity,
    
    // Computed
    isActive, canMint, finalPrice,
    
    // Actions
    initialize, refreshState, mint
  };
});
```

## Phase 4: BlindMintProduct Class

### 4.1 Main Product Class

**Location:** `src/products/BlindMintProduct.ts`

```typescript
import { BaseProduct } from './BaseProduct';

export class BlindMintProduct extends BaseProduct {
  private store: ReturnType<typeof useBlindMintStore>;
  private contract: BlindMintContract;
  
  constructor(config: BlindMintConfig) {
    super(config);
    this.store = useBlindMintStore();
  }

  async initialize(): Promise<void> {
    // Initialize using patterns from claimStore.initialize()
    await this.store.initialize(this.config);
  }

  async mint(quantity: number): Promise<TransactionResponse> {
    // Validate inputs using ValidationUtils
    const error = ValidationUtils.validateMintQuantity(quantity, this.getMaxQuantity());
    if (error) {
      throw new Error(error);
    }

    // Execute mint using store action
    return await this.store.mint();
  }

  async getPrice(quantity: number): Promise<BigNumber> {
    // Use PriceCalculator
    return PriceCalculator.calculateFinalPrice(
      this.store.mintPrice,
      quantity,
      this.store.networkId
    );
  }

  // Implement other required methods from BaseProduct
}
```

## Phase 5: SDK Integration Points

### 5.1 Client Integration

**Location:** `src/client/ManifoldClient.ts`

```typescript
export class ManifoldClient {
  createBlindMintProduct(config: BlindMintConfig): BlindMintProduct {
    // Validate config using ValidationUtils
    if (!ValidationUtils.isValidAddress(config.contractAddress)) {
      throw new Error('Invalid contract address');
    }
    
    if (!ValidationUtils.isValidNetwork(config.networkId)) {
      throw new Error('Unsupported network');
    }
    
    return new BlindMintProduct(config);
  }
}
```

### 5.2 Type Definitions

**Location:** `src/types/blindmint.ts`

```typescript
export interface BlindMintConfig {
  networkId: number;
  contractAddress: string;
  paymentTokenAddress?: string;
  metadata?: BlindMintMetadata;
}

export interface BlindMintData {
  totalSupply: number;
  maxSupply: number | null;
  mintPrice: BigNumber;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
}

export interface BlindMintMetadata {
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Implement BaseContract class
- [ ] Setup ProviderManager
- [ ] Create utility classes
- [ ] Write comprehensive tests

### Week 2: Contract Layer
- [ ] Implement BlindMintContract
- [ ] Implement PaymentContract
- [ ] Add gas estimation logic
- [ ] Test contract interactions

### Week 3: State Management
- [ ] Create BlindMintStore
- [ ] Implement reactive patterns
- [ ] Add error handling
- [ ] Test state management

### Week 4: Product Integration
- [ ] Implement BlindMintProduct class
- [ ] Integrate with client
- [ ] Add validation layer
- [ ] End-to-end testing

## Testing Strategy

### Unit Tests
```typescript
// tests/contracts/BlindMintContract.test.ts
describe('BlindMintContract', () => {
  test('should fetch total supply', async () => {
    // Test using mocked providers
  });
  
  test('should estimate gas correctly', async () => {
    // Test gas estimation with buffer
  });
});
```

### Integration Tests
```typescript
// tests/integration/BlindMintProduct.test.ts
describe('BlindMintProduct Integration', () => {
  test('should initialize and mint successfully', async () => {
    // Full integration test
  });
});
```

## Error Handling Strategy

### 1. Contract Errors
- Use ErrorHandler.handleContractError() for transaction errors
- Implement retry logic for network timeouts
- Provide user-friendly error messages

### 2. Validation Errors
- Use ValidationUtils for input validation
- Fail fast with clear error messages
- Prevent invalid state transitions

### 3. Network Errors
- Implement fallback provider strategy
- Handle network switching gracefully
- Maintain state consistency across network changes

## Migration Path

### From Existing Code
1. **Extract Utilities**: Move common utilities to shared location
2. **Refactor Contracts**: Adapt existing contract patterns
3. **Migrate State**: Port state management patterns
4. **Update Types**: Ensure type safety throughout

### Backwards Compatibility
- Maintain existing API surface where possible
- Provide migration guides for breaking changes
- Support gradual adoption of new patterns

This integration strategy provides a structured approach to implementing BlindMint functionality while leveraging the proven patterns from the gachapon-widgets implementation.