# Manifold Client SDK

The Manifold Storefront SDK enables **headless purchasing and display** of Manifold products.

Head to [studio.manifold.xyz](https://studio.manifold.xyz/) to launch your product, then build your own UI and use the SDK to seamlessly integrate product purchasing into your application.

## ✨ Features

- **No API keys required** - Works out of the box
- **TypeScript first** - Full type safety and IntelliSense
- **Wallet agnostic** - Works with ethers and viem
- **Support for multiple product types**:
  - Edition
  - Burn/Redeem
  - Blind Mint
- **Complete purchase flow**:
  - Product data fetching
  - Eligibility checking
  - Price simulation
  - Transaction preparation
  - Cross-chain support (coming soon)
  - Error handling

## 📦 Installation

```bash
npm install @manifoldxyz/client-sdk
```

## 🚀 Quick Start

### 1. Import and Initialize

```typescript
import { createClient } from '@manifoldxyz/client-sdk';

const client = createClient({
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
  },
});
```

### 2. Get Product Data

```typescript
const url = 'https://manifold.xyz/@meta8eth/id/4150231280';
const product = await client.getProduct(url); // can also use instanceId directly
const status = await product.getStatus();
console.log(`Currently ${status}`);
```

### 3. Check Eligibility & Price

```typescript
const address = '0x...';
let preparedPurchase;

try {
  preparedPurchase = await product.preparePurchase({
    address,
    payload: {
      quantity: 1,
    },
  });
} catch (error) {
  console.log(`Unable to prepare purchase: ${error.message}`);
  return;
}

console.log(`Total cost: ${preparedPurchase.cost.total.formatted}`);
```

### 4. Execute Purchase

```typescript
const order = await product.purchase({
  account: walletAccount,
  preparedPurchase,
});

console.log(order.receipts[0].txHash, order.status);
```

## 📚 API Reference

### Client Creation

#### `createClient(config?)`

Creates a new SDK client instance.

**Parameters:**

- `debug` (boolean, optional): Enable debug logs
- `httpRPCs` (object, optional): Custom RPC URLs by network ID

**Example:**

```typescript
const client = createClient({
  debug: true,
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  },
});
```

### Client Methods

#### `client.getProduct(instanceIdOrUrl)`

Fetches detailed product information.

**Parameters:**

- `instanceIdOrUrl` (string): Manifold instance ID or Manifold Product URL

**Returns:** `EditionProduct | BurnRedeemProduct | BlindMintProduct`

**Example:**

```typescript
const product = await client.getProduct('4150231280');
// or
const product = await client.getProduct('https://manifold.xyz/@creator/id/12345');
```

#### `client.getProductsByWorkspace(workspaceId, options?)`

Fetches products from a workspace.

**Parameters:**

- `workspaceId` (string): Workspace identifier
- `options` (object, optional):
  - `limit` (number): Result limit (1-100)
  - `offset` (number): Offset results
  - `sort` ('latest' | 'oldest'): Sort order
  - `networkId` (number): Filter by network
  - `type` ('edition' | 'burn-redeem' | 'blind-mint'): Filter by type

**Example:**

```typescript
const products = await client.getProductsByWorkspace('workspace123', {
  limit: 10,
  sort: 'latest',
});
```

### Product Methods

#### `product.getStatus()`

Returns the current status of the product.

**Returns:** `'active' | 'paused' | 'completed' | 'upcoming'`

#### `product.getAllocations(params)`

Check allocation quantity for a wallet address.

**Parameters:**

- `recipientAddress` (string): Buyer's wallet address

**Returns:**

```typescript
{
  isEligible: boolean;
  reason?: string;
  quantity: number;
}
```

#### `product.preparePurchase(params)`

Simulates purchase to check eligibility and get total cost.

**Parameters:**

- `address` (string): The address making the purchase
- `recipientAddress` (string, optional): If different than `address`
- `networkId` (number, optional): Force transaction on specific network
- `payload` (object, optional): Product-specific parameters
  - For Edition: `{ quantity: number, code?: string }`
  - For BurnRedeem: `{ burnTokenIds: string[] }`
  - For BlindMint: `{ quantity: number }`
- `gasBuffer` (object, optional): Additional gas configuration

**Returns:** `PreparedPurchase` with cost breakdown and transaction steps

#### `product.purchase(params)`

Executes the purchase transaction(s).

**Parameters:**

- `account`: Wallet account object
- `preparedPurchase`: Result from `preparePurchase()`

**Returns:** `Order` with transaction receipts and status

## 🔧 Product Types

### Edition Product

```typescript
interface EditionProduct {
  type: 'edition';
  totalSupply?: number;
  maxPerWallet?: number;
  price: bigint;
  startTime?: Date;
  endTime?: Date;
  // ... base properties
}
```

### Burn/Redeem Product

```typescript
interface BurnRedeemProduct {
  type: 'burn-redeem';
  burnTokens: BurnToken[];
  redeemTokens: RedeemToken[];
  // ... base properties
}
```

### Blind Mint Product

```typescript
interface BlindMintProduct {
  type: 'blind-mint';
  revealTime?: Date;
  maxSupply?: number;
  // ... base properties
}
```

## 🧪 Testing

Run the playground to test the SDK:

```bash
npm run playground
```

Or run the test suite:

```bash
npm test
```

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Type check
npm run typecheck
```

## 📄 License

MIT © Manifold

## 🔗 Links

- [Manifold Studio](https://studio.manifold.xyz/)
- [Documentation](https://docs.manifold.xyz/)
- [GitHub](https://github.com/manifoldxyz/client-sdk)
