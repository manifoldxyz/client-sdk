# Implementation Specification: CON-2729 BlindMint V1

## Executive Summary

Fix and complete the existing BlindMint (gacha-style NFT minting) implementation in the Manifold Client SDK. The architecture is sound but the implementation has critical issues preventing compilation and deployment. This specification outlines the complete fix, refactoring to clean architecture, and production deployment preparation.

**CRITICAL UPDATE**: Analysis of gachapon-widgets reveals the actual contract interface uses `mintReserve` with platform fees retrieved from the contract's MINT_FEE() function for compatibility.

## Validated Assumptions

- **Direction**: Fixing existing implementation (not rebuild)
- **Architecture**: Preserve dual-provider pattern (primary wallet + bridge RPC) as used in gachapon-widgets
- **Processing**: Asynchronous with multi-step transactions
- **Phase**: Enhancement/Fix of existing broken implementation
- **Backward Compatibility**: Not required (breaking changes acceptable)
- **Contract Integration**: Use same contract interface as gachapon-widgets (mintReserve)
- **Fee Structure**: Platform fee retrieved from contract's MINT_FEE() function
- **Gas Buffer**: 30% buffer (per PERCENTAGE_GAS_BUFFER in gachapon-widgets)
- **NOT Building**:
  - Cross-chain bridging
  - Delayed reveal functionality
  - Custom probability algorithms
  - Polygon network support (despite being in gachapon-widgets)
  - Monitoring/telemetry systems

## Critical Implementation Notes

### 🚨 MUST-FOLLOW Patterns

1. **Provider Usage Pattern** (CRITICAL):
   - **READ operations**: Use RPC provider from `createClient` config, fallback to bridge provider
   - **WRITE operations**: ALWAYS use `AccountProvider` passed in method params (purchase, execute)
   - Never use bridge provider for write operations
   - Example:

     ```typescript
     // READ: Use RPC/bridge
     const provider = this.rpcProvider || this.bridgeProvider;
     const data = await contract.getClaim(...);

     // WRITE: Use AccountProvider from params
     async purchase(params: PurchaseParams) {
       const tx = await contract.connect(params.account).mintReserve(...);
     }
     ```

2. **Contract Methods** (from gachapon-widgets):
   - Use `getClaim(creatorContract, claimIndex)` for onchain data
   - Use `getTotalMints(wallet, creatorContract, claimIndex)` for wallet count
   - Use `mintReserve()` for ALL minting (both ETH and ERC20)

3. **Transaction Flow**:
   - ALWAYS execute steps sequentially, not in parallel
   - For ERC20: Check approval → Add approval step if needed → Mint
   - Include platform fee from contract's MINT_FEE() function
   - Write operations (purchase, execute) MUST use primary provider (wallet)

4. **Provider Management**:
   - Primary provider = user's wallet (for WRITE operations only)
   - Bridge provider = RPC (for READ operations only)
   - Bridge CANNOT be used for purchase() or step.execute()
   - Timeout: 1500ms for read operations

5. **Data Caching**:
   - Cache onchain data indefinitely (only refresh with force=true)
   - Cache Studio Apps data indefinitely (static)
   - Token variations count comes from onchain gachaData.tokenVariations

6. **Error Codes** (use standard ClientSDKError codes):
   - `INVALID_INPUT` - Invalid address, quantity, or parameters
   - `NOT_ELIGIBLE` - Wallet not eligible to purchase
   - `LIMIT_REACHED` - Wallet purchase limit exceeded
   - `SOLD_OUT` - Product sold out
   - `NOT_STARTED` / `ENDED` - Outside sale window
   - `INSUFFICIENT_FUNDS` - Not enough ETH/tokens
   - `TRANSACTION_FAILED` - Smart contract revert
   - `ESTIMATION_FAILED` - Gas estimation failed

## Requirements

### Functional Requirements

1. **BlindMint Product Implementation**
   - Gacha-style random NFT minting with tier probabilities
   - Support Common, Rare, Legendary tiers
   - Immediate reveal after minting
   - Query wallet minted count from contract

