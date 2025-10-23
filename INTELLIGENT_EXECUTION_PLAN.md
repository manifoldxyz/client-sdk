# Intelligent Execution Plan - Edition Product Implementation

## 🔍 Discovery-Driven Foundation

### Auto-Discovered Type Contracts (Critical Priority)

Based on the codebase analysis, these contracts MUST be built first as they're shared across the implementation:

```typescript
// Critical shared types that multiple components depend on
interface EditionOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  cost: Money;
  merkleRoot: string;
  extensionAddress: Address;
  claimIndex: number;
}

interface EditionPayload {
  quantity: number;
  code?: string;
  merkleProofs?: string[];
}

interface EditionProduct extends BaseProduct<EditionPublicData> {
  type: AppType.EDITION;
  onchainData?: EditionOnchainData;
  // ... methods
}
```

**Rationale**: These types are used by the EditionProduct class, contract layer, client factory, and test suites.

### Dependency-Based Staging

Execution order determined by actual code dependencies:

## Stage 1: Foundation - Type Contracts & ABIs (30-45 minutes)

```yaml
foundation:
  - name: "edition-type-contracts"
    agent: "type-contract"
    duration: "20-30m"
    parallel: true
    input: |
      Create comprehensive Edition type definitions:
      - EditionPublicData (already exists, verify completeness)
      - EditionOnchainData structure
      - EditionPayload for purchases
      - EditionProduct interface extending BaseProduct
      - ClaimExtension contract types
    output:
      - src/types/edition.ts with all Edition-specific types
      - Updates to src/types/index.ts exports
    dependencies: []
    
  - name: "claim-extension-abi"
    agent: "software-engineer"
    duration: "15-20m"
    parallel: true
    input: |
      Create ClaimExtension contract ABI based on claim-widgets reference:
      - getClaim() method for fetching claim data
      - mintProxy() for executing mints
      - getClaimForToken() for token-specific data
      - mint() and mintBatch() methods
      - Reference: @claim-widgets/src/contracts/claimExtensionContract.ts
    output:
      - src/abis/ClaimExtensionABI.ts
      - Updates to src/abis/index.ts exports
    dependencies: []
```

## Stage 2: Contract Layer Implementation (45-60 minutes)

```yaml
contracts:
  - name: "claim-extension-contract"
    agent: "backend-engineer"
    duration: "45-60m"
    parallel: false
    input: |
      Implement ClaimExtensionContract class:
      - Use ClaimExtensionABI from Stage 1
      - Implement getClaim() to fetch on-chain data
      - Handle multiple extension address types (721, 1155, updatable fee variants)
      - Gas estimation for mint operations
      - Transform raw contract data to EditionOnchainData
      - Reference BlindMintClaimContract pattern in contract-factory.ts
    output:
      - Updated src/utils/contract-factory.ts with ClaimExtension support
      - Contract initialization and method implementations
    dependencies: ["edition-type-contracts", "claim-extension-abi"]
    requires_verification: true
```

## Stage 3: Core Product Implementation (60-90 minutes)

```yaml
product:
  - name: "edition-product-class"
    agent: "backend-engineer"
    duration: "60-90m"
    parallel: false
    input: |
      Create EditionProduct class following BlindMintProduct pattern:
      
      Core Methods:
      - constructor(instanceData, previewData, options)
      - fetchOnchainData(): Fetch and cache contract state
      - getAllocations(): Check eligibility with allowlist support
      - preparePurchase(): Validate and build transaction steps
      - purchase(): Execute via account adapter
      - getStatus(): Determine product status
      - getInventory(): Calculate available supply
      
      Allowlist Features:
      - Merkle proof verification for allowlist
      - Claim code validation
      - Discounted pricing logic
      
      Reference implementations:
      - src/products/blindmint.ts for structure
      - @claim-widgets/src/lib/transactionFlow/steps/mint.tsx for allowlist
    output:
      - src/products/edition.ts with full implementation
      - Integration with existing product patterns
    dependencies: ["edition-type-contracts", "claim-extension-contract"]
    critical_path: true
```

## Stage 4: Client Integration & Factory Updates (30-45 minutes)

```yaml
integration:
  - name: "client-factory-updates"
    agent: "software-engineer"
    duration: "30-45m"
    parallel: false
    input: |
      Update client factory to support Edition products:
      
      1. Add Edition type guard:
         - isEditionInstanceData() checking for Edition AppId
         
      2. Update getProduct() method:
         - Route Edition products to EditionProduct class
         - Handle Edition-specific instance data
         
      3. Update product exports:
         - Export EditionProduct class
         - Update Product union type
         
      Reference: src/client/index.ts lines 26-30 for BlindMint pattern
    output:
      - Updated src/client/index.ts with Edition support
      - Updated src/products/index.ts exports
    dependencies: ["edition-product-class"]
```

## Stage 5: Testing Implementation (45-60 minutes)

```yaml
testing:
  - name: "edition-unit-tests"
    agent: "qa-engineer"
    duration: "45-60m"
    parallel: false
    input: |
      Create comprehensive test suite for Edition product:
      
      Test Coverage:
      - EditionProduct class initialization
      - fetchOnchainData() with mocked contracts
      - getAllocations() with various scenarios
      - preparePurchase() validation logic
      - Allowlist verification with merkle proofs
      - Cost calculations with platform fees
      - Status determination logic
      - Error scenarios and edge cases
      
      Reference: tests/products/blindmint.test.ts for test patterns
    output:
      - tests/products/edition.test.ts
      - Mock data fixtures for Edition products
      - Coverage report showing >80% coverage
    dependencies: ["edition-product-class", "client-factory-updates"]
```

