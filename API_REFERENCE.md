# Manifold Client SDK - API Reference

## Table of Contents
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Client API](#client-api)
- [Product APIs](#product-apis)
- [Adapter APIs](#adapter-apis)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Installation

```bash
npm install @manifoldxyz/client-sdk
# or
yarn add @manifoldxyz/client-sdk
# or
pnpm add @manifoldxyz/client-sdk
```

## Core Concepts

### Two-Step Purchase Flow

The SDK uses a two-step process for safety and transparency:

1. **Prepare**: Validate eligibility, calculate costs, generate transaction data
2. **Execute**: Send the transaction(s) to the blockchain

### Network Support

| Network | ID | Status |
|---------|----|----|
| Ethereum | 1 | ✅ Supported |
| Base | 8453 | ✅ Supported |
| Optimism | 10 | ✅ Supported |
| Shape | 360 | ✅ Supported |
| Sepolia | 11155111 | ✅ Testnet |

## Client API

### `createClient(config?)`

Creates a new Manifold SDK client instance.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | `ClientConfig` | No | Configuration object |
| `config.httpRPCs` | `Record<number, string>` | No | RPC URLs by network ID |
| `config.debug` | `boolean` | No | Enable debug logging |

#### Returns

`ManifoldClient` - The configured client instance

#### Example

```typescript
import { createClient } from '@manifoldxyz/client-sdk';

const client = createClient({
  httpRPCs: {
    1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
  },
  debug: true
});
```

### `client.getProduct(instanceIdOrUrl)`

Fetches detailed product information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instanceIdOrUrl` | `string` | Yes | Instance ID or Manifold URL |

#### Returns

`Promise<Product>` - Product object (EditionProduct, BurnRedeemProduct, or BlindMintProduct)

#### Errors

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Invalid URL format or instance ID |
| `NOT_FOUND` | Product not found |
| `UNSUPPORTED_PRODUCT_TYPE` | Product type not supported |

#### Example

```typescript
// Using instance ID
const product = await client.getProduct('4150231280');

// Using full URL
const product = await client.getProduct('https://manifold.xyz/@creator/id/4150231280');
```

### `client.getProductsByWorkspace(workspaceId, options?)`

Fetches products from a specific workspace.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspaceId` | `string` | Yes | Workspace identifier |
| `options` | `WorkspaceProductsOptions` | No | Query options |
| `options.limit` | `number` | No | Results per page (1-100, default: 50) |
| `options.offset` | `number` | No | Pagination offset |
| `options.sort` | `'latest' \| 'oldest'` | No | Sort order |
| `options.networkId` | `number` | No | Filter by network |
| `options.type` | `string` | No | Filter by product type |

#### Example

```typescript
const products = await client.getProductsByWorkspace('workspace123', {
  limit: 10,
  sort: 'latest',
  type: 'edition'
});
```

## Product APIs

### Common Methods

All product types share these methods:

#### `product.preparePurchase(params)`

Prepares a purchase transaction.

##### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.address` | `string` | Yes | Buyer's wallet address |
| `params.recipientAddress` | `string` | No | Different recipient |
| `params.networkId` | `number` | No | Target network |
| `params.payload` | `object` | Varies | Product-specific data |
| `params.gasBuffer` | `GasBuffer` | No | Gas adjustment |

##### Product-Specific Payloads

**Edition**:
```typescript
{
  quantity: number;
  redemptionCode?: string;
}
```

**BurnRedeem**:
```typescript
{
  tokens: Array<{
    contract: {
      networkId: number;
      address: string;
      spec: 'erc721' | 'erc1155';
    };
    tokenId: string;
  }>;
}
```

**BlindMint**:
```typescript
{
  quantity: number;
}
```

##### Returns

`Promise<PreparedPurchase>` with:
- `cost`: Total cost breakdown
- `steps`: Transaction steps to execute
- `gasEstimate`: Estimated gas cost

##### Example

```typescript
const prepared = await product.preparePurchase({
  address: '0x123...',
  payload: { quantity: 2 },
  gasBuffer: { multiplier: 0.25 } // 25% buffer
});

console.log(`Total: ${prepared.cost.total.formatted}`);
```

#### `product.purchase(params)`

Executes the purchase transaction(s).

##### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.account` | `IAccountAdapter` | Yes | Wallet adapter |
| `params.preparedPurchase` | `PreparedPurchase` | Yes | From preparePurchase |
| `params.callbacks` | `object` | No | Progress callbacks |
| `params.confirmations` | `number` | No | Block confirmations |

##### Example

```typescript
const order = await product.purchase({
  account: walletAdapter,
  preparedPurchase: prepared,
  callbacks: {
    onProgress: (progress) => {
      console.log(`Status: ${progress.status}`);
    }
  }
});

console.log(`Success! TX: ${order.receipts[0].txHash}`);
```

#### `product.getAllocations(params)`

Checks wallet eligibility and allocation.

##### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.recipientAddress` | `string` | Yes | Wallet to check |

##### Returns

```typescript
{
  isEligible: boolean;
  reason?: string;
  quantity: number;
}
```

#### `product.getStatus()`

Returns current product status.

##### Returns

`Promise<'active' | 'paused' | 'completed' | 'upcoming'>`

#### `product.fetchOnchainData()`

Fetches and caches on-chain data.

##### Returns

Product-specific on-chain data including pricing, supply, dates.

## Adapter APIs

### Ethers v5 Adapter

```typescript
import { Ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';

// Browser wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const adapter = new Ethers5Adapter(client, { signer });

// Private key wallet
const wallet = new ethers.Wallet(privateKey, provider);
const adapter = new Ethers5Adapter(client, { wallet });
```

### Viem Adapter

```typescript
import { ViemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { createWalletClient } from 'viem';

const walletClient = createWalletClient({ ... });
const adapter = new ViemAdapter(client, walletClient);
```

## Type Definitions

### Core Types

```typescript
interface Product {
  id: number;
  type: AppType;
  data: InstanceData;
  previewData: InstancePreview;
  
  // Methods...
}

interface PreparedPurchase {
  cost: {
    total: Money;
    subtotal: Money;
    fees: Money;
  };
  steps: TransactionStep[];
  gasEstimate: Money;
}

interface Order {
  receipts: Receipt[];
  status: 'pending' | 'confirmed' | 'failed';
  buyer: Identity;
  total: Cost;
}

interface Money {
  value: BigInt;
  decimals: number;
  currency: string;
  formatted: string;
  formattedUSD: string;
}
```

## Error Handling

The SDK uses typed errors with specific error codes:

```typescript
import { ClientSDKError, ErrorCode } from '@manifoldxyz/client-sdk';

try {
  const product = await client.getProduct('invalid');
} catch (error) {
  if (error instanceof ClientSDKError) {
    switch (error.code) {
      case ErrorCode.NOT_FOUND:
        console.log('Product not found');
        break;
      case ErrorCode.INSUFFICIENT_FUNDS:
        console.log('Not enough balance');
        break;
      case ErrorCode.NOT_ELIGIBLE:
        console.log('Not eligible:', error.details);
        break;
    }
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `INVALID_INPUT` | Invalid parameters |
| `INSUFFICIENT_FUNDS` | Not enough balance |
| `NOT_ELIGIBLE` | Not eligible to purchase |
| `SOLD_OUT` | Product sold out |
| `LIMIT_REACHED` | Wallet limit reached |
| `NOT_STARTED` | Sale hasn't started |
| `ENDED` | Sale has ended |
| `TRANSACTION_REJECTED` | User rejected transaction |

## Transaction Steps - Best Practices

### Understanding Transaction Steps

When you call `preparePurchase()`, the SDK returns a `PreparedPurchase` object containing a `steps` array. Each step represents a individual blockchain transaction that needs to be executed. This design follows Web3 best practices by:

1. **Providing transparency** - Users see exactly what transactions they're signing
2. **Enabling explicit consent** - Each transaction requires user approval
3. **Allowing cancellation** - Users can stop between steps
4. **Supporting retry logic** - Failed steps can be retried individually

### Common Step Patterns

#### ERC20 Payment Flow (2 steps)
1. **Approve** - Grant permission for contract to spend tokens
2. **Mint** - Execute the actual purchase

#### Burn/Redeem Flow (multiple steps)
1. **Burn Token 1** - Burn first required token
2. **Burn Token 2** - Burn second required token  
3. **Redeem** - Mint the new token

### Manual Step Execution

Instead of calling `product.purchase()` which executes all steps automatically, you can execute each step individually for better UX:

```typescript
import { PreparedPurchase, TransactionStep } from '@manifoldxyz/client-sdk';

// Custom UI component for step-by-step execution
async function executeWithUI(
  preparedPurchase: PreparedPurchase,
  adapter: IAccountAdapter
) {
  const results = [];
  
  for (const [index, step] of preparedPurchase.steps.entries()) {
    // Show step details to user
    await showStepModal({
      title: `Step ${index + 1} of ${preparedPurchase.steps.length}`,
      name: step.name,
      type: step.type,
      description: step.description,
      cost: step.cost
    });
    
    try {
      // Execute the step
      console.log(`Executing: ${step.name}`);
      const receipt = await step.execute(adapter, {
        confirmations: 1,
        callbacks: {
          onProgress: (progress) => {
            updateUI(`${step.name}: ${progress.status}`);
          }
        }
      });
      
      results.push(receipt);
      console.log(`✅ ${step.name} complete: ${receipt.txHash}`);
      
      // Update UI to show completion
      await showSuccessToast(`${step.name} completed!`);
      
    } catch (error) {
      // Handle step failure
      console.error(`Failed at step: ${step.name}`, error);
      
      const retry = await showRetryModal({
        step: step.name,
        error: error.message
      });
      
      if (!retry) {
        throw new Error(`Purchase cancelled at step: ${step.name}`);
      }
      
      // Retry logic here...
    }
  }
  
  return results;
}
```

### React Component Example

```typescript
import React, { useState } from 'react';
import { TransactionStep } from '@manifoldxyz/client-sdk';

function PurchaseSteps({ 
  preparedPurchase,
  adapter 
}: {
  preparedPurchase: PreparedPurchase;
  adapter: IAccountAdapter;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  
  const executeStep = async (step: TransactionStep) => {
    setLoading(true);
    setError(undefined);
    
    try {
      const receipt = await step.execute(adapter);
      setCompletedSteps([...completedSteps, step.id]);
      setCurrentStep(currentStep + 1);
      return receipt;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="purchase-steps">
      <h3>Transaction Steps</h3>
      
      {preparedPurchase.steps.map((step, index) => (
        <div key={step.id} className="step">
          <div className="step-header">
            <span className="step-number">{index + 1}</span>
            <span className="step-name">{step.name}</span>
            {completedSteps.includes(step.id) && (
              <span className="step-status">✅</span>
            )}
          </div>
          
          {step.description && (
            <p className="step-description">{step.description}</p>
          )}
          
          {step.type === 'approve' && (
            <div className="approval-info">
              ⚠️ This step will approve the contract to spend your tokens
            </div>
          )}
          
          {currentStep === index && (
            <button 
              onClick={() => executeStep(step)}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Execute ${step.name}`}
            </button>
          )}
          
          {error && currentStep === index && (
            <div className="error">{error}</div>
          )}
        </div>
      ))}
      
      <div className="total-cost">
        Total Cost: {preparedPurchase.cost.total.formatted}
      </div>
    </div>
  );
}
```

### Step Types and User Messaging

#### Approve Steps
```typescript
if (step.type === 'approve') {
  // Show specific messaging for approval
  showModal({
    title: 'Token Approval Required',
    message: `This transaction will allow the contract to spend your ${tokenSymbol}.`,
    details: `Amount: ${step.cost?.erc20s?.[0]?.formatted}`,
    warning: 'This is a one-time approval for this purchase.',
    confirmText: 'Approve Spending',
    cancelText: 'Cancel Purchase'
  });
}
```

#### Mint Steps
```typescript
if (step.type === 'mint') {
  // Show specific messaging for minting
  showModal({
    title: 'Mint NFT',
    message: 'This transaction will mint your NFT.',
    details: `Quantity: ${quantity}`,
    gasEstimate: step.cost?.native?.formatted,
    confirmText: 'Mint Now',
    cancelText: 'Cancel'
  });
}
```

### Error Recovery

```typescript
// Retry failed steps with exponential backoff
async function executeStepWithRetry(
  step: TransactionStep,
  adapter: IAccountAdapter,
  maxRetries = 3
): Promise<TransactionReceipt> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await step.execute(adapter);
    } catch (error) {
      lastError = error;
      
      // Don't retry user rejections
      if (error.code === 'TRANSACTION_REJECTED') {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying step ${step.name}, attempt ${attempt + 1}`);
    }
  }
  
  throw lastError;
}
```

## Examples

### Complete Purchase Flow

```typescript
import { createClient } from '@manifoldxyz/client-sdk';
import { Ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';
import { ethers } from 'ethers';

async function purchaseNFT() {
  // 1. Initialize client
  const client = createClient({
    httpRPCs: {
      1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
    }
  });

  // 2. Get product
  const product = await client.getProduct('4150231280');
  
  // 3. Setup wallet
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const adapter = new Ethers5Adapter(client, { signer });
  
  // 4. Check eligibility
  const allocations = await product.getAllocations({
    recipientAddress: adapter.address
  });
  
  if (!allocations.isEligible) {
    console.log('Not eligible:', allocations.reason);
    return;
  }
  
  // 5. Prepare purchase
  const prepared = await product.preparePurchase({
    address: adapter.address,
    payload: { quantity: 1 }
  });
  
  console.log(`Cost: ${prepared.cost.total.formatted}`);
  
  // 6. Execute purchase
  const order = await product.purchase({
    account: adapter,
    preparedPurchase: prepared
  });
  
  console.log(`Success! TX: ${order.receipts[0].txHash}`);
}
```

### Multi-Product Support

```typescript
async function handleAnyProduct(instanceId: string) {
  const client = createClient();
  const product = await client.getProduct(instanceId);
  
  let payload;
  switch (product.type) {
    case AppType.EDITION:
      payload = { quantity: 1 };
      break;
      
    case AppType.BURN_REDEEM:
      payload = {
        tokens: [{
          contract: {
            networkId: 1,
            address: '0x...',
            spec: 'erc721'
          },
          tokenId: '123'
        }]
      };
      break;
      
    case AppType.BLIND_MINT:
      payload = { quantity: 1 };
      break;
  }
  
  const prepared = await product.preparePurchase({
    address: walletAddress,
    payload
  });
  
  // Continue with purchase...
}
```

### Server-Side Minting

```typescript
import { createClient } from '@manifoldxyz/client-sdk';
import { Ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';
import { ethers } from 'ethers';

async function serverMint() {
  const client = createClient({
    httpRPCs: {
      1: process.env.ETH_RPC_URL
    }
  });
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL)
  );
  
  const adapter = new Ethers5Adapter(client, { wallet });
  
  const product = await client.getProduct('4150231280');
  
  const prepared = await product.preparePurchase({
    address: wallet.address,
    payload: { quantity: 1 }
  });
  
  const order = await product.purchase({
    account: adapter,
    preparedPurchase: prepared
  });
  
  return order;
}
```

## Best Practices

1. **Always check eligibility** before preparing purchases
2. **Handle errors gracefully** with proper error codes
3. **Use gas buffers** for congested networks
4. **Cache product data** when displaying multiple products
5. **Validate inputs** before API calls
6. **Use TypeScript** for better type safety
7. **Monitor transaction status** with callbacks
8. **Test on testnets** first (Sepolia)

## Support

- **Documentation**: [docs.manifold.xyz](https://docs.manifold.xyz)
- **Discord**: [discord.gg/manifold](https://discord.gg/manifold)
- **Twitter**: [@manifoldxyz](https://twitter.com/manifoldxyz)
- **GitHub**: [github.com/manifoldxyz/client-sdk](https://github.com/manifoldxyz/client-sdk)