2. **Payment Support**
   - Native ETH payments
   - ERC20 token payments with approval flow (if erc20 field is set)
   - Check existing approval before requesting new one
   - Platform fee: Retrieved from contract's MINT_FEE() function
   - No merkle mint functionality currently supported

3. **Network Support**
   - Ethereum Mainnet (1)
   - Base (8453)
   - Optimism (10)
   - Shape (360)
   - Sepolia Testnet (11155111)
   - Extension contract addresses:
     - V1: 0x53c37ccc1c48f63bd35ffc93952d0880d7529b9e
     - V2: 0x40ae3553a2dbbe463f84da97bda5607cfd03b40d

4. **Transaction Management**
   - Multi-step transactions for ERC20 (approval + mint)
   - Configurable gas buffer (default 30% to align with gachapon-widgets)
   - Gas estimation with race condition handling (1500ms timeout)
   - Fallback to bridge provider for gas estimation if primary fails
   - No rollback strategy required

5. **Data Integration**
   - Studio Apps Client for instance data (required)
   - Wallet minted count from contract
   - Onchain data cached indefinitely unless force=true

### Non-Functional Requirements

1. **Performance**
   - Provider failover: <2 seconds
   - API response time: <2 seconds
   - Dual-provider timeout: 1500ms before failover

2. **Code Quality**
   - Clean architecture with initialization strategies
   - Constructor refactored to <50 lines
   - Comprehensive new test suite
   - TypeScript strict mode compliance

3. **Production Readiness**
   - Production configuration included
   - NPM registry deployment ready
   - No monitoring/telemetry required
   - Security vulnerabilities resolved

## Technical Architecture

### System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client App    │────▶│  Manifold SDK    │────▶│   Blockchain    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           │
                        ┌──────────────────┐              │
                        │  Studio Apps     │              │
                        │     Client       │              │
                        └──────────────────┘              │
                               │                           │
                               ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  Manifold API    │     │  Smart Contract │
                        └──────────────────┘     └─────────────────┘
```

### Components

#### 1. BlindMintProduct Class (Matching Docs Interface)

**Current Issue**: 140+ line constructor
**Solution**: Simple extraction to private methods matching documented API

```typescript
// Product interface from official SDK documentation
interface Product {
  // Required properties
  id: string; // Instance ID
  type: AppType; // 'blind-mint' for this product
  data: InstanceData; // Product offchain data
  previewData: PreviewData; // Preview data of the product

  // Optional onchain data (populated by fetchOnchainData)
  onchainData?: BlindMintOnchainData;

  // Required methods (from official docs)
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BlindMintOnchainData>;

  // Additional methods used in SDK examples
  getStatus(): Promise<ProductStatus>; // Check product availability/status
  getMetadata(): Promise<ProductMetadata>; // Get name and description
  getPreviewMedia(): Promise<Media>; // Get image/animation URLs
}

// BlindMintOnchainData from official SDK documentation
interface BlindMintOnchainData {
  totalSupply: number; // Total supply of the product
  totalMinted: number; // Total tokens minted
  walletMax: number; // Max tokens per wallet
  startDate: Date; // Start drop date
  endDate: Date; // End drop date
  audienceType: 'None' | 'Allowlist' | 'RedemptionCode';
  cost: Money; // Cost of the product
  paymentReceiver: string; // Receiver of mint payment
  tokenVariations: number; // Number from gachaData.tokenVariations
  startingTokenId: number; // Starting tokenId of the asset pool
}

// Simplified BlindMintProduct matching docs interface
export class BlindMintProduct implements Product {
  // Required properties from Product interface
  id: string;
  type: AppType = AppType.BlindMint;
  data: InstanceData;
  previewData: PreviewData;
  onchainData?: BlindMintOnchainData;

  // Internal properties
  private contract?: ethers.Contract;
  private rpcProvider?: Provider;
  private bridgeProvider?: Provider;
  private studioClient?: StudioAppsClient;

