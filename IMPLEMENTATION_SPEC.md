# Implementation Specification: Edition Product Support

## Executive Summary

Implementing Edition product type for the Manifold Client SDK to enable headless purchasing of fixed/open edition NFTs. This extends the existing SDK with support for standard NFT drops, allowlisted sales, and time-based minting windows, following established patterns from the BlindMint implementation.

## Requirements

### Functional Requirements

#### Core Edition Features
- **Product Data Fetching**: Retrieve Edition product configuration from Manifold API
- **On-chain Data Loading**: Fetch real-time claim state from Edition contracts
- **Eligibility Validation**: Check user eligibility against allowlists, redemption codes, and wallet limits
- **Cost Calculation**: Compute total cost including product price and platform fees
- **Transaction Preparation**: Build transaction steps for approvals and minting
- **Purchase Execution**: Execute multi-step transactions with proper error handling

#### Allowlist Support
- **Merkle Proof Generation**: Generate proofs for allowlisted addresses
- **Proof Validation**: Validate merkle proofs against on-chain root
- **Allowlist Caching**: Cache allowlist data for performance
- **Multi-tier Support**: Handle different allowlist tiers with varying prices/limits

#### Purchase Flows
- **Public Sales**: Open minting with optional per-wallet limits
- **Allowlist Sales**: Restricted minting with merkle proof validation
- **Redemption Codes**: Code-based access with server validation
- **Time Windows**: Start/end date enforcement

### Non-Functional Requirements

#### Performance
- Product load time < 1 second
- Purchase preparation < 2 seconds
- Merkle proof generation < 100ms for lists up to 10,000 addresses
- Efficient caching of on-chain data

#### Reliability
- Graceful handling of RPC failures with retry logic
- Transaction status tracking through completion
- Proper error messages for all failure scenarios

#### Security
- No private keys or sensitive data in client code
- Secure merkle proof validation
- Protection against replay attacks

#### Compatibility
- Support for both ethers v5 and viem adapters
- Multi-network support (Ethereum, Base, Optimism, Shape)
- Backward compatibility with existing SDK API

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Manifold Client SDK                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Client Factory                         │   │
│  │  • getProduct() with Edition routing                │   │
│  │  • Type detection via AppId.EDITION                 │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │            EditionProduct Class                     │   │
│  │  • fetchOnchainData()                              │   │
│  │  • preparePurchase()                               │   │
│  │  • purchase()                                      │   │
│  │  • Standard product interface methods              │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │                                         │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │          Shared Infrastructure                      │   │
│  │  • ContractFactory (Edition support)               │   │
│  │  • MerkleProofService (new)                        │   │
│  │  • Transaction Steps                               │   │
│  │  • Gas Estimation                                  │   │
│  │  • Money/Cost Calculations                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┬─────────────────┐
        ▼                           ▼                 ▼
┌───────────────┐         ┌─────────────────┐ ┌─────────────┐
│ Manifold API  │         │ RPC Providers   │ │  Contracts  │
│ (Studio Apps) │         │ (Ethereum, etc) │ │  (Edition)  │
└───────────────┘         └─────────────────┘ └─────────────┘
```

### Components

#### EditionProduct Class
**Location**: `src/products/edition.ts`
**Responsibilities**:
- Product data management and caching
- Eligibility validation with allowlist support
- Transaction preparation with merkle proofs
- Purchase execution with error handling
- Standard product interface implementation

#### Edition Contract Integration
**Location**: Updates to `src/utils/contract-factory.ts`
**Responsibilities**:
- Edition contract ABI management
- Contract method invocation (`mintProxy`)
- Gas estimation for Edition transactions
- Platform fee calculation

#### MerkleProofService
**Location**: `src/utils/merkle-proof.ts` (new)
**Responsibilities**:
- Merkle tree construction from allowlists
- Proof generation for addresses
- Proof validation against roots
- Caching of generated proofs

#### Type Definitions
**Location**: `src/types/product.ts` (already exists)
**Updates**: None required - Edition types fully defined

### Data Models

#### EditionPublicData
```typescript
interface EditionPublicData {
  title: string;
  description?: string;
  asset: Asset;
  network: number;
  contract: Contract;
  extensionAddress: string;
  maxSupply?: number;
  maxPerWallet?: number;
  startTime?: string;
  endTime?: string;
  price: string;
  allowlists?: AllowlistConfig[];
}
```

#### EditionOnchainData
```typescript
interface EditionOnchainData {
  totalSupply: number;
  maxSupply?: number;
  cost: Money;
  startDate?: Date;
  endDate?: Date;
  maxPurchaseAmount?: number;
  merkleRoot?: string;
  platformFee: Money;
}
```

#### AllowlistProof
```typescript
interface AllowlistProof {
  merkleRoot: string;
  proof: string[];
  leaf: string;
  maxQuantity?: number;
  price?: Money;
}
```

### API Specifications

#### Product Fetching
```typescript
// Existing API - no changes needed
client.getProduct(instanceIdOrUrl: string): Promise<EditionProduct>
```

#### Edition-Specific Methods
```typescript
interface EditionProduct {
  // Fetch current on-chain state
  fetchOnchainData(force?: boolean): Promise<EditionOnchainData>;
  
  // Prepare purchase with allowlist support
  preparePurchase(params: {
    address: string;
    recipientAddress?: string;
    payload: {
      quantity: number;
      code?: string; // Redemption code
      allowlistProof?: AllowlistProof; // Pre-generated proof
    };
  }): Promise<PreparedPurchase>;
  
  // Execute purchase transaction
  purchase(params: {
    account: IAccount;
    preparedPurchase: PreparedPurchase;
  }): Promise<Order>;
  
