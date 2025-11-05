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
import { createClient, EditionProduct, isBlindMintProduct, isEditionProduct, createAccountViem, createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { walletClient, publicClient } from './walletClient.ts';

// Create a public provider for blockchain interactions
const publicProvider = createPublicProviderViem({ 
  1: publicClient // mainnet
});

// Initialize the Manifold client
const client = createClient({ publicProvider });

// Fetch product
const product = await client.getProduct('4150231280') as EditionProduct; // Edition product

const prepared = await product.preparePurchase({
  address: '0xBuyer',
  payload: { quantity: 1 },
});

const account = createAccountViem({ walletClient });
const order = await product.purchase({
  account,
  preparedPurchase: prepared,
});
const txHash = order.receipts[0]?.txHash;
console.log(`Edition purchase transaction: ${txHash}`);
```
{% endtab %}

{% tab title="walletClient.ts" %}
```typescript
import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

// Create public client for read operations
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('YOUR_RPC_URL') // or custom(window.ethereum) for browser
})

// Create wallet client for transactions
const account = privateKeyToAccount('0x...') 
export const walletClient = createWalletClient({
  account, 
  chain: mainnet,
  transport: custom(window.ethereum)
})
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