## Stage 6: Documentation & Examples (30-45 minutes)

```yaml
documentation:
  - name: "documentation-updates"
    agent: "software-engineer"
    duration: "30-45m"
    parallel: true
    input: |
      Update documentation for Edition product:
      
      1. API Reference updates:
         - Update README.md with Edition examples
         - Create docs for new Edition methods
         
      2. Release Notes:
         - Update docs/sdk/release-notes.md
         - Follow existing format (date + version)
         
      3. Example Updates:
         - Update playground with Edition example
         - Add Edition to example apps
         
      4. Type Documentation:
         - Document all new types in reference docs
    output:
      - Updated README.md
      - Updated docs/sdk/release-notes.md
      - New/updated reference documentation
      - Example code updates
    dependencies: ["edition-product-class"]
```

## 🚦 Critical Checkpoints

### Foundation Checkpoint (After Stage 1)
```yaml
checkpoint: "Types & ABIs Complete"
validation:
  - All Edition types compile without errors
  - ABI matches expected contract interface
  - Types exported correctly from index files
  - No circular dependencies
```

### Contract Checkpoint (After Stage 2)
```yaml
checkpoint: "Contract Layer Functional"
validation:
  - ClaimExtension contract can be instantiated
  - getClaim() returns expected data structure
  - Gas estimation works correctly
  - All extension address types handled
```

### Integration Checkpoint (After Stage 4)
```yaml
checkpoint: "End-to-End Flow Works"
validation:
  - client.getProduct() returns EditionProduct for Edition instances
  - Full purchase flow executes without errors
  - Allowlist verification works
  - All product methods accessible
```

### Quality Checkpoint (After Stage 5)
```yaml
checkpoint: "Tests Passing"
validation:
  - All unit tests pass
  - Coverage > 80%
  - No TypeScript errors
  - Lint checks pass
```

## 🎯 Execution Summary

### Total Duration: 4-5 hours

### Parallel Opportunities:
- Stage 1: Type contracts and ABI can be done in parallel
- Stage 6: Documentation can start once core implementation is done

### Critical Path:
1. Type Contracts → Contract Layer → Product Class → Client Integration → Testing

### Risk Mitigation:
- **Allowlist Complexity**: Reference existing implementation in claim-widgets
- **Contract Variations**: Handle all 4 extension address types
- **Gas Estimation**: Use proven patterns from BlindMint

### Success Criteria:
- ✅ Edition products load and display correctly
- ✅ Purchase flow works end-to-end
- ✅ Allowlist/claim codes function properly
- ✅ All tests pass with >80% coverage
- ✅ TypeScript strict mode compliant
- ✅ Documentation complete

## 🔗 Command Sequence

```bash
# Recommended execution order
/orchestrate CON-2792  # Start with Stage 1 agents in parallel
# After Stage 1 complete:
/orchestrate CON-2792 --stage 2  # Contract layer
# Continue through stages...
/verify CON-2792  # Run verification agent after Stage 3
/qa CON-2792      # Run QA after implementation complete
```

## 📊 Dependencies Visualization

```
Stage 1: [Type Contracts] + [ClaimExtension ABI]
           ↓                    ↓
Stage 2: [Contract Layer Implementation]
           ↓
Stage 3: [Edition Product Class]
           ↓
Stage 4: [Client Factory Updates]
           ↓
Stage 5: [Testing Suite]
           ↓
Stage 6: [Documentation]
```

## 🔍 Key Integration Points from Discovery

1. **Contract Factory Pattern**: Extend existing factory in `src/utils/contract-factory.ts`
2. **Product Routing**: Follow BlindMint pattern in `src/client/index.ts`
3. **Type Exports**: Maintain consistency with `src/types/index.ts`
4. **Test Structure**: Mirror `tests/products/blindmint.test.ts`
5. **Error Handling**: Use existing `ClientSDKError` patterns

## 📝 Implementation Details by Agent

### Agent Task Details

#### Type Contract Agent
**Input Context**: Existing EditionPublicData interface, BlindMint type patterns
**Key Files**: src/types/product.ts (reference), src/types/blindmint.ts (pattern)
**Critical Output**: EditionOnchainData must include merkleRoot for allowlist

#### Backend Engineer (Contract Layer)
**Input Context**: ClaimExtension ABI, existing contract factory patterns
**Key Files**: src/utils/contract-factory.ts, src/abis/ClaimExtensionABI.ts
**Critical Output**: Handle 4 extension address types from publicData

#### Backend Engineer (Product Class)
**Input Context**: BlindMintProduct implementation, allowlist logic from claim-widgets
**Key Files**: src/products/blindmint.ts (pattern), Edition types
**Critical Output**: Merkle proof integration with preparePurchase()

#### Software Engineer (Client Integration)
**Input Context**: Existing BlindMint routing in client factory
**Key Files**: src/client/index.ts (lines 26-30), src/types/common.ts (AppId)
**Critical Output**: isEditionInstanceData() type guard

#### QA Engineer
**Input Context**: BlindMint test suite, Edition product implementation
**Key Files**: tests/products/blindmint.test.ts (pattern)
**Critical Output**: Test allowlist scenarios with mock merkle proofs

## 🚀 Quick Start Commands

```bash
# Stage 1: Create foundation files
touch src/types/edition.ts
touch src/abis/ClaimExtensionABI.ts

# Stage 2: Update contract factory
# Edit: src/utils/contract-factory.ts

# Stage 3: Create product class
touch src/products/edition.ts

# Stage 4: Update client
# Edit: src/client/index.ts

# Stage 5: Create tests
touch tests/products/edition.test.ts

# Validate each stage
npm run typecheck
npm run lint
npm test
```