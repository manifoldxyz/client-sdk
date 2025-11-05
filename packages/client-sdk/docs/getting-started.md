# Getting Started

## Overview

[Manifold Studio](https://studio.manifold.xyz/) enables the publishing of [**Edition**](https://help.manifold.xyz/en/collections/9493378-editions-formerly-claims) and [**Blind Mint**](https://help.manifold.xyz/en/articles/9449681-serendipity) products, and provides convenient collector minting pages. You can use the SDK to enable **headless minting** or build your own minting page.

## Requirements

Before getting started, make sure you have the following:

* **Node.js 18.0.0 or higher**
  * Check your version: `node --version`
  * Download from [nodejs.org](https://nodejs.org/)
* A package manager (npm, pnpm, or yarn)
* An RPC provider (Alchemy, Infura, or other)

## Installation <a href="#installation" id="installation"></a>

Install the SDK in your project:

```bash
npm install @manifoldxyz/client-sdk
```

#### Quick Start <a href="#quick-start" id="quick-start"></a>

{% tabs %}
{% tab title="index.ts" %}
```typescript
import { createClient, EditionProduct, createPublicProviderWagmi, createAccountViem } from '@manifoldxyz/client-sdk';
import { createConfig, http, getAccount, getWalletClient } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';

// Create Wagmi config
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http('YOUR_RPC_URL'), // or http() for public RPC
  },
});

// Create a public provider for blockchain interactions
const publicProvider = createPublicProviderWagmi({ config });

// Initialize the Manifold client
const client = createClient({ publicProvider });

// Fetch product
const product = await client.getProduct('4150231280') as EditionProduct;

// Get connected account from Wagmi
const account = getAccount(config);
if (!account.address) throw new Error('No wallet connected');

// Prepare purchase
const prepared = await product.preparePurchase({
  address: account.address,
  payload: { quantity: 1 },
});

// Get wallet client and create account adapter
const walletClient = await getWalletClient(config);
const accountAdapter = createAccountViem({ walletClient });

// Execute purchase
const order = await product.purchase({
  account: accountAdapter,
  preparedPurchase: prepared,
});
const txHash = order.receipts[0]?.txHash;
console.log(`Edition purchase transaction: ${txHash}`);
```
{% endtab %}

{% tab title="setup.ts" %}
```typescript
import { createConfig, http } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import { injected } from '@wagmi/connectors';

// Create Wagmi config with injected connector (MetaMask, etc.)
export const config = createConfig({
  chains: [mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http('YOUR_RPC_URL'), // or http() for public RPC
  },
});
```
{% endtab %}
{% endtabs %}

## Create your first product

Head over to [Manifold Studio](https://studio.manifold.xyz/) to [create your first product](https://help.manifold.xyz/en/collections/9493376-your-create-menu). The SDK currently supports [Edition](https://help.manifold.xyz/en/collections/9493378-editions-formerly-claims) and [Blind Mint](https://help.manifold.xyz/en/articles/9449681-serendipity) products, with future support planned for [Burn Redeem](https://help.manifold.xyz/en/articles/9387352-create-a-burn-redeem-campaign).

1. Visit [studio.manifold.xyz](https://studio.manifold.xyz/) and sign in.
2. Navigate to the [Create+ Menu](https://help.manifold.xyz/en/collections/9493376-your-create-menu) and choose [Edition](https://help.manifold.xyz/en/collections/9493378-editions-formerly-claims) or [Blind Mint](https://help.manifold.xyz/en/articles/9449681-serendipity) .
3. Configure your asset, allowlists, supply caps, and price.
4. Publish the product and note the instance ID from the URL.
5. Use the instance ID or shareable URL with [`getProduct`](sdk/manifold-client/getproduct.md).

### Troubleshooting

#### Node.js Version Issues

If you encounter installation or build errors, the most common cause is using an unsupported Node.js version.

**Common error messages:**

* `npm ERR! engine Unsupported platform`
* `npm ERR! peer dep missing`
* Build failures with cryptic error messages
* Package installation failures

**Solution:**

1.  Check your Node.js version:

    ```
    node --version
    ```
2. If you're using Node.js < 18.0.0, update to the latest LTS version:
   * Visit [nodejs.org](https://nodejs.org/) to download the latest LTS
   *   Or use a version manager like `nvm`:

       ```
       nvm install --ltsnvm use --lts
       ```

[If you're an AI agent or LLM, please read this.](guides/for-ai-agents-and-llms-checklist-and-guidelines.md)

### Building with AI

\
This entire site is converted into a single markdown doc that can fit inside the context window of most LLMs. See [The /llms.txt file](https://manifold-1.gitbook.io/manifold-client-sdk/llms-full.txt).

\\