  constructor(
    instanceData: BlindMintInstanceData,
    config: SDKConfig,
    previewData?: PreviewData, // Fetched from Studio Apps API via client.getProduct()
  ) {
    // Simple initialization matching docs structure
    this.id = instanceData.id;

    // Use provided previewData if available (from Studio Apps API)
    this.previewData = previewData || {
      title: instanceData.publicData.title,
      description: instanceData.publicData.description,
      thumbnail: instanceData.publicData.asset?.image,
      // ... other preview fields
    };

    this.data = {
      id: instanceData.id,
      creator: instanceData.creator,
      publicData: instanceData.publicData,
      appId: instanceData.appId || 3,
      appName: instanceData.appName || 'BlindMint',
    };

    // Initialize preview data from public data
    this.previewData = this._extractPreviewData(instanceData.publicData);

    // Setup internal services
    this._setupProviders(config);
    this._setupContracts(instanceData);
    this._setupStudioClient(config);

    // Optionally fetch onchain data
    if (config.includeOnchainData !== false) {
      this.fetchOnchainData().catch((err) => console.warn('Onchain data fetch failed:', err));
    }
  }

  // Private setup methods
  private _extractPreviewData(publicData: BlindMintPublicData): PreviewData {
    return {
      title: publicData.title,
      description: publicData.description,
      contract: publicData.contract,
      thumbnail: publicData.asset?.media?.image,
      network: publicData.network,
      startDate: undefined, // Will be populated from onchain
      endDate: undefined, // Will be populated from onchain
      price: undefined, // Will be populated from onchain
    };
  }

  private _setupProviders(config: SDKConfig) {
    const networkId = this.data.publicData.network;
    // Setup providers for read/write separation:
    // - READ operations: Use RPC provider from config or fallback to bridge
    // - WRITE operations: Use AccountProvider passed in method params
    this.rpcProvider = config.providers[networkId]; // For reads
    this.bridgeProvider = createBridgeProvider(networkId); // Fallback for reads
  }

  private _setupContracts(instanceData: BlindMintInstanceData) {
    const provider = this.rpcProvider || this.bridgeProvider;
    if (!provider) return;

    const extensionAddress = instanceData.publicData.extensionAddress;
    // Read-only contract instance for queries
    this.contract = new ethers.Contract(
      extensionAddress,
      GachaExtensionERC1155ABIv1,
      provider, // Use read provider
    );
  }

  private _setupStudioClient(config: SDKConfig) {
    this.studioClient = createStudioAppsClient({
      baseUrl: config.api.studioAppsUrl,
    });
  }

  // Implement all required Product methods...
  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    // Implementation matching docs
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    // Implementation matching docs
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    // Implementation matching docs
  }

  async fetchOnchainData(): Promise<BlindMintOnchainData> {
    // Fetch and populate this.onchainData
  }
}
```

#### 2. Provider System

**Separated Architecture**: Read providers + Write providers

```typescript
// Provider usage pattern:
class BlindMintProduct {
  private rpcProvider: Provider;     // From createClient config (READ operations)
  private bridgeProvider: Provider;  // Fallback for reads (READ operations)

  // READ operations: Use RPC from config, fallback to bridge
  async fetchOnchainData(): Promise<Data> {
    const provider = this.rpcProvider || this.bridgeProvider;
    return contract.connect(provider).getClaim(...);
  }

  // WRITE operations: Use AccountProvider from method params
  async purchase(params: { account: AccountProvider }): Promise<Order> {
    // AccountProvider passed in params for transaction signing
    return contract.connect(params.account).mintReserve(...);
  }
}
```

#### 3. Studio Apps Integration

**Required**: Fetch instance data and previews

```typescript
interface StudioAppsService {
  getInstanceData(instanceId: string): Promise<InstanceData>;
  getPreview(instanceId: string): Promise<PreviewData>;
}
```

#### 4. Contract Integration

**Using Existing ABIs**: GachaExtensionERC1155ABIv1/v2

```typescript
interface ContractService {
  getMintedCount(walletAddress: Address): Promise<number>;
  estimateGas(params: MintParams): Promise<bigint>;
  mint(params: MintParams): Promise<TransactionReceipt>;
  approveERC20(token: Address, amount: bigint): Promise<TransactionReceipt>;
  checkApproval(token: Address, owner: Address): Promise<bigint>;
}
```

### Data Models

```typescript
// Core BlindMint Types (aligned with gachapon-widgets)
interface BlindMintInstanceData {
  instanceId: string;
  publicData: BlindMintPublicData;
  extensionAddress: Address; // Extension contract address
  creatorContract: Address; // Creator contract address
  claimIndex: number; // Index for this specific claim
  networkId: NetworkId;
}

