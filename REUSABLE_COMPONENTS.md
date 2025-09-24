# Reusable Components and Utilities

This document identifies reusable components and utilities from the gachapon-widgets implementation that can be adapted for the BlindMint SDK.

## Core Contract Classes

### 1. Base Contract Wrapper Pattern

**Abstract Base Contract Class:**
```typescript
abstract class BaseContractWrapper {
  protected networkId: number;
  protected contractAddress: string;
  protected manifoldBridgeProvider: ManifoldBridgeProvider | undefined;

  constructor(networkId: number, contractAddress: string) {
    this.networkId = networkId;
    this.contractAddress = contractAddress;
  }

  protected _getContractInstance(withSigner = false, bridge = false, unchecked = false): Contract {
    if (bridge) {
      return new Contract(this.contractAddress, this.getABI(), this._getManifoldBridgeProvider());
    }
    const contract = window.ManifoldEthereumProvider.contractInstance(
      this.contractAddress,
      this.getABI(),
      withSigner,
      unchecked,
    );
    if (!contract) {
      throw new Error('No contract instance available, please refresh this page to try again');
    }
    return contract;
  }

  protected abstract getABI(): string[];

  private _getManifoldBridgeProvider(): ManifoldBridgeProvider {
    if (!this.manifoldBridgeProvider) {
      this.manifoldBridgeProvider = markRaw(new ManifoldBridgeProvider(this.networkId));
    }
    return this.manifoldBridgeProvider;
  }

  protected async _callWeb3WithServerFallback(functionName: string, args: any[]): Promise<any> {
    // Implementation from CONTRACT_PATTERNS.md
  }

  protected async _estimateGasWithServerFallback(functionSig: string, args: any[]): Promise<BigNumber> {
    // Implementation from CONTRACT_PATTERNS.md
  }

  protected async errorHandling(error: ContractError) {
    // Implementation from CONTRACT_PATTERNS.md
  }
}
```

### 2. ERC20 Contract Wrapper

**Reusable for BlindMint Payment Token Support:**
```typescript
class ERC20Contract extends BaseContractWrapper {
  protected getABI(): string[] {
    return erc20Abi;
  }

  async getAllowance(spender: string, owner: string): Promise<BigNumber> {
    return await this._callWeb3WithServerFallback('allowance', [owner, spender]);
  }

  async getERC20Name(): Promise<string> {
    return await this._callWeb3WithServerFallback('name', []);
  }

  async getERC20Symbol(): Promise<string> {
    return await this._callWeb3WithServerFallback('symbol', []);
  }

  async getERC20Decimals(): Promise<number> {
    return this._callWeb3WithServerFallback('decimals', []);
  }

  async approve(walletAddress: string, spender: string): Promise<TransactionResponse> {
    // Implementation with gas estimation and error handling
  }
}
```

## Provider Management Utilities

### 1. Web3 Call Utility

**File: `web3Call.ts` - Directly Reusable:**
```typescript
export interface ContractReadCallParams {
  contractAddress: string;
  abi: any[];
  functionName: string;
  args: any[];
}

export async function _callReadWeb3WithManifoldBridgeFallback(
  networkId: number,
  contractCallParams: ContractReadCallParams,
): Promise<any> {
  // Direct implementation from existing code
}

export function _getContractInstance(
  networkId: number,
  contractAddress: string,
  abi: any[],
  withSigner = false,
  bridge = false,
  unchecked = false,
): Contract {
  // Direct implementation from existing code
}
```

### 2. Provider Factory

**File: `providers.ts` - Enhanced Version:**
```typescript
export class ProviderManager {
  private static bridgeProviders: Map<number, ManifoldBridgeProvider> = new Map();

  static getManifoldBridgeProvider(network: number): ManifoldBridgeProvider {
    if (!this.bridgeProviders.has(network)) {
      this.bridgeProviders.set(network, markRaw(new ManifoldBridgeProvider(network)));
    }
    return this.bridgeProviders.get(network)!;
  }

  static async initializeProvider(networkId: number): Promise<void> {
    await detectManifoldEthereumProvider({ initialized: false });
    if (window.ManifoldEthereumProvider && !window.ManifoldEthereumProvider.initialized) {
      await window.ManifoldEthereumProvider.initialize({
        network: Network.isTestnet(networkId) ? networkId : undefined,
        browserProviderTimeout: 500,
        browserProviderIgnoreDisconnect: true,
      });
    }
  }
}
```

