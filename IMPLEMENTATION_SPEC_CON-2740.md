# Implementation Specification: Provider Adapters (CON-2740)

## Executive Summary

We are implementing a provider adapter pattern for the Manifold Client SDK to enable support for multiple Web3 libraries (ethers v5, ethers v6, and viem). This adapter layer will abstract blockchain provider operations through a unified Account interface, allowing seamless integration with different wallet providers while maintaining backward compatibility with the existing SDK architecture.

## Requirements

### Functional Requirements

#### Core Account Interface
1. **Address Management**
   - Expose wallet address as read-only property
   - Support ENS resolution (optional enhancement)
   - Validate address format

2. **Transaction Execution**
   - Send transactions with unified request format
   - Handle transaction signing through provider
   - Return standardized transaction responses
   - Support EIP-1559 transactions

3. **Balance Queries**
   - Get native token balance (ETH, MATIC, etc.)
   - Get ERC-20 token balances
   - Return values as Money class instances

4. **Network Management**
   - Get current connected network ID
   - Switch to different supported networks
   - Validate network support before operations

5. **Provider Abstraction**
   - Support ethers v5 providers (existing)
   - Support ethers v6 providers (new)
   - Support viem clients (new)
   - Auto-detect provider type

### Non-Functional Requirements

#### Performance
- Transaction execution: <3 seconds average
- Network switching: <2 seconds
- Balance queries: <500ms
- Memory footprint: <10MB per adapter instance

#### Compatibility
- Zero breaking changes to existing public APIs
- TypeScript 5.4+ with full type inference
- Node.js 18+ and modern browsers
- Support for hardware wallets (Ledger, Trezor)

#### Security
- No exposure of private keys
- Validate all addresses before use
- Secure network switching with confirmations
- Proper error handling for rejected transactions

#### Reliability
- Graceful degradation on network issues
- Retry logic for transient failures
- Timeout handling for hanging operations
- Clear error messages for debugging

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│    (preparePurchase, step.execute)      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Account Interface               │
│      (IAccountAdapter - CON-2740)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        Adapter Implementations          │
│  ┌──────────┬──────────┬──────────┐    │
│  │ Ethers5  │ Ethers6  │  Viem    │    │
│  │ Adapter  │ Adapter  │ Adapter  │    │
│  └──────────┴──────────┴──────────┘    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Provider Libraries                 │
│  (ethers v5, ethers v6, viem)           │
└─────────────────────────────────────────┘
```

### Components

#### 1. Account Interface (IAccountAdapter)
```typescript
interface IAccountAdapter {
  // Properties
  readonly address: string;
  readonly adapterType: 'ethers5' | 'ethers6' | 'viem';
  
  // Methods
  sendTransaction(request: UniversalTransactionRequest): Promise<UniversalTransactionResponse>;
  getBalance(tokenAddress?: string): Promise<Money>;
  getConnectedNetworkId(): Promise<number>;
  switchNetwork(chainId: number): Promise<void>;
  
  // Optional enhancements
  signMessage?(message: string): Promise<string>;
  signTypedData?(typedData: TypedDataPayload): Promise<string>;
}
```

#### 2. Universal Transaction Types
```typescript
interface UniversalTransactionRequest {
  to: string;
  value?: string; // Will be converted to Money
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
}

interface UniversalTransactionResponse {
  hash: string;
  blockNumber?: number;
  blockHash?: string;
  from: string;
  to: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  status?: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
}
```

#### 3. Adapter Factory
```typescript
class AccountAdapterFactory {
  // Explicit creation methods for each library
  static fromEthers5(provider: ethers5.providers.Provider | ethers5.Signer): IAccountAdapter {
    return new Ethers5Adapter(provider);
  }
  
  static fromEthers6(provider: ethers6.Provider | ethers6.Signer): IAccountAdapter {
    return new Ethers6Adapter(provider);
  }
  
  static fromViem(client: ViemClient): IAccountAdapter {
    return new ViemAdapter(client);
  }
  
