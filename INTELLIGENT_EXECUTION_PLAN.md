# Intelligent Execution Plan - Edition Product Implementation (CON-2792)

## 📊 Plan Overview

- **Total Stages**: 4 stages over 4 weeks
- **Estimated Time**: 20-30 hours of implementation
- **Parallel Opportunities**: Multiple within each stage
- **Critical Path**: Contract ABIs → EditionProduct → Integration Tests
- **Confidence Level**: 95% - Exceptional foundation exists

## 🔍 Discovery-Driven Foundation

### Auto-Discovered Type Contracts (Critical Priority)

Based on dependency analysis, these contracts MUST be built first:

```typescript
// Critical Edition Contract Interface
interface EditionClaimContract {
  // Used by: EditionProduct, ContractFactory, Tests
  getClaim(creator: string, instanceId: number): Promise<ClaimData>;
  mintProxy(
    creator: string,
    instanceId: number,
    count: number,
    indices: number[],
    proofs: string[][],
    mintFor: string
  ): Promise<TransactionResponse>;
  MINT_FEE(): Promise<BigNumber>;
}

// Allowlist Proof Structure
interface AllowlistProof {
  // Used by: EditionProduct, MerkleProofService, API
  merkleRoot: string;
  proof: string[];
  leaf: string;
  maxQuantity?: number;
  price?: Money;
}

// Edition Purchase Context
interface EditionPurchaseContext {
  // Used by: preparePurchase, purchase, transaction steps
  product: EditionProduct;
  purchaser: string;
  recipient: string;
  quantity: number;
  allowlistProof?: AllowlistProof;
  redemptionCode?: string;
  transactionSteps: TransactionStep[];
  totalCost: Cost;
}
```

**Rationale**: These contracts are referenced across multiple components and must be consistent

## 🏗️ Foundation Stage (Week 1: 5-8 hours)

Based on dependency analysis, these components must be built first:

### 1.1 Extract Contract ABIs (Critical - 2 hours)
**Agent**: Manual implementation
**Dependencies**: `@manifoldxyz/claim-contracts`
**Input from Discovery**:
- Auto-discovered EditionClaimContract interface
- mintProxy method signature from reference implementation
- Platform fee methods (MINT_FEE)
**Tasks**:
- Extract ClaimExtensionERC721 and ClaimExtensionERC1155 ABIs
- Create `src/abis/EditionClaimABI.ts`
- Add to ABI index exports
**Provides to Others**: Contract interfaces for EditionProduct, ContractFactory

**Critical**: This unblocks all Edition-specific development

### 1.2 Enhanced Base Abstractions (Parallel - 3 hours)
**Agent**: Manual refactoring
**Input from Discovery**:
- Common patterns identified in BlindMintProduct
- Shared transaction step architecture
- Merkle proof requirements for allowlists
**Tasks**:
- Extract common patterns from BlindMintProduct into BaseProduct abstract class
- Create MerkleProofService for shared proof validation
- Enhance TransactionOrchestrator for multi-step flows
**Provides to Others**: Reusable base classes for EditionProduct

**Benefit**: 80% code reuse for EditionProduct

### 1.3 Contract Factory Extension (Parallel - 1 hour)
**Agent**: Manual implementation
**Dependencies**: Contract ABIs from 1.1
**Input from Discovery**:
- EditionClaimContract interface requirements
- mintProxy method signature
- Gas estimation patterns from BlindMint
**Tasks**:
- Add `createEditionContract()` method to ContractFactory
- Define EditionClaimContract type interface
- Add Edition-specific contract method signatures
**Provides to Others**: Contract creation for EditionProduct

### 1.4 Type Guard Implementation (Parallel - 1 hour)
**Agent**: Manual implementation
**Input from Discovery**:
- AppId.EDITION value (2522713783)
- InstanceData structure for Edition
**Tasks**:
- Create `isEditionInstanceData()` type guard
- Add AppId.EDITION constant if not exists
- Export Edition type guards
**Provides to Others**: Type detection for Client Factory

## 🚀 Implementation Stage (Week 2: 8-10 hours)

Core Edition product functionality:

### 2.1 EditionProduct Class (Sequential - 5 hours)
**Agent**: Manual implementation
**Dependencies**: Foundation Stage complete
**File**: `src/products/edition.ts`