interface OnChainGachaData {
  /** storage protocol for the asset variations */
  storageProtocol: StorageProtocol;
  /** hash post storage protocol prefix for the location */
  location: string;
  /** payout address for proceeds */
  paymentReceiver: string;
  /** total minted number of tokens */
  total: number;
  /** first token id for the tokens minted */
  startingTokenId: BigNumber;
  /** number of token variations in the collection */
  tokenVariations: number;
  /** maximum total supply, or 0 if no maximum */
  totalMax: number;
  /** start date timestamp in seconds, or 0 if immediate */
  startDate: number;
  /** end date timestamp in seconds, or 0 if never */
  endDate: number;
  /** price to mint a token */
  cost: BigNumber;
  /** address for the erc20 for the price */
  erc20: string;
}

interface Gachapon {
  total: number;
  totalMax: number | null;
  walletMax: number | null;
  startDate: Date | null;
  endDate: Date | null;
  storageProtocol: StorageProtocol;
  merkleRoot: string | null; // Not currently supported
  tokenVariations: number | null;
  startingTokenId: BigNumber;
  location: string;
  cost: BigNumber;
}

enum StorageProtocol {
  INVALID,
  NONE,
  ARWEAVE,
  IPFS,
}

interface PreparedPurchase {
  cost: Cost;
  steps: TransactionStep[];
  isEligible: boolean;
  gasBuffer: number; // Default 30% per PERCENTAGE_GAS_BUFFER
}

interface Order {
  receipts: Receipt[]; // Array of transaction receipts
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  buyer: Identity; // Buyer identity with wallet address
  total: Cost; // Total cost including fees
  items?: OrderItem[]; // Purchased items (tokens minted)
}

interface Receipt {
  networkId: number;
  txHash: string;
  step: TransactionStep; // Corresponding step from preparePurchase
  txReceipt?: TransactionReceipt; // Ethers transaction receipt
}