  // Optional auto-detect for convenience (can be deprecated later)
  static create(provider: unknown): IAccountAdapter {
    if (isEthers5Provider(provider)) {
      return AccountAdapterFactory.fromEthers5(provider);
    }
    if (isEthers6Provider(provider)) {
      return AccountAdapterFactory.fromEthers6(provider);
    }
    if (isViemClient(provider)) {
      return AccountAdapterFactory.fromViem(provider);
    }
    throw new Error('Unsupported provider type. Use explicit methods: fromEthers5, fromEthers6, or fromViem');
  }
}
```

### Data Models

#### Network Configuration
```typescript
interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls?: string[];
  isTestnet?: boolean;
}
```

#### Supported Networks
- Ethereum Mainnet (1)
- Polygon (137)
- Optimism (10)
- Arbitrum One (42161)
- Base (8453)
- Sepolia Testnet (11155111)

### API Specifications

#### Integration with preparePurchase
```typescript
// Before (current implementation)
await product.preparePurchase({
  address: '0x...',
  networkId: 1,
  payload: { quantity: 1 }
});

// After (with adapter) - Using explicit factory methods
const account = AccountAdapterFactory.fromEthers5(signer);
// or
const account = AccountAdapterFactory.fromViem(viemClient);

// For BlindMint: networkId comes from the product, not the wallet
const blindMintProduct = await client.getProduct(instanceId);
await blindMintProduct.preparePurchase({
  address: account.address,
  networkId: blindMintProduct.networkId, // Use product's network, not wallet's current network
  payload: { quantity: 1 }
});

// The SDK will handle network validation and switching if needed
if (await account.getConnectedNetworkId() !== blindMintProduct.networkId) {
  await account.switchNetwork(blindMintProduct.networkId);
}
```

#### Integration with step.execute
```typescript
// Before
await step.execute(signer);

// After - with explicit adapter creation
const account = AccountAdapterFactory.fromEthers5(signer);
await step.execute(account);

// Or for Viem users
const account = AccountAdapterFactory.fromViem(viemWalletClient);
await step.execute(account);

// The step will use the account adapter for:
// - Sending the transaction
// - Getting the correct network
// - Handling provider-specific quirks
```

## User Flows

### Purchase Flow with Adapter
1. User connects wallet (MetaMask, WalletConnect, etc.)
2. SDK creates adapter using explicit factory method (fromEthers5, fromViem, etc.)
3. For BlindMint products:
   - preparePurchase uses product.networkId (not wallet's current network)
   - Address from adapter used for eligibility checks
4. Network validation:
   - Compare adapter.getConnectedNetworkId() with product.networkId
   - Trigger network switch if different
5. Balance check via adapter.getBalance() on correct network
6. Transaction execution through adapter.sendTransaction()
7. Transaction monitoring and receipt handling

### Network Switching Flow
1. SDK compares product.networkId with adapter.getConnectedNetworkId()
2. If different, call adapter.switchNetwork(product.networkId)
3. Adapter requests network switch through provider
4. User confirms in wallet
5. Adapter validates successful switch
6. Continue with purchase flow on correct network

**Important**: For BlindMint and other product types, the network is determined by the product configuration, not the user's current wallet network. This ensures purchases happen on the correct blockchain where the NFT contract is deployed.

## Integration Points

### Existing Systems
1. **ManifoldClient**: Minimal changes, adapter creation in constructor
2. **Product Classes**: Update purchase methods to accept IAccountAdapter
3. **TransactionStep**: Modify execute to work with adapter interface
4. **Money Class**: Integration with balance queries
5. **ContractFactory**: Update to work with adapter-provided signers

### External Dependencies
1. **ethers v5**: Maintain as peer dependency
2. **ethers v6**: Add as optional peer dependency
3. **viem**: Add as optional peer dependency
4. **@manifoldxyz/manifold-provider-client**: No changes needed
5. **@manifoldxyz/studio-apps-client**: No changes needed

## Security Considerations

### Wallet Security
- Never store or access private keys directly
- All signing operations delegated to provider
- Support for hardware wallet isolation

### Transaction Security
- Validate transaction parameters before sending
- Implement transaction simulation when possible
- Clear user consent for all transactions

### Network Security
- Validate chainId against supported networks
- Prevent transactions on wrong networks
- Secure RPC endpoint configuration

## Testing Strategy

### Unit Tests
```typescript
// Test each adapter with explicit factory methods
describe('AccountAdapterFactory', () => {
  test('creates Ethers5 adapter explicitly', async () => {
    const mockSigner = createMockEthers5Signer();
    const adapter = AccountAdapterFactory.fromEthers5(mockSigner);
    expect(adapter.adapterType).toBe('ethers5');
  });
  
  test('creates Viem adapter explicitly', async () => {
    const mockClient = createMockViemClient();
    const adapter = AccountAdapterFactory.fromViem(mockClient);
    expect(adapter.adapterType).toBe('viem');
  });
});