## State Management Patterns

### 1. Reactive State Wrapper

**Generic State Management for BlindMint:**
```typescript
export function createBlindMintStore() {
  // Core state
  const networkId = ref<number>(1);
  const contractAddress = ref<string>('');
  const isInitialized = ref(false);
  const isLoading = ref(false);
  
  // Contract instances
  const blindMintContract = ref<BlindMintContract>();
  const erc20Contract = ref<ERC20Contract>();
  
  // Wallet state
  const walletAddress = ref<string>();
  const activeNetwork = ref<number>();
  const balance = ref<BigNumber>();
  
  // BlindMint specific state
  const totalSupply = ref<number>(0);
  const maxSupply = ref<number | null>(null);
  const mintPrice = ref<BigNumber>(BigNumber.from(0));
  const isActive = ref<boolean>(false);
  
  // Computed properties
  const isConnected = computed(() => Boolean(walletAddress.value));
  const canMint = computed(() => isActive.value && !isSoldOut.value);
  const isSoldOut = computed(() => {
    if (maxSupply.value === null) return false;
    return totalSupply.value >= maxSupply.value;
  });
  
  // Actions
  async function initialize(config: BlindMintConfig) {
    // Implementation
  }
  
  async function refreshState() {
    // Implementation
  }
  
  return {
    // State
    networkId, contractAddress, isInitialized, isLoading,
    walletAddress, activeNetwork, balance,
    totalSupply, maxSupply, mintPrice, isActive,
    
    // Computed
    isConnected, canMint, isSoldOut,
    
    // Actions
    initialize, refreshState
  };
}
```

### 2. Price Calculation Utilities

**Reusable Price Logic:**
```typescript
export class PriceCalculator {
  static calculateFinalPrice(
    basePrice: BigNumber,
    quantity: number,
    networkId: number,
    hasManifoldFees: boolean = true
  ): BigNumber {
    const subtotal = basePrice.mul(quantity);
    
    if (!hasManifoldFees) {
      return subtotal;
    }
    
    let feePerMint = FEE_PER_MINT;
    if (networkId === 137) { // Polygon
      feePerMint = MATIC_FEE_PER_MINT;
    }
    
    const fees = feePerMint.mul(quantity);
    return subtotal.add(fees);
  }
  
  static convertToUSD(
    cryptoAmount: BigNumber,
    exchangeRate: number,
    decimals: number = 18
  ): number {
    return exchangeRate * +formatUnits(cryptoAmount, decimals);
  }
  
  static addGasBuffer(gasEstimate: BigNumber, bufferPercent: number = 25): BigNumber {
    return gasEstimate.mul((1 + bufferPercent / 100) * 100).div(100);
  }
}
```

## Data Transformation Utilities

### 1. Date and Time Utils

```typescript
export class DateUtils {
  static convertDateFromUnixSeconds(unixSeconds: number): Date | null {
    if (unixSeconds === 0) {
      return null;
    }
    return new Date(unixSeconds * 1000);
  }
  
  static getUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }
  
  static isActive(startDate: Date | null, endDate: Date | null): boolean {
    const now = Date.now();
    
    if (startDate && startDate.getTime() > now) {
      return false; // Not started
    }
    
    if (endDate && endDate.getTime() !== 0 && endDate.getTime() < now) {
      return false; // Ended
    }
    
    return true; // Active
  }
}
```

### 2. Network Utilities