```typescript
export class EditionProduct implements IEditionProduct {
  // Core implementation following BlindMint patterns
  constructor(instanceData, previewData, options)
  async fetchOnchainData(): Promise<EditionOnchainData>
  async preparePurchase(params): Promise<PreparedPurchase>
  async purchase(params): Promise<Order>
  
  // Standard product interface
  async getStatus(): Promise<ProductStatus>
  async getAllocations(params): Promise<AllocationResponse>
  async getInventory(): Promise<ProductInventory>
  async getRules(): Promise<ProductRule>
  async getProvenance(): Promise<ProductProvenance>
}
```

### 2.2 Allowlist Validation Service (Parallel - 2 hours)
**Agent**: Manual implementation
**Tasks**:
- Implement merkle proof generation for allowlists
- Add proof validation logic
- Cache validation results

### 2.3 Cost Calculation Logic (Parallel - 1 hour)
**Agent**: Manual implementation
**Tasks**:
- Implement Edition-specific pricing logic
- Add platform fee calculation
- Handle ERC20 payment paths

### 2.4 Client Factory Integration (Sequential - 1 hour)
**Agent**: Manual implementation
**Dependencies**: EditionProduct complete
**Tasks**:
- Add Edition case to `getProduct()` in `src/client/index.ts`
- Wire up EditionProduct instantiation
- Update type exports

## 🧪 Testing & Validation Stage (Week 3: 5-7 hours)

Comprehensive testing and validation:

### 3.1 Unit Tests (Parallel - 3 hours)
**Agent**: Manual test writing
**File**: `tests/products/edition.test.ts`
**Coverage**:
- Constructor validation
- fetchOnchainData() with mocked responses
- preparePurchase() eligibility scenarios
- purchase() transaction flow
- Error handling cases

### 3.2 Integration Tests (Sequential - 2 hours)
**Agent**: Manual test writing
**Coverage**:
- End-to-end purchase flow
- Multi-network support
- Allowlist validation
- Gas estimation accuracy

### 3.3 Manual Testing (Sequential - 2 hours)
**Agent**: Manual validation
**Tasks**:
- Test with real Edition contracts on testnet
- Validate with different wallet adapters
- Test error scenarios
- Performance benchmarking

## 🎛️ Polish & Documentation Stage (Week 4: 2-5 hours)

Final optimizations and documentation:

### 4.1 Performance Optimization (Parallel - 1 hour)
**Tasks**:
- Implement caching for on-chain data
- Optimize gas estimation
- Add request batching where applicable

### 4.2 Error Message Enhancement (Parallel - 1 hour)
**Tasks**:
- Add Edition-specific error codes if needed
- Improve error messages for common failures
- Add detailed context to errors

### 4.3 Documentation Updates (Sequential - 2 hours)
**Tasks**:
- Update README.md with Edition examples
- Update API documentation in `docs/`
- Add Edition to getting started guide
- Update release notes

### 4.4 Code Review & Cleanup (Sequential - 1 hour)
**Tasks**:
- Remove debug code
- Ensure consistent code style
- Final TypeScript strict mode check
- Security review

## 🧪 Discovery-Enhanced Integration Checkpoints

### Foundation Checkpoint (After Stage 1)
**Tests with Discovered Contracts**:
- ✅ All auto-discovered contracts (EditionClaimContract, AllowlistProof) compile
- ✅ Contract ABIs match discovered interface requirements
- ✅ Base abstractions support discovered patterns from BlindMint
- ✅ Contract factory creates Edition contracts with correct methods
- ✅ No circular dependencies in discovered types

### Implementation Checkpoint (After Stage 2)
**Integration Points Validation**:
- ✅ EditionProduct uses auto-discovered contracts correctly
- ✅ fetchOnchainData matches EditionOnchainData interface
- ✅ preparePurchase handles AllowlistProof structure
- ✅ Client factory routes using discovered AppId.EDITION
- ✅ Cross-service communication uses shared types

### Testing Checkpoint (After Stage 3)
**Dependency Verification**:
- ✅ All discovered integration points tested
- ✅ Merkle proof generation matches contract expectations
- ✅ Manual testing validates discovered purchase flows
- ✅ No regression in BlindMint or existing functionality

### Final Validation Checkpoint (After Stage 4)
**Complete System Verification**:
- ✅ Documentation reflects all discovered contracts
- ✅ Performance meets discovered bottleneck mitigations
- ✅ Security audit covers allowlist vulnerabilities
- ✅ All discovered dependencies properly integrated

## 🎛️ Parallel Execution Matrix

### Stage 1 - Foundation (High Parallelization)
```
Contract ABIs ─────────────────┐
Base Abstractions ─────────────┼─── Stage 1 Complete
Contract Factory Extension ────┤
Type Guards ───────────────────┘
```