describe('BlindMint with Adapters', () => {
  test('uses product network, not wallet network', async () => {
    const account = AccountAdapterFactory.fromEthers5(signer);
    const product = await client.getProduct(blindMintInstanceId);
    
    // Product is on Base (8453), wallet might be on Ethereum (1)
    expect(product.networkId).toBe(8453);
    
    const prepared = await product.preparePurchase({
      address: account.address,
      networkId: product.networkId, // Use product's network
      payload: { quantity: 1 }
    });
    
    expect(prepared.networkId).toBe(8453);
  });
});
```

### Integration Tests
- Test adapter factory with different provider types
- Test purchase flow with each adapter
- Test network switching scenarios
- Test error handling and edge cases

### End-to-End Tests
- Full BlindMint purchase with each library
- Cross-library compatibility verification
- Performance benchmarks across adapters

## Deployment Plan

### Phase 1: Foundation (Week 1)
- Fix existing build issues
- Implement core interfaces
- Create adapter factory

### Phase 2: Adapters (Week 2-3)
- Implement Ethers5Adapter (leverage existing code)
- Implement Ethers6Adapter (handle breaking changes)
- Implement ViemAdapter (new integration)

### Phase 3: Integration (Week 4)
- Update existing components
- Comprehensive testing
- Documentation updates

### Rollout Strategy
1. **Phase 1**: Release with explicit factory methods
   - `AccountAdapterFactory.fromEthers5()` (immediate)
   - Maintain backward compatibility with auto-detect `create()`
   
2. **Phase 2**: Add additional library support
   - `AccountAdapterFactory.fromEthers6()` (minor version)
   - `AccountAdapterFactory.fromViem()` (minor version)
   
3. **Phase 3**: Migration guidance
   - Documentation with migration examples
   - Deprecation warnings for auto-detect `create()`
   
4. **Phase 4**: Full adapter adoption
   - Remove auto-detect in next major version
   - Require explicit factory methods

### Migration Examples
```typescript
// Old way (will be deprecated)
const account = AccountAdapterFactory.create(provider);

// New way (explicit and type-safe)
const account = AccountAdapterFactory.fromEthers5(signer);
// or
const account = AccountAdapterFactory.fromViem(walletClient);
```

## Success Metrics

### Technical Metrics
- 100% backward compatibility maintained
- <5% performance degradation
- 90%+ test coverage
- Zero critical security issues

### Adoption Metrics
- Successful integration by 3+ partners
- Support tickets <10 for adapter issues
- Documentation clarity score >4/5

### Business Metrics
- Increased SDK adoption by 20%
- Reduced integration time by 30%
- Support for 3 major wallet providers

## Validated Assumptions

- **Direction**: Outbound transactions from user wallets
- **Architecture**: Adapter pattern with factory
- **Processing**: Asynchronous transaction handling
- **Phase**: Enhancement to existing SDK
- **NOT Building**: 
  - Custom wallet implementation
  - Direct key management
  - Custom RPC provider
  - Blockchain indexing
  - Smart contract modifications

## Risk Mitigation

### Technical Risks
1. **Library incompatibilities**: Extensive testing matrix
2. **Performance degradation**: Benchmark from day 1
3. **Type safety loss**: Strict TypeScript configuration

### Integration Risks
1. **Breaking changes**: Comprehensive backward compatibility tests
2. **Wallet compatibility**: Test with major wallet providers
3. **Network issues**: Implement robust retry logic

## Future Enhancements

### Phase 2 Considerations
- WalletConnect v2 specific optimizations
- Account abstraction (ERC-4337) support
- Multi-signature wallet support
- Gasless transaction support
- Cross-chain message passing