interface Cost {
  total: Money; // Total cost including all fees
  subtotal: Money; // Cost excluding fees
  fees: Money; // Platform fees
}
```

### Method Implementation Tips

#### preparePurchase Implementation

```typescript
async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
  // 1. ALWAYS validate wallet address first
  if (!validateAddress(params.address)) {
    throw new ClientSDKError(
      ClientSDKErrorCode.INVALID_INPUT,
      'Invalid wallet address',
      { field: 'address', value: params.address }
    );
  }

  // 2. Extract and validate quantity (default to 1)
  const quantity = (params.payload as { quantity?: number })?.quantity ?? 1;
  if (quantity <= 0) {
    throw new ClientSDKError(
      ClientSDKErrorCode.INVALID_INPUT,
      'Invalid quantity',
      { field: 'quantity', value: quantity }
    );
  }

  // 3. Check allocations BEFORE calculating costs
  const allocations = await this.getAllocations({ recipientAddress: params.address });
  if (!allocations.isEligible) {
    throw new ClientSDKError(
      ClientSDKErrorCode.NOT_ELIGIBLE,
      allocations.reason || 'Wallet not eligible to purchase',
      { data: allocations }
    );
  }

  // 4. Build transaction steps array
  const steps: TransactionStep[] = [];

  // 5. For ERC20: Add approval step FIRST if needed
  if (isERC20) {
    const currentAllowance = await this.checkApproval(...);
    if (currentAllowance < totalCost) {
      steps.push({
        type: 'approval',
        execute: () => this.approveERC20(...)
      });
    }
  }

  // 6. Add mint step with gas estimation
  const gasEstimate = await this.estimateGas(...);
  const gasWithBuffer = gasEstimate * BigInt(130) / BigInt(100); // 30% buffer

  steps.push({
    type: 'mint',
    execute: () => this.mint(...)
  });

  // 7. Calculate total cost including platform fee from contract
  const mintFee = await this.contract.MINT_FEE(); // Get fee from contract
  const platformFee = BigInt(quantity) * mintFee;
  const totalCost = mintCost + platformFee;

  return { cost: totalCost, steps, isEligible: true, gasBuffer: 0.3 };
}
```

#### purchase Implementation

```typescript
async purchase(params: PurchaseParams): Promise<Order> {
  // 1. Execute steps sequentially using AccountProvider from params
  const receipts: Receipt[] = [];
  const startTime = new Date();

  for (const step of params.preparedPurchase.steps) {
    try {
      // IMPORTANT: Write operations MUST use AccountProvider passed in params
      // This is the user's wallet provider for transaction signing
      const receipt = await step.execute(params.account);
      receipts.push(receipt);
    } catch (error) {
      // No provider switching for writes - must use AccountProvider
      throw error;
    }
  }

  // 3. Return Order matching SDK documentation interface
  const order: Order = {
    receipts,  // Array of Receipt objects with txHash, networkId, step
    status: receipts.length > 0 ? 'completed' : 'failed',
    buyer: {
      walletAddress: params.account.address,
      // other identity fields if available
    },
    total: params.preparedPurchase.cost,  // Cost object with total, subtotal, fees
    items: [] // OrderItem[] - populated after successful mint
  };

  return order;
}
```

#### getAllocations Implementation

```typescript
async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
  // 1. Validate address format
  if (!validateAddress(params.recipientAddress)) {
    throw new ClientSDKError(
      ClientSDKErrorCode.INVALID_INPUT,
      'Invalid recipient address',
      { field: 'recipientAddress', value: params.recipientAddress }
    );
  }

  // 2. Fetch onchain data first (caches automatically)
  const onchainData = await this.fetchOnchainData();

  // 3. Query wallet minted count from contract using getTotalMints
  const mintedCount = await this.contract.getTotalMints(
    params.recipientAddress,
    this.creatorContract,
    this.claimIndex
  );

  // 4. Calculate eligibility (0 walletMax = unlimited)
  const isEligible = onchainData.walletMax === 0 ||
                     mintedCount < onchainData.walletMax;

  const remaining = onchainData.walletMax === 0
    ? Number.MAX_SAFE_INTEGER
    : onchainData.walletMax - mintedCount;

  return {
    isEligible,
    quantity: Math.min(remaining, onchainData.totalSupply - onchainData.totalMinted),
    reason: !isEligible ? 'Wallet limit reached' : undefined
  };
}
```

#### fetchOnchainData Implementation

```typescript
async fetchOnchainData(force: boolean = false): Promise<BlindMintOnchainData> {
  // 1. Always use cache unless force=true is passed
  if (this.onchainData && !force) {
    return this.onchainData;
  }

  // 2. Fetch from contract using getClaim (uses bridge provider for reads)
  // This returns all onchain data including tokenVariations count
  const gachaData = await this.contract.getClaim(
    this.creatorContract,
    this.claimIndex
  );

  // 3. Transform contract data to SDK format
  this.onchainData = {
    totalSupply: gachaData.totalMax || Number.MAX_SAFE_INTEGER,
    totalMinted: gachaData.total,
    walletMax: gachaData.walletMax || 0,
    startDate: new Date(gachaData.startDate * 1000),
    endDate: gachaData.endDate ? new Date(gachaData.endDate * 1000) : null,
    audienceType: 'None', // Merkle/allowlist not currently supported
    cost: {
      amount: gachaData.cost.toString(),
      currency: gachaData.erc20 === ZERO_ADDRESS ? 'ETH' : 'ERC20',
      tokenAddress: gachaData.erc20
    },
    paymentReceiver: gachaData.paymentReceiver,
    tokenVariations: gachaData.tokenVariations, // From onchain gachaData
    startingTokenId: gachaData.startingTokenId.toNumber()
  };

  // 5. Cache indefinitely (only refreshed when force=true)
  this.cacheTimestamp = Date.now();

  return this.onchainData;
}
```

#### getInventory Implementation

```typescript
async getInventory(): Promise<ProductInventory> {
  // Simple - just fetch onchain data and return supply info
  const onchainData = await this.fetchOnchainData();

  return {
    totalSupply: onchainData.totalSupply,
    totalPurchased: onchainData.totalMinted,
  };
}
```

#### getRules Implementation

```typescript
async getRules(): Promise<ProductRule> {
  const onchainData = await this.fetchOnchainData();

  return {
    startDate: onchainData.startDate,
    endDate: onchainData.endDate,
    audienceRestriction: 'none', // BlindMint typically doesn't use allowlists
    maxPerWallet: onchainData.walletMax || undefined,
  };
}
```

#### getProvenance Implementation

```typescript
async getProvenance(): Promise<ProductProvenance> {
  const onchainData = await this.fetchOnchainData();

  return {
    creator: this.data.creator,
    contract: this.data.publicData.contract,
    token: onchainData.startingTokenId.toString(),
    networkId: this.data.publicData.network,
  };
}
```

#### getStatus Implementation

```typescript
async getStatus(): Promise<ProductStatus> {
  const now = Date.now();
  const onchainData = await this.fetchOnchainData();

  // Check time windows first
  if (onchainData.startDate && now < onchainData.startDate.getTime()) {
    return 'upcoming';
  }
  if (onchainData.endDate && now > onchainData.endDate.getTime()) {
    return 'ended';
  }

  // Check supply
  if (onchainData.totalMinted >= onchainData.totalSupply) {
    return 'sold_out';
  }

  return 'active';
}
```

#### getMetadata & getPreviewMedia Implementation

```typescript
async getMetadata(): Promise<ProductMetadata> {
  // Pull from public data
  return {
    name: this.data.publicData.title,
    description: this.data.publicData.description
  };
}

