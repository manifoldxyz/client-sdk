# Manifold Client SDK

The Manifold Storefront SDK enables **headless purchasing and display** of Manifold products.

Head to [studio.manifold.xyz](https://studio.manifold.xyz/) to launch your product, then build your own UI and use the SDK to seamlessly integrate product purchasing into your application.

[Full Documentation](https://manifoldxyz.gitbook.io/manifold-client-sdk)

## ✨ Features

- **TypeScript first** - Full type safety and IntelliSense
- **Wallet agnostic** - Works with ethers v5 and viem
- **Support for multiple product types**:
  - Edition
  - Blind Mint
- **Complete purchase flow**:
  - Product data fetching
  - Eligibility checking
  - Price simulation
  - Transaction preparation
  - Cross-chain support (coming soon)
  - Error handling
- **Built-in provider fallbacks** - Automatic failover between multiple RPC endpoints

## 📦 Installation

```bash
npm install @manifoldxyz/client-sdk
```

## 🚀 Quick Start

### 1. Import and Initialize

```typescript
import { createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';

// Create Wagmi config
const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

// Create public provider
const publicProvider = createPublicProviderWagmi({ config });

// Initialize the SDK client
const client = createClient({ publicProvider });
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
    userAddress: address,
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
// Using viem
import { createAccountViem } from '@manifoldxyz/client-sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum),
});
const account = createAccountViem({ walletClient });

// Or using ethers v5
import { createAccountEthers5 } from '@manifoldxyz/client-sdk';
const account = createAccountEthers5({ signer });

const order = await product.purchase({
  account,
  preparedPurchase,
});

console.log(order.receipts[0].txHash, order.status);
```

## 📚 API Reference

### Client Creation

#### `createClient(config)`

Creates a new SDK client instance.

**Parameters:**

- `config` (object, required): Configuration options
  - `publicProvider` (IPublicProvider, required): Provider for blockchain interactions
  - `debug` (boolean, optional): Enable debug logging

**Example:**

```typescript
import { createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';

// Setup Wagmi config
const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

// Create public provider
const publicProvider = createPublicProviderWagmi({ config });

// Create client
const client = createClient({ publicProvider });

// With debug logging
const client = createClient({ publicProvider, debug: true });
```

### Client Methods

#### `client.getProduct(instanceIdOrUrl)`

Fetches detailed product information.

**Parameters:**

- `instanceIdOrUrl` (string): Manifold instance ID or Manifold Product URL

**Returns:** `EditionProduct | BlindMintProduct`

**Example:**

```typescript
const product = await client.getProduct('4150231280');
// or
const product = await client.getProduct('https://manifold.xyz/@creator/id/12345');
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

- `userAddress` (string): The address making the purchase
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

- `account`: Wallet account adapter (see Wallet Adapters section)
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

### Blind Mint Product

```typescript
interface BlindMintProduct {
  type: 'blind-mint';
  revealTime?: Date;
  maxSupply?: number;
  // ... base properties
}
```

## 🔌 Wallet Adapters

The SDK supports multiple wallet libraries through adapters:

### Viem

```typescript
import { createWalletClient, custom, http } from 'viem';
import { mainnet } from 'viem/chains';
import { createAccountViem } from '@manifoldxyz/client-sdk';

// Using browser wallet (MetaMask, etc.)
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum),
});
const account = createAccountViem({ walletClient });

// Using private key
import { privateKeyToAccount } from 'viem/accounts';
const viemAccount = privateKeyToAccount('0x...');
const walletClient = createWalletClient({
  account: viemAccount,
  chain: mainnet,
  transport: http(),
});
const account = createAccountViem({ walletClient });
```

### Ethers v5

```typescript
import { ethers } from 'ethers';
import { createAccountEthers5 } from '@manifoldxyz/client-sdk';

// Using MetaMask or other browser wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const account = createAccountEthers5({ signer });

// Using a private key
const wallet = new ethers.Wallet(privateKey, provider);
const account = createAccountEthers5({ signer: wallet });
```

## 🧪 Testing

Run the playground to test the SDK:

```bash
pnpm run playground
```

Or run the test suite:

```bash
pnpm test
```

## 🏗️ Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test

# Run linting
pnpm run lint

# Type check
pnpm run typecheck
```

## 📄 License

MIT © Manifold

## 🔗 Links

- [Manifold Studio](https://studio.manifold.xyz/)
- [Documentation](https://manifoldxyz.gitbook.io/manifold-client-sdk)
- [GitHub](https://github.com/manifoldxyz/client-sdk)