### Stage 2 - Implementation (Mixed)
```
EditionProduct Class ─────────┐
   │                          │
   └─> Allowlist Service ─────┼─── Stage 2 Complete
       Cost Calculation ──────┤
       Client Integration ────┘
```

### Stage 3 - Testing (Parallel Start, Sequential End)
```
Unit Tests ─────────┐
                    ├─> Integration Tests ─> Manual Testing
Performance Tests ──┘
```

### Stage 4 - Polish (Fully Parallel)
```
Performance Opt ───┐
Error Enhancement ─┼─── Stage 4 Complete
Documentation ─────┤
Code Review ───────┘
```

## 📈 Success Metrics

### Implementation Quality
- **Type Coverage**: 100% - No `any` types
- **Test Coverage**: >80% for Edition code
- **Documentation**: Complete API docs and examples
- **Performance**: <1s product load, <2s purchase prep

### Architecture Quality
- **Code Reuse**: >70% from existing patterns
- **Consistency**: Identical patterns to BlindMint
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Ready for future product types

### Business Outcomes
- **Feature Complete**: All Edition functionality working
- **Production Ready**: Tested on mainnet contracts
- **Developer Experience**: Simple, intuitive API
- **User Experience**: Fast, reliable purchases

## 🚨 Risk Mitigation Strategies

### Risk 1: Contract ABI Complexity
**Mitigation**: 
- Study claim-widgets implementation first
- Test contract methods in isolation
- Validate against known Edition contracts

### Risk 2: Merkle Proof Issues
**Mitigation**:
- Use established merkle-tree libraries
- Extensive unit testing of proof generation
- Test with actual allowlist data

### Risk 3: Integration Failures
**Mitigation**:
- Incremental integration testing
- Use testnet contracts first
- Maintain rollback capability

## 🎯 Critical Path Analysis

```
Contract ABIs (2h)
     │
     ▼
EditionProduct Core (5h)
     │
     ▼
Client Integration (1h)
     │
     ▼
Integration Tests (2h)
     │
     ▼
Documentation (2h)
─────────────────────
Total Critical Path: 12 hours
```

## 📝 Implementation Notes

### Key Insights from Discovery
1. **BlindMintProduct is the perfect template** - Follow it closely
2. **All types already exist** - No interface design needed
3. **Infrastructure is complete** - Focus only on Edition-specific code
4. **Patterns are proven** - No architectural decisions required

### Development Approach
1. **Start with contract ABIs** - This unblocks everything
2. **Copy BlindMint structure** - Modify for Edition specifics
3. **Test incrementally** - Validate each method as built
4. **Document as you go** - Keep docs in sync

### Quality Guidelines
- **No shortcuts on types** - Full TypeScript strictness
- **Test edge cases** - Especially allowlist scenarios
- **Clear error messages** - Users need to understand failures
- **Performance matters** - Cache where appropriate

## 🔗 Workflow Integration

### Recommended Command Sequence
```bash
# Discovery-driven development workflow
/discover CON-2792    # Auto-discover contracts and dependencies ✅ COMPLETE
/spec CON-2792        # Build specification using discovery intelligence ✅ COMPLETE
/orchestrate CON-2792 # Execute with dependency-aware staging (NEXT STEP)
```

### Contract Discovery Integration

Each implementation task references:
- **Auto-Discovered Contracts**: EditionClaimContract, AllowlistProof, EditionPurchaseContext
- **Integration Points**: Manifold API, RPC providers, Edition contracts
- **Dependency Requirements**: Contract ABIs → EditionProduct → Client Factory
- **Provides to Others**: Type guards → Client routing, MerkleProofService → Purchase flow

## 🏁 Conclusion

This execution plan leverages the exceptional foundation discovered during analysis. With BlindMintProduct as a proven template and all infrastructure ready, Edition implementation is straightforward and low-risk.

**Total Estimated Time**: 20-30 hours
**Recommended Team Size**: 1-2 developers
**Optimal Timeline**: 2-4 weeks (part-time) or 1 week (full-time)

The plan prioritizes de-risking through early validation checkpoints while maximizing parallel execution opportunities. Success is virtually guaranteed given the mature architecture and clear implementation patterns.

## 📝 Key Discovery Insights Applied

1. **BlindMintProduct Template**: Follow structure exactly for consistency
2. **Contract Integration**: mintProxy method signature discovered from reference
3. **Type System Ready**: All Edition types already defined, no interface design needed
4. **Allowlist Complexity**: MerkleProofService addresses discovered requirement
5. **AppId.EDITION**: Value 2522713783 confirmed from discovery analysis