  // Check allowlist eligibility
  checkAllowlist(address: string): Promise<{
    isEligible: boolean;
    proof?: AllowlistProof;
    maxQuantity?: number;
  }>;
}
```

## User Flows

### Public Sale Flow
1. User loads Edition product
2. SDK fetches product data and on-chain state
3. User selects quantity
4. SDK validates against wallet limits
5. SDK calculates total cost
6. User approves transaction
7. SDK executes mint transaction
8. Order confirmation returned

### Allowlist Sale Flow
1. User loads Edition product
2. SDK checks if address is allowlisted
3. If eligible, SDK generates merkle proof
4. User selects quantity (within allowlist limits)
5. SDK prepares transaction with proof
6. User approves transaction
7. SDK executes mintProxy with proof
8. Order confirmation returned

### Redemption Code Flow
1. User enters redemption code
2. SDK validates code via Manifold API
3. If valid, proceeds with standard purchase flow
4. Code usage tracked server-side

## Integration Points

### Manifold Studio Apps API
- **Instance Data**: Fetch Edition configuration
- **Preview Data**: Get media and metadata
- **Merkle Trees**: Retrieve allowlist data
- **Code Validation**: Verify redemption codes

### Blockchain Networks
- **Ethereum Mainnet**: Primary network
- **Base**: Layer 2 support
- **Optimism**: Layer 2 support  
- **Shape**: Additional network

### Contract Interactions
- **Edition Extension Contract**: Core minting logic
- **Creator Contract**: NFT ownership
- **ERC20 Contracts**: Token payments (optional)

## Security Considerations

### Allowlist Security
- Merkle proofs validated on-chain
- No client-side allowlist storage
- Proof generation server-side when possible

### Transaction Security
- All transactions user-signed
- No automatic approvals
- Clear cost display before execution

### Data Privacy
- No PII stored in SDK
- Wallet addresses only used for transactions
- No analytics or tracking

## Testing Strategy

### Unit Tests
**Coverage Target**: 80%
- EditionProduct constructor validation
- fetchOnchainData with mocked responses
- preparePurchase eligibility scenarios
- Merkle proof generation and validation
- Cost calculation accuracy
- Error handling for all failure modes

### Integration Tests
- End-to-end purchase flow on testnet
- Multi-network Edition contracts
- Allowlist validation with real proofs
- Gas estimation accuracy
- Wallet adapter compatibility

### Manual Testing
- Real Edition contracts on mainnet
- Various allowlist configurations
- Edge cases (sold out, ended sales)
- Performance under load

## Deployment Plan

### Phase 1: Foundation (Week 1)
- Extract Edition contract ABIs
- Implement MerkleProofService
- Extend ContractFactory

### Phase 2: Core Implementation (Week 2)
- Build EditionProduct class
- Integrate with client factory
- Add allowlist support

### Phase 3: Testing & Polish (Week 3)
- Comprehensive test suite
- Performance optimization
- Documentation updates

### Phase 4: Release (Week 4)
- Beta testing with partners
- Bug fixes and refinements
- Production release

## Success Metrics

### Technical KPIs
- Test coverage > 80%
- Product load time < 1s
- Purchase success rate > 95%
- Zero critical bugs in production

### Business KPIs
- Edition products fully supported
- Feature parity with Manifold web app
- Developer satisfaction (easy integration)
- No breaking changes to existing API

### User Experience KPIs
- Clear error messages for failures
- Smooth transaction flow
- Accurate cost estimates
- Fast eligibility checks

## Validated Assumptions

### Architecture Decisions
- **Direction**: Client-initiated (outbound) blockchain transactions
- **Architecture**: Extending existing single-client pattern
- **Processing**: Synchronous transaction preparation, async execution
- **Phase**: Feature addition to existing SDK
- **Pattern Reuse**: Following BlindMint implementation exactly

### Technical Assumptions
- Edition contract ABI available in claim-contracts package
- Merkle proof generation using standard libraries
- Gas estimation patterns work for Edition contracts
- Platform fees similar to BlindMint products

### NOT Building
- Server-side components (API remains unchanged)
- Custom allowlist management UI
- Cross-chain bridging (future feature)
- Lazy minting functionality
- Auction mechanisms

## Risk Mitigation

### Technical Risks
1. **Merkle Proof Complexity**: Use proven libraries, extensive testing
2. **Contract Method Differences**: Abstract contract layer for flexibility
3. **Large Allowlists**: Implement pagination and caching

### Integration Risks
1. **API Response Changes**: Robust validation and error handling
2. **Network Variability**: Retry logic and fallback RPCs
3. **Wallet Compatibility**: Test both adapter types thoroughly

### Performance Risks
1. **Proof Generation Speed**: Cache proofs, optimize algorithms
2. **On-chain Data Fetching**: Implement smart caching strategy
3. **Transaction Estimation**: Provide fallback gas values

## Appendix

### Contract Methods

#### mintProxy Method Signature
```solidity
function mintProxy(
    address creatorContractAddress,
    uint256 instanceId,
    uint16 mintCount,
    uint32[] calldata mintIndices,
    bytes32[][] calldata merkleProofs,
    address mintFor
) external payable
```

### Reference Implementation
Study patterns from:
- `@manifoldxyz/claim-widgets/src/lib/transactionFlow/steps/mint.tsx`
- Existing BlindMintProduct implementation
- Edition contracts on mainnet

### Testing Contracts
- Mainnet Edition: `0x...` (to be identified)
- Base Edition: `0x...` (to be identified)
- Testnet contracts available for development