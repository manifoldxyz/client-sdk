# Implementation Specification: Edition Product Support

## Executive Summary

We are implementing support for the Edition product type in the Manifold Client SDK. This will enable headless purchasing and display of Edition NFT products, following the existing pattern established by the BlindMint product implementation. The Edition product represents fixed or open edition NFTs with optional allowlist/claim-code functionality.

## Requirements

### Functional Requirements

1. **Product Creation**
   - Create EditionProduct class implementing the Product interface
   - Support initialization from instance and preview data
   - Handle Edition-specific data structures

2. **On-chain Data Fetching**
   - Fetch and parse on-chain claim data from extension contracts
   - Support both ERC721 and ERC1155 Edition contracts
   - Handle multiple extension address variations

3. **Allowlist Support**
   - Check if wallet is in allowlist via merkle proofs
   - Support claim codes for discounted/free mints
   - Integrate with existing allowlist data from Studio Apps API

4. **Purchase Preparation**
   - Validate eligibility (supply, wallet limits, dates, allowlist)
   - Calculate total cost including platform fees
   - Generate transaction data for mintProxy method
   - Support quantity selection

5. **Transaction Execution**
   - Execute mint transactions via mintProxy
   - Support both regular and allowlist mints
   - Handle ERC20 token approvals when needed

6. **Status and Inventory**
   - Provide real-time product status (active, paused, sold-out, upcoming)
   - Track minted supply vs total supply
   - Calculate remaining inventory

### Non-Functional Requirements

1. **Performance**
   - On-chain data fetching < 2 seconds
   - Merkle proof verification < 100ms
   - Gas estimation accurate within 10%

2. **Compatibility**
   - Support all networks (Ethereum, Base, Optimism, Shape)
   - Work with both ethers v5 and viem adapters
   - Handle all Edition contract variations

3. **Type Safety**
   - Full TypeScript typing with no `any` types
   - Strict mode compliance
   - Proper error typing

4. **Error Handling**
   - Comprehensive error codes for all failure scenarios
   - User-friendly error messages
   - Proper error context for debugging

## Technical Architecture

### System Overview

```
Client SDK
    │
    ├── Client Factory (getProduct)
    │   └── Routes to EditionProduct based on AppId
    │
    ├── EditionProduct Class
    │   ├── Constructor (instance + preview data)
    │   ├── fetchOnchainData() → ClaimExtensionContract
    │   ├── getAllocations() → Check allowlist/limits
    │   ├── preparePurchase() → Validate & build tx
    │   └── purchase() → Execute via adapter
    │
    └── Contract Layer
        ├── ClaimExtensionContract (ABI interactions)
        └── ERC20Contract (token approvals)
```

### Components

#### 1. EditionProduct Class (`src/products/edition.ts`)

Main implementation class with:
- Instance data storage
- On-chain data fetching logic
- Allowlist verification
- Purchase preparation and execution
- Status and inventory management

#### 2. Edition Types (`src/types/edition.ts`)

TypeScript definitions:
- `EditionPublicData` - Off-chain configuration
- `EditionOnchainData` - On-chain state
- `EditionPayload` - Purchase parameters
- `EditionProduct` - Complete interface

#### 3. Claim Extension ABI (`src/abis/ClaimExtensionABI.ts`)

Contract ABI for:
- `getClaim()` - Fetch claim configuration
- `mintProxy()` - Execute mints
- `getClaimForToken()` - Token-specific data

#### 4. Contract Factory Updates

Extend to support:
- ClaimExtension contract creation
- Multiple extension address types
- Proper network-specific configuration

### Data Models

#### EditionOnchainData

```typescript
interface EditionOnchainData {
  totalSupply: number;      // Max supply (0 = unlimited)
  totalMinted: number;       // Current minted count
  walletMax: number;         // Per-wallet limit
  startDate: Date;           // Sale start
  endDate: Date;             // Sale end
  cost: Money;               // Price per token
  merkleRoot: string;        // Allowlist root
  extensionAddress: Address; // Contract address
  claimIndex: number;        // Claim index in contract
}
```

#### EditionPayload