```typescript
export class NetworkUtils {
  private static readonly NETWORK_SYMBOLS = {
    1: 'ETH',
    10: 'OETH', // Optimism
    137: 'MATIC', // Polygon
    8453: 'ETH', // Base
  };
  
  static getNetworkSymbol(networkId: number): string {
    return this.NETWORK_SYMBOLS[networkId as keyof typeof this.NETWORK_SYMBOLS] || 'ETH';
  }
  
  static isTestnet(networkId: number): boolean {
    return Network.isTestnet(networkId);
  }
  
  static getSupportedNetworks(): number[] {
    return [
      Network.NetworkId.Mainnet,
      Network.NetworkId.Optimism,
      Network.NetworkId.Base,
      Network.NetworkId.Shape,
    ];
  }
}
```

### 3. Storage Protocol Handler

```typescript
export enum StorageProtocol {
  INVALID = 0,
  NONE = 1,
  ARWEAVE = 2,
  IPFS = 3,
}

export class StorageUtils {
  private static readonly GATEWAYS = {
    [StorageProtocol.ARWEAVE]: 'https://arweave.net/',
    [StorageProtocol.IPFS]: 'https://ipfs.io/',
    [StorageProtocol.NONE]: '',
    [StorageProtocol.INVALID]: '',
  };
  
  static buildMetadataURL(protocol: StorageProtocol, location: string, tokenId?: number): string {
    const gateway = this.GATEWAYS[protocol];
    if (!gateway || !location) return '';
    
    if (tokenId !== undefined) {
      return `${gateway}${location}/${tokenId}`;
    }
    return `${gateway}${location}`;
  }
  
  static parseOnChainMetadata(location: string): any {
    return parseOnChainMetadata(location);
  }
}
```

## Error Handling Utilities

### 1. Contract Error Handler

```typescript
export interface ContractError {
  code: string;
  cancelled: boolean;
  replacement?: { hash: string };
  message?: string;
}

export class ErrorHandler {
  static async handleContractError(error: ContractError): Promise<TransactionResponse | never> {
    if (error.code === 'TRANSACTION_REPLACED' && !error.cancelled && error.replacement) {
      const provider = window.ManifoldEthereumProvider.provider();
      if (!provider) {
        throw new Error('No web3 provider detected, please refresh the page and try again');
      }
      return await provider.getTransaction(error.replacement.hash);
    }
    
    // Log error for debugging
    console.error('Contract error:', error);
    throw error;
  }
  
  static getErrorMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    
    if (error.code) {
      return `Transaction failed with code: ${error.code}`;
    }
    
    return 'An unknown error occurred';
  }
}
```

### 2. Validation Utilities

```typescript
export class ValidationUtils {
  static isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  static isValidNetwork(networkId: number): boolean {
    return NetworkUtils.getSupportedNetworks().includes(networkId);
  }
  
  static isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
  }
  
  static validateMintQuantity(quantity: number, maxQuantity: number): string | null {
    if (!this.isPositiveInteger(quantity)) {
      return 'Quantity must be a positive integer';
    }
    
    if (quantity > maxQuantity) {
      return `Quantity cannot exceed ${maxQuantity}`;
    }
    
    return null;
  }
}
```

## Configuration Types

### 1. BlindMint Configuration

```typescript
export interface BlindMintConfig {
  networkId: number;
  contractAddress: string;
  creatorContractAddress?: string;
  instanceId?: number;
  erc20Address?: string;
  fallbackProvider?: string;
}

export interface BlindMintState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Contract state
  totalSupply: number;
  maxSupply: number | null;
  mintPrice: BigNumber;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  
  // User state
  walletAddress: string | null;
  balance: BigNumber | null;
  canMint: boolean;
}
```

## Integration Points

These components can be integrated into the BlindMint SDK as follows:

1. **Contract Layer**: Use base contract wrapper and ERC20 contract directly
2. **Provider Layer**: Adapt provider management utilities
3. **State Layer**: Use reactive state patterns with BlindMint-specific adaptations
4. **Utility Layer**: Import all utility classes directly
5. **Error Layer**: Use error handling patterns with BlindMint-specific error types

The modular design allows for selective adoption and customization while maintaining consistency with the proven gachapon-widgets patterns.