async getPreviewMedia(): Promise<Media> {
  // Pull from asset in public data
  const asset = this.data.publicData.asset;
  return {
    image: asset?.image,
    imagePreview: asset?.imagePreview,
    animation: asset?.animation,
    animationPreview: asset?.animationPreview
  };
}
```

#### Key Implementation Patterns

1. **Error Handling**: Always validate inputs first, throw ClientSDKError with proper codes
2. **Dual Provider**: Try primary first, fallback to bridge on timeout/failure
3. **Gas Estimation**: Always add 30% buffer to gas estimates
4. **Caching**: Cache onchain data for 5 minutes to reduce RPC calls
5. **Platform Fee**: Include fee from contract's MINT_FEE() in cost calculations
6. **ERC20 Flow**: Check approval first, add approval step if needed
7. **Sequential Execution**: Execute transaction steps one by one, not in parallel
8. **Address Validation**: Use ethers.utils.isAddress for validation
9. **Status Checks**: Check time windows before supply when determining status
10. **Data Sources**: Use publicData for metadata, onchainData for blockchain state

### API Specifications

#### Studio Apps Client Endpoints

```typescript
// Get instance data
GET /api/instances/:instanceId
Response: InstanceData

// Get preview data
GET /api/instances/:instanceId/preview
Response: PreviewData
```

#### Blockchain Methods (from gachapon-widgets)

```typescript
// Main contract calls
contract.MINT_FEE(): Promise<BigNumber>  // Get platform fee
contract.getClaim(creatorContract: string, claimIndex: number): Promise<OnChainGachaData>  // Returns tokenVariations field
contract.getTotalMints(wallet: string, creatorContract: string, claimIndex: number): Promise<number>
contract.checkMintIndices(creatorContract: string, claimIndex: number, indices: number[]): Promise<boolean[]>

// Minting method (mintReserve is sufficient for all cases)
contract.mintReserve(
  creatorContract: string,
  claimIndex: number,
  mintCount: number,
  mintIndices: number[],
  merkleProofs: bytes32[][], // Empty array - not currently supported
  mintForAddress?: string,  // Optional for delegated mints
  { value: BigNumber, gasLimit: BigNumber }
): Promise<TransactionResponse>