```typescript
interface EditionPayload {
  quantity: number;          // Number to mint
  code?: string;             // Optional claim code
  merkleProofs?: string[];   // Allowlist proofs
}
```

### API Specifications

#### Primary Methods

1. **fetchOnchainData()**
   - Calls `getClaim()` on extension contract
   - Parses and transforms raw data
   - Caches result for performance

2. **preparePurchase(params)**
   - Input: address, quantity, code (optional)
   - Output: PreparedPurchase with steps
   - Validates all constraints
   - Generates merkle proofs if needed

3. **getAllocations(params)**
   - Input: wallet address
   - Output: eligibility and max quantity
   - Checks allowlist and wallet limits

## User Flows

### Standard Purchase Flow

1. User loads product → `client.getProduct()`
2. SDK fetches instance data → Manifold API
3. Product checks status → `product.getStatus()`
4. User checks eligibility → `product.getAllocations()`
5. User prepares purchase → `product.preparePurchase()`
6. SDK validates and calculates costs
7. User executes → `product.purchase()`
8. SDK sends transaction(s)

### Allowlist Purchase Flow

1. Same initial steps (1-3)
2. SDK checks allowlist → Merkle proof verification
3. If eligible, reduced/free price applied
4. Purchase continues with proofs included

## Integration Points

### External Systems

1. **Manifold API**
   - Instance data fetching
   - Preview data retrieval
   - Allowlist data access

2. **Blockchain RPCs**
   - Contract state reading
   - Transaction submission
   - Gas estimation

3. **Extension Contracts**
   - Claim data reading
   - Mint execution
   - Supply tracking

### Internal Dependencies

1. **Utils**
   - Provider factory
   - Contract factory
   - Validation utilities
   - Gas estimation

2. **Types**
   - Common types
   - Error types
   - Purchase types

3. **Adapters**
   - Account abstraction
   - Transaction signing

## Security Considerations

### Input Validation
- Validate all addresses
- Sanitize quantity inputs
- Verify merkle proofs
- Check claim codes

### Transaction Safety
- Accurate gas estimation
- Proper nonce handling
- Revert reason parsing
- User confirmation flows

### Data Protection
- No sensitive data logging
- Secure RPC connections
- Safe BigNumber handling

## Testing Strategy

### Unit Tests
- EditionProduct methods
- Allowlist verification
- Cost calculations
- Status determination

### Integration Tests
- Full purchase flow
- Contract interactions
- Error scenarios
- Network switching

### E2E Tests
- Complete user journey
- Multi-network testing
- Adapter compatibility
- Error recovery

## Deployment Plan

### Phase 1: Core Implementation
- EditionProduct class
- Basic purchase flow
- Contract integration

### Phase 2: Allowlist Support
- Merkle proof verification
- Claim code handling
- Discounted pricing

### Phase 3: Polish & Testing
- Comprehensive tests
- Documentation
- Example updates

## Success Metrics

### Acceptance Criteria
- ✅ All Edition products load correctly
- ✅ Purchase flow completes successfully
- ✅ Allowlist verification works
- ✅ All tests pass (>80% coverage)
- ✅ TypeScript strict mode compliant
- ✅ Documentation complete

### Performance Targets
- Product load time < 1s
- Purchase preparation < 2s
- Transaction confirmation < 30s
- Error recovery < 5s

## Validated Assumptions

- **Direction**: Outbound - SDK calls TO contracts
- **Architecture**: Single-provider per network (no multi-provider)
- **Processing**: Asynchronous with Promises
- **Phase**: Enhancement - Adding to existing SDK
- **NOT Building**: 
  - Burn/Redeem products (separate task)
  - Cross-chain bridging (future feature)
  - Custom UI components
  - Backend services

## Technical References

- Existing implementation: `@claim-widgets/src/lib/transactionFlow/steps/mint.tsx`
- Contract reference: `@claim-widgets/src/contracts/claimExtensionContract.ts`
- Example data: https://manifold.xyz/@don-testing-58e831b9/id/4163107056/data
- BlindMint pattern: `src/products/blindmint.ts`