// Gas estimation with 30% buffer
contract.estimateGas.mintReserve(...args): Promise<BigNumber>
```

## User Flows

### 1. Complete Purchase Flow (ETH)

```
User → getProduct(instanceId)
     → preparePurchase(address, quantity)
       - Fetch instance data from Studio Apps
       - Query wallet minted from contract
       - Calculate eligibility
       - Estimate gas with configurable buffer
       - Calculate total cost (price + MINT_FEE from contract)
     → purchase(account, preparedPurchase)
       - Execute mint transaction
       - Wait for confirmation
       - Return transaction receipt
```

### 2. Complete Purchase Flow (ERC20)

```
User → preparePurchase(address, quantity)
       - Check existing ERC20 approval
       - If insufficient, add approval step
       - Add mint step
     → purchase(account, preparedPurchase)
       - Execute approval (if needed)
       - Execute mint transaction
       - Return combined receipts
```

## Integration Points

### External Systems

1. **Studio Apps Client** (Required)
   - Instance data fetching
   - Preview data enhancement

2. **Blockchain Networks**
   - Ethereum, Base, Optimism, Shape, Sepolia
   - Via dual-provider architecture
   - Contract address from publicData

3. **Smart Contracts**
   - GachaExtension contracts (v1 and v2)
   - ERC20 token contracts for payments
   - Using existing ABIs in src/abis/

## Error Handling

### Error Codes Mapping (From SDK Documentation)

All BlindMint errors should map to the standard SDK error codes:

```typescript
enum ClientSDKErrorCode {
  // Network Errors
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',  // Network not supported
  WRONG_NETWORK = 'WRONG_NETWORK',              // Wrong network, need to switch
  
  // Data Errors  
  NOT_FOUND = 'NOT_FOUND',                      // Product/resource not found
  INVALID_INPUT = 'INVALID_INPUT',              // Invalid parameters
  MISSING_TOKENS = 'MISSING_TOKENS',            // Missing required tokens for burn/redeem
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',        // Product type not supported
  
  // Blockchain Errors
  ESTIMATION_FAILED = 'ESTIMATION_FAILED',      // Gas estimation failed
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',    // Transaction failed
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED', // Transaction reverted
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED', // User rejected transaction
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',    // Insufficient wallet funds
  LEDGER_ERROR = 'LEDGER_ERROR',               // Ledger wallet error (blind signing)
  
  // Permission/Eligibility Errors
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',               // Not eligible to purchase
  SOLD_OUT = 'SOLD_OUT',                       // Product sold out
  LIMIT_REACHED = 'LIMIT_REACHED',             // Wallet limit reached
  ENDED = 'ENDED',                             // Product ended
  NOT_STARTED = 'NOT_STARTED',                 // Product not started yet
}
```

### Error Implementation Pattern

```typescript
import { ClientSDKError } from '@manifoldxyz/client-sdk';

// Throw errors with proper code and context
throw new ClientSDKError(
  ClientSDKErrorCode.NOT_ELIGIBLE,
  'Wallet not eligible to purchase product',
  { 
    reason: 'Not on allowlist',
    walletAddress: params.address,
    data: eligibility // Include Eligibility object as per SDK docs
  }
);

// For transaction errors, include receipts for completed steps
throw new ClientSDKError(
  ClientSDKErrorCode.TRANSACTION_FAILED,
  'Transaction failed during mint step',
  {
    data: error, // CallException from ethers
    metadata: { 
      receipts: completedReceipts // Receipt[] for completed steps
    }
  }
);
```

### Error Handling by Method

#### preparePurchase Errors
- `INVALID_INPUT` - Invalid address, quantity, or payload parameters
- `UNSUPPORTED_NETWORK` - Network ID not supported
- `WRONG_NETWORK` - User on wrong network (if not using relayer)
- `NOT_ELIGIBLE` - Wallet not eligible (include Eligibility data)
- `SOLD_OUT` - Product sold out
- `LIMIT_REACHED` - Wallet purchase limit reached
- `ENDED` - Product sale ended
- `NOT_STARTED` - Product sale not started
- `MISSING_TOKENS` - Missing burn tokens (burn/redeem only)
- `ESTIMATION_FAILED` - Gas estimation failed (include CallException)

#### purchase Errors
- `TRANSACTION_FAILED` - Transaction failed (include CallException + receipts)
- `TRANSACTION_REVERTED` - Transaction reverted (include CallException + receipts)
- `TRANSACTION_REJECTED` - User rejected (include receipts for completed)
- `INSUFFICIENT_FUNDS` - Insufficient funds (include receipts for completed)
- `LEDGER_ERROR` - Ledger blind signing error (include receipts)

#### getAllocations Errors
- `INVALID_INPUT` - Invalid recipient address

#### getProduct Errors
- `NOT_FOUND` - Product not found
- `UNSUPPORTED_TYPE` - Product type not supported (not blind-mint)

## Security Considerations

### Authentication & Authorization

- No authentication required for SDK
- Wallet signature for blockchain transactions
- Contract-level permission checks

### Data Protection

- No sensitive data stored locally
- Private keys handled by wallet provider
- Transaction data validated on-chain

### Vulnerability Mitigation

- Update npm dependencies (10 high/critical)
- Sanitize user inputs
- Validate addresses and amounts
- Safe BigInt arithmetic

## Testing Strategy

### New Test Suite Structure

```
tests/
├── unit/
│   ├── blindmint-product.test.ts
│   ├── initialization-strategy.test.ts
│   ├── dual-provider.test.ts
│   └── contract-service.test.ts
├── integration/
│   ├── studio-apps.test.ts
│   ├── transaction-flow.test.ts
│   └── provider-failover.test.ts
└── e2e/
    └── sepolia-blindmint.test.ts
```

### Testing Approach

- **Unit Tests**: Mock all external dependencies
- **Integration Tests**: Test component interactions
- **E2E Tests**: Sepolia testnet with real contracts
- **Coverage Target**: >90% for public APIs

## Configuration

### Production Configuration

```typescript
export const PRODUCTION_CONFIG: SDKConfig = {
  api: {
    studioAppsUrl: process.env.STUDIO_APPS_URL || 'https://apps.api.manifoldxyz.dev',
    timeout: 2000,
    retries: 3,
  },
  providers: {
    ethereum: process.env.ETH_RPC_URL,
    base: process.env.BASE_RPC_URL,
    optimism: process.env.OPTIMISM_RPC_URL,
    shape: process.env.SHAPE_RPC_URL,
    sepolia: process.env.SEPOLIA_RPC_URL,
  },
  dualProvider: {
    primaryTimeout: 1500,
    fallbackToBridge: true,
  },
  transaction: {
    gasBuffer: 0.25, // 25% default, configurable
    confirmations: 1,
  },
  fees: {
    platformFeePercentage: 2.5,
  },
};
```

## Deployment Plan

### NPM Registry Deployment

```json
{
  "name": "@manifoldxyz/client-sdk",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### Build & Release Process

1. Fix compilation errors
2. Run new test suite
3. Security audit (`npm audit`)
4. Build distribution (`npm run build`)
5. Publish to NPM (`npm publish`)

## Success Metrics

### Acceptance Criteria

- ✅ Zero TypeScript compilation errors
- ✅ All tests passing (new suite)
- ✅ Zero high/critical security vulnerabilities
- ✅ Successful mint on Sepolia testnet
- ✅ Provider failover working <2 seconds
- ✅ Constructor refactored to <50 lines
- ✅ Production configuration implemented
- ✅ Published to NPM registry

### Performance Benchmarks

- API response time: <2 seconds
- Provider failover: <2 seconds
- Gas estimation accuracy: ±10%
- Transaction confirmation: <30 seconds

## Risk Mitigation

### Technical Risks

1. **ABI Compatibility**
   - Risk: Contract interface mismatch
   - Mitigation: Verify ABIs against deployed contracts

2. **Provider Failures**
   - Risk: RPC endpoint unavailability
   - Mitigation: Dual-provider architecture with failover

3. **Gas Estimation**
   - Risk: Transaction failure due to insufficient gas
   - Mitigation: Configurable buffer (default 25%)

### Business Risks

1. **Platform Fee Changes**
   - Risk: Hardcoded 2.5% becomes outdated
   - Mitigation: Make configurable in production config

2. **Network Congestion**
   - Risk: High gas prices prevent minting
   - Mitigation: Multi-network support for alternatives
