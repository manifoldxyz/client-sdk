> 💡 Quick Navigation: Installation • Quick Start • Core Concepts • API Reference • Examples • Support

---

## 🎯 What is this SDK?

The Manifold Storefront SDK enables **headless purchasing and display** of Manifold products.

Head to [studio.manifold.xyz](https://studio.manifold.xyz/) to launch your product, then build your own UI and use the SDK to seamlessly integrate product purchasing into your application.

Want to support Manifold products in your service? This SDK provides a straightforward interface to incorporate Manifold products directly into your workflows.

### ✨ Key Benefits

- **No API keys required** - Works out of the box
  • **TypeScript first** - Full type safety and IntelliSense
  • **Wallet agnostic** - Works with ethers and viem
  • **Support the following Manifold product types** - - Edition - Burn/Redeem - Blind mint

### 📦 What You Get

- Complete product data fetching
  - Eligibility checking
  - Price simulation
  - Transaction preparation
  - Pay from any supported network (limited support)
  - Error handling

---

## 📥 Installation

```bash
npm install @manifoldxyz/client-sdk
```

---

## 🚀 Quick Start

### Step 1: Import and Initialize

```jsx
import { createClient } from '@manifoldxyz/client-sdk';
const client = createClient({
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
  },
});
```

### Step 2: Get Product Data

```jsx
const url = 'https://manifold.xyz/@meta8eth/id/4150231280'
const product = await client.getProduct(url); // can also use 4150231280 (instanceId)
const status = await product.getStatus();
console.log(`Currently ${status})

```

### Step 3: Check Eligibility & Price

```jsx

const address = '0x...'
let preparedPurchase
try {
	preparedPurchase = await product.preparePurchase({
		address,
		payload: {
			quantity: 1
		}
	});
} catch (error: ClientSDKError) {
	console.log(`Unable to prepare purchase ${error.message})
	return
}
console.log(`Total cost: ${preparedPurchase.cost.total.formatted})
```

### Step 4: Execute Purchase

```jsx
const order = await product.purchase({
  account,
  preparedPurchase,
});
console.log(order.receipts[0].txHash, order.status);
```

---

## 🔑 Core Concepts

- **Two-Step Purchase Flow** - Prepare then Execute
  The SDK uses a two-step process for safety and transparency:
  **Step 1: Prepare** ✓
  - Check eligibility
    - Wallet is within allowlist
    - Wallet has sufficient funds
    - Code is valid (For Edition Page with redemption codes)
  - Estimate gas
  - Total cost
  **Step 2: Purchase** ✓
  - Handle sped up transaction automatically
  - return [Order](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
- **Network / Relayer**
  - Default: submit on the network the product is on
  - Optional **Relayer** enables cross‑chain payment

---

## 📚 API Reference

## Client Creation

- **createClient(config?)** → ManifoldClient
  Creates a new SDK client instance.
  ### Parameters
  | Parameter | Type                           | Default | Description                                                                                   |
  | --------- | ------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
  | debug     | boolean                        | false   | Enable debug logs                                                                             |
  | httpRPCs  | {[networkId]: <http-provider>} | {}      | Custom RPC URLs by network. **You need to provide one for every network you want to support** |
  ### Returns: StorefrontClient
  | Property                 | Type     | Description                   |
  | ------------------------ | -------- | ----------------------------- |
  | getProduct()             | function | Get a product                 |
  | getProductsByWorkspace() | function | Get products from a workspace |
  ### Example
  ```jsx
  const client = createClient({
    httpRPCs: {
      1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    },
  });
  ```

---

## Client

- **getProduct(instanceId | url)** → [EditionProduct | BurnRedeemProduct | BlindMintProduct](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Fetches detailed product information.
  ### Parameters
  | Parameter  | Type | Required | Description |
  | ---------- | ---- | -------- | ----------- | -------------------------------------------- |
  | instanceId | url  | string   | ✅          | Manifold instance ID or Manifold Product Url |
  ### Returns: [Product](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  ### Example
  ```jsx
  const product = await client.getProduct('4150231280');
  console.log(`AppType: ${product.type}`);
  ```
  [**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Code             | Message                    |
  | ---------------- | -------------------------- |
  | NOT_FOUND        | `product not found`        |
  | UNSUPPORTED_TYPE | `Unsupported product type` |
- **getProductByWorkspace(workspaceId)** → [Product](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]
  Fetch products from a workspace
  ### Parameters
  | Parameter   | Type     | Required | Description               |
  | ----------- | -------- | -------- | ------------------------- | ----------------------------- | ------------ |
  | workspaceId | string   | ✅       | Array of instance IDs     |
  | **options** | object   | ❌       | Query                     |
  | limit       | number   | ❌       | Result limit              |
  | offset      | number   | ❌       | Offset result by          |
  | sort        | ‘latest’ | ‘oldest’ | ❌                        | Sort by product creation date |
  | networkId   | number   | ❌       | Filter by certain network |
  | type        | enum     | ❌       | `edition`                 | `burn-redeem`                 | `blind-mint` |
  ### Returns
  Array of [Product](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  ### Example
  ```jsx
  const products = await client.**getProductByWorkspace**('321234');
  console.log(`Got ${products.length} products`);
  ```
  [**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Code          | Message                 |
  | ------------- | ----------------------- |
  | NOT_FOUND     | `workspace not found`   |
  | INVALID_INPUT | `invalid options.limit` |

---

## [EditionProduct | BurnRedeemProduct | BlindMintProduct](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

- **product.preparePurchase(params)** → [PreparedPurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Simulates purchase to check eligibility and get total cost.
  ### Parameters
  | Parameter            | Type                                                                                                                         | Required                                                                                                                        | Description                                                                                                                    |
  | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --- | ---------------------- |
  | address              | string                                                                                                                       | ✅                                                                                                                              | The address making the purchase                                                                                                |
  | **recipientAddress** | string                                                                                                                       | ❌                                                                                                                              | If different than `address`                                                                                                    |
  | **networkId**        | number                                                                                                                       | ❌                                                                                                                              | If specify, forced transaction on the network (handle funds bridging automatically), assume product network otherwise          |
  | payload              | [EditionPayload](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BurnRedeemPayload](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BlindMintPayload](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌  | App specifics payloads |
  | **gasBuffer**        | object                                                                                                                       | ❌                                                                                                                              | How much additional gas to spend on the purchase                                                                               |
  | gasBuffer.fixed      | BigInt                                                                                                                       | ❌                                                                                                                              | Fixed gas buffer amount                                                                                                        |
  | gasBuffer.multipller | number                                                                                                                       | ❌                                                                                                                              | Gas buffer by multiplier                                                                                                       |
  ### Returns: [PreparedPurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  > A purchase can involve more than one transaction. For example, minting and paying with ERC-20 tokens requires an approval transaction followed by a mint transaction. If you’re building your own front-end with the SDK, you may want users to trigger these transactions explicitly (e.g., by clicking separate buttons). `PreparedPurchase` returns a list of steps for this purpose. Each step represents an on-chain transaction that can be executed by calling `step.execute()`. Each `execute` call performs the necessary on-chain checks to determine whether the transaction is still required; if it isn’t, the step is skipped.
  ### Example
  ```jsx
  import { createClient, type AppType } from '@manifoldxyz/client-sdk'

  const client = createClient({
    httpRPCs: {
      1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
    }
  });

  const product = await client.getProduct('12311232')
  if (product.type !== AppType.Edition) {
  	throw new Error(`Unsupported app type`)
  }
  try {
  	const preparedPurchase = await product.**preparePurchase<EditionPayload>**({
  		address: '0x....', // the connected wallet
  	  payload: {
  		  quantity: 1
  	  },
  	  gasBuffer: {
  	   multiplier: 0.25 // 25% gas buffer
  	  }
  	});
  } catch (error: ClientSDKError) {
  	console.log(`Error: ${error.message}`)
  	return
  }

  console.log('Total cost:', simulation.totalCost.formatted);
  ```
  [**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Code                | Message                                       | data                                                                                                                           |
  | ------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
  | INVALID_INPUT       | `invalid input <input-parameter>`             |                                                                                                                                |
  | UNSUPPORTED_NETWORK | `unsupported networkId ${networkId}`          |                                                                                                                                |
  | WRONG_NETWORK       | `wrong network please switch to ${networkId}` |                                                                                                                                |
  | NOT_ELIGIBLE        | `wallet not eligible to purchase product`     | [Eligibility](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)      |
  | SOLD_OUT            | `product sold out`                            |                                                                                                                                |
  | LIMIT_REACHED       | `you've reached your purchase limit`          |                                                                                                                                |
  | ENDED               | `ended`                                       |                                                                                                                                |
  | NOT_STARTED         | `not started, come back later`                |                                                                                                                                |
  | MISSING_TOKENS      | `missing required tokens`                     | [TokenRequirement](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) |
  | ESTIMATION_FAILED   | `transaction estimation failed`               | [CallExceptions](https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception)                                          |
- **product.purchase(params)** → [Order](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Make a purchase on the product.
  May trigger more than 1 write transactions (Ex: approval tokens and mint)
  ### Parameters
  | Parameter        | Type                                                                                                                               | Required | Description                                                                                                                                                                  |
  | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | account          | [AccountProvider](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)      | ✅       | Buyer’s account                                                                                                                                                              |
  | preparedPurchase | [PreparedPurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)     | ✅       | Prepared transaction object returned from [preparePurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) call |
  | callbacks        | [TransactionCallbacks](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌       | Purchase callbacks for handling different stages                                                                                                                             |
  | confirmations    | number                                                                                                                             | ❌       | Number of confirmation blocks (Default 1)                                                                                                                                    |
  ### Returns: [Order](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  ### Example
  ```jsx
  const results = await product.**purchase**({
    account,
    preparedPurchase
    });
  if (!simulation.eligibility.isEligible) {
    console.log('Cannot mint:', simulation.eligibility.reason);
    return;
  }
  console.log('Total cost:', simulation.totalCost.formatted);
  ```
  [**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Code                 | Message                                                   | data                                                                                  | metadata                                                                                                                                                    |
  | -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | TRANSACTION_FAILED   | `transaction failed`                                      | [CallExceptions](https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception) | { receipts : [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]} (For completed steps) |
  | TRANSACTION_REVERTED | `transaction reverted`                                    | [CallExceptions](https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception) | { receipts : [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]} (For completed steps) |
  | TRANSACTION_REJECTED | `user rejected transaction`                               |                                                                                       | { receipts : [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]} (For completed steps) |
  | INSUFFIENT_FUNDS     | `wallet does not have sufficient funds for purchase`      |                                                                                       | { receipts : [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]} (For completed steps) |
  | LEDGER_ERROR         | `error with ledger wallet, make sure blind signing is on` |                                                                                       | { receipts : [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]} (For completed steps) |
- **product.getAllocations(params)** → AllocationResponse
  Check allocation quantity for a wallet address
  ### Parameters
  | Parameter            | Type   | Required | Description    |
  | -------------------- | ------ | -------- | -------------- |
  | **recipientAddress** | string | ✅       | Buyer’s wallet |
  ### Returns: AllocationResponse
  | Field      | Type    | Description       |
  | ---------- | ------- | ----------------- |
  | isEligible | boolean | Can purchase?     |
  | reason     | string  | Why not eligible  |
  | quantity   | number  | Quantity eligible |
  ### Example
  ```jsx
  const allocations = await product.**getAllocations**({
    **recipientAddress**: '0x742d35Cc...'
    });
  if (!allocations.isEligible) {
    console.log('Cannot mint:', allocations.reason);
    return;
  }
  console.log('Total alloted:', allocations.quantity);
  ```
  [**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Code          | Message                     |
  | ------------- | --------------------------- |
  | INVALID_INPUT | `invalid recipient address` |
- **product.getInventory()** → [ProductInventory](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Get total supply and total purchased of the product
- **product.getRules()** → [ProductRule](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Get product rules such as start/end dates, max tokens per wallet, audience restriction etc.
- **product.getProvenance()** → [](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[ProductProvenance](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Get provenance information for the product such as related contract address, token ID, creator information etc.
- **product.fetchOnchainData()** → [OnchainEditionData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BurnRedeemOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BlindMintOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  Get on-chain data and assign `onchainData` properties for the product object.
  Note: This is only needed if you set `withOnchainData` as `false` when you call `sdk.getProduct`
  ### Example
  ```tsx
  const product = await sdk.getProduct('31231232')
  await product.**fetchOnchainData()
  console.log(`cost: ${**product.**onchainData.cost.formatted}`)**
  ```

---

## Step

Individual step (for manual executions)

- **step.execute(params)** → [Order](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  | Parameter     | Type                                                                                                                               | Required | Description                                      |
  | ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
  | account       | [AccountProvider](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)      | ✅       | Buyer’s account                                  |
  | callbacks     | [TransactionCallbacks](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌       | Purchase callbacks for handling different stages |
  | confirmations | number                                                                                                                             | ❌       | Number of confirmation blocks (Default 1)        |
  ### Returns: [Order](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)
  ### Example:
  ```tsx
  import { ethers5Adapter } from '@manifoldxyz/client-sdk'

  const preparedPurchase = await product.**preparePurchase<EditionPayload>**({
  	address: '0x...',
    payload: {
  	  quantity: 1
    },
    gasBuffer: {
     multiplier: 0.25 // 25% gas buffer
    }
  });

  const signer = // your ether signer
  const account = ethers5Adapter.signer.fromEthers({signer})

  // Execute steps one by one
  let order
  try {
  	for (const step of preparedPurchase.steps) {
  		order = await step.execute({account})
  		const receipt = order.receipts[0]
  		console.log(`Successfully executed ${receipt.step.name} txHash: ${receipt.txHash}`)
  	}
  } catch (error : StudioSDKError) {
  	console.log(`Failed to execute transaction ${error.message}`)
  }
  ```

---

## Adapters

```tsx
// Ethers v5
import { ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';
const account = ethers5Adapter.signer.fromEthers(signerV5);

// Ethers v6
import { ethers6Adapter } from '@manifoldxyz/client-sdk/adapters';
const account = ethers6Adapter.signer.fromEthers(signerV6);

// Viem
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
const account = viemAdapter.signer.fromViem(walletClient);
```

Each adapter implements the [Account](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) interface

## Common Patterns

---

- Edition Page mint
  ```tsx
  import {
    Web3Provider,
  } from '@ethersproject/providers';
  import { ethers5Adapter } from '@manifoldxyz/client-sdk'
  import { createClient } from '@manifoldxyz/client-sdk';

  // Initialize client
  const client = createClient({
  	 httpRPCs: {
  	  1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  	  8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
  	 }
  });

  // Grab product information
  const manifoldUrl = 'https://manifold.xyz/@meta8eth/id/4150231280'
  const product = await client.getProduct(manifoldUrl);

  if (product.type !== AppType.Edition) {
  	throw new Error(`Unsupported app type`)
  }

  // prepare purchase
  const preparedPurchase = await product.preparePurchase<EditionPayload>({
  	address:'0x...',
  	payload: {
  		quantity : 1
  	}
  })

  // Grab provider from browser
  const provider = new Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  const account = ethers5Adapter.signer.fromEthers({signer})

  // purchase
  const order = await product.purchase({
  	account,
  	preparedPurchase,
  	callbacks: {
  		onProgress: (progress: TransactionProgress) {
  			console.log(progress.status)
  		}
  	}
  })
  console.log(`Success! TxHashes ${order.receipts.map((receipt) => receipt.txHas).join(',')`})
  ```
- Allowlist Edition Mint
  ```jsx
  import {
    Web3Provider,
  } from '@ethersproject/providers';
  import { ethers5Adapter } from '@manifoldxyz/client-sdk'
  import { createClient } from '@manifoldxyz/client-sdk';

  // Initialize client
  const client = createClient({
  	 httpRPCs: {
  	  1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  	  8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
  	 }
  });

  // Grab product information
  const manifoldUrl = 'https://manifold.xyz/@meta8eth/id/4150231280'
  const product = await client.getProduct(manifoldUrl);

  if (product.type !== AppType.Edition) {
  	throw new Error(`Unsupported app type`)
  }

  // Grab provider from browser
  const provider = new Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  const account = ethers5Adapter.signer.fromEthers({signer})

  // check wallet allocation
  const allocations = await product.**getAllocations({
  	recipientAddress: account.address
  })

  if (allocations.quantity === 0) {
  	console.log(allocations.reason)
  	return;
  }**

  // prepare purchase
  const preparedPurchase = await product.preparePurchase<EditionPayload>({
  	address: account.address,
  	payload: {
  		quantity: 1
  	}
  })

  // purchase
  const order = await product.purchase({
  	account,
  	preparedPurchase,
  	callbacks: {
  		onProgress: (progress) {
  			console.log(progress.status)
  		}
  	}
  })
  console.log(`Success! TxHash ${order.receipts.map((receipt) => receipt.txHash).join(',')`})
  ```
- Product Display
  ```tsx
  import { createClient } from '@manifoldxyz/client-sdk';

  // Initialize client
  const client = createClient({
  	 httpRPCs: {
  	  1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
  	  8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
  	 }
  });

  export function ProductDisplay(manifoldUrl: string) {
  	const [thumbnail, setThumbnail] = useState()

  	const fetchThumbnail = async () {
  		const product = await client.getProduct(manifoldUrl)
  		const thumbnail = product.media.find((md) => md.type === 'image')?.previewUrl
  		if (thumbnail) {
  			setThumbnail(thumbnail)
  		}
  	}

  	useEffect(()-> {
  		 fetchThumbnail(url)
  	},[url])

  	if (!thumbnail) {
  		return
  	}

  	return (
  		<img src={thumbnail}>
  	)
  }
  ```
- Multi-app Support (WIP)
  You will need some custom handlings if you want to support more than one app type
  ```tsx
  // Multi-app Support example
  // - Detects product.type and applies the correct flow & payload
  // - Works with viem, ethers v5, or ethers v6 via adapters

  import { createClient, viemAdapter, StorefrontSDKError } from '@manifoldxyz/client-sdk';
  // If you prefer ethers, swap the adapter import:
  // import { ethers5Adapter, ethers6Adapter } from '@manifoldxyz/client-sdk/adapters';

  /** Optional caller-provided inputs */
  type MultiAppPurchaseOptions = {
    quantity?: number;                    // default 1
    // Edition-only
    redemptionCode?: string;              // for edition products with claim codes
    // Burn/Redeem-only
    tokensToBurn?: Array<
      contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
      tokenId: string;
    }>;
    // Cross-chain (optional)
    networkId?: number;                   // force execution on a specific chain (relayer handles bridging if enabled)
  };

  /** Handles eligibility checks that are common across apps (optional) */
  async function ensureEligible(product: any, recipientAddress: string) {
    const allocations = await product.getAllocations({ recipientAddress });
    if (!allocations.isEligible || allocations.quantity === 0) {
      throw new Error(allocations.reason ?? 'Not eligible to purchase');
    }
  }

  export async function purchaseWithMultiAppSupport(params: {
    manifoldUrl: string;               // e.g. 'https://manifold.xyz/@creator/id/4150231280'
    account: ReturnType<typeof viemAdapter.signer.fromViem>;  // or ethers adapter account
    options?: MultiAppPurchaseOptions;
  }) {
    const { manifoldUrl, account, options } = params;
    const quantity = options?.quantity ?? 1;

    // Initialize client with any networks you want to support
    const client = createClient({
      httpRPCs: {
        1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
        8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
        10: 'https://optimism-mainnet.infura.io/v3/YOUR_KEY',
        360: 'https://mainnet.shape.network',             // Shape (example)
        11155111: 'https://sepolia.infura.io/v3/YOUR_KEY' // Testnet
      }
    });

    // 1) Fetch product
    const product = await client.getProduct(manifoldUrlOrId);
    const buyerAddress = account.address;

    // 2) Build app-specific payloads + (optional) eligibility checks
    type EditionPayload = { redemptionCode?: string, quantity: number };
    type BurnRedeemPayload = {
      tokens?: Array<{
        contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
        tokenId: string;
      }>;
    };

    let payload: EditionPayload | BurnRedeemPayload | undefined;

    switch (product.type as 'edition' | 'burn-redeem' | 'gacha') {
      case 'edition': {
        // Optional: check allocations if the product uses allowlists/limits
        await ensureEligible(product, buyerAddress);

        // Include a claim code only if the edition requires one
        if (options?.redemptionCode) {
          payload = { redemptionCode: options.redemptionCode, quantity };
        }
        break;
      }
      case 'burn-redeem': {
        // Burn/Redeem requires specifying which tokens to burn
        if (!options?.tokensToBurn || options.tokensToBurn.length === 0) {
          throw new Error('Burn/Redeem requires tokensToBurn to be provided.');
        }
        payload = { tokens: options.tokensToBurn };
        break;
      }
      case 'gacha': {
        // Blind Mint / Gacha usually needs no payload—just quantity
        // (You could still run ensureEligible if the drop is gated)
        // await ensureEligible(product, buyerAddress);
        payload = undefined;
        break;
      }
      default:
        throw new Error(`Unsupported app type: ${product.type}`);
    }

    // 3) Prepare the purchase (simulates, estimates gas, returns steps & total cost)
    let preparedPurchase;
    try {
      preparedPurchase = await product.preparePurchase({
        address: buyerAddress,
        quantity,
        payload,                  // edition or burn-redeem payloads when applicable
        networkId: options?.networkId, // optional: force network (relayer-enabled setups)
        gasBuffer: { multiplier: 0.25 } // optional: +25% gas buffer
      });
    } catch (err) {
      if (err instanceof StorefrontSDKError) {
        // Handle typed errors from docs: NOT_ELIGIBLE, SOLD_OUT, LIMIT_REACHED, etc.
        console.error(`Prepare failed [${err.code}]: ${err.message}`);
      }
      throw err;
    }

    console.log(`Total cost: ${preparedPurchase.cost.total.formatted}`);

    // 4) Execute the purchase (handles 1+ tx steps automatically, including ERC20 approvals)
    const order = await product.purchase({
      account,
      preparedPurchase,
      confirmations: 1,
      callbacks: {
        onProgress: (progress) => {
          console.log(
            `[${progress.status}] step=${progress.currentStep?.name} receipts=${progress.receipts?.length ?? 0}`
          );
        }
      }
    });

    const lastReceipt = order.receipts[order.receipts.length - 1];
    console.log(`Success! status=${order.status} txHash=${lastReceipt?.txHash}`);
    return order;
  }

  /** Example usage (viem):
  import { useConnectorClient } from 'wagmi';
  import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
  import { type AppType } from '@manifoldxyz/client-sdk'

  function ExampleButton({ instanceId }: { instanceId: string }) {
    const { data: walletClient } = useConnectorClient();
    const product = useProduct()

    async function onClick() {
      if (!walletClient) return;
      const account = viemAdapter.signer.fromViem(walletClient);
  		if (app.type === AppType.Edition) {
  			// EDITION (with optional claim code)
  	    await purchaseWithMultiAppSupport({
  	      manifoldUrlOrId: instanceId,
  	      account,
  	      options: { quantity: 1, redemptionCode: 'MY-CODE-123' }
  	    });
  		}

  		if (app.type === AppType.BurnRedeem) {
      // BURN/REDEEM
      // await purchaseWithMultiAppSupport({
      //   manifoldUrlOrId: instanceId,
      //   account,
      //   options: {
      //     quantity: 1,
      //     tokensToBurn: [{
      //       contract: { networkId: 1, address: '0xToken', spec: 'erc721' },
      //       tokenId: '1234'
      //     }]
      //   }
      // });
      }

  		if (app.type === AppType.BlindMint) {
      // BLIND MINT
      // await purchaseWithMultiAppSupport({
      //   manifoldUrlOrId: instanceId,
      //   account,
      //   options: { quantity: 1 }
      // });
      }
    }

    return <button onClick={onClick}>Buy</button>;
  }
  */

  ```

# Common Patterns

## 1) Edition Mint (public)

### A) Node.js (server side)

```tsx
// file: scripts/editionMintUnified.ts
import 'dotenv/config';
import { createClient, AppType } from '@manifoldxyz/client-sdk';
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

async function main() {
  const ID_OR_URL = process.env.MANIFOLD_ID_OR_URL ?? '4150231280'; // or full URL
  const RPC_MAINNET = process.env.RPC_MAINNET!;
  const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

  // 1) SDK client (public reads need no API key; provide RPCs for networks you use)
  const client = createClient({ httpRPCs: { 1: RPC_MAINNET } });

  // 2) Server wallet (never expose to browser)
  const acct = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account: acct,
    chain: mainnet,
    transport: http(RPC_MAINNET),
  });
  const account = viemAdapter.signer.fromViem(walletClient);

  // 3) Fetch product & validate app type
  const product = await client.getProduct(ID_OR_URL);
  if (product.type !== AppType.Edition) {
    throw new Error(`Unsupported app type: expected Edition, got ${product.type}`);
  }

  // 4) (Optional but recommended) Check allocations/eligibility
  const allocations = await product.getAllocations({ recipientAddress: account.address });
  if (!allocations.isEligible || allocations.quantity === 0) {
    console.log('Not eligible to mint:', allocations.reason ?? 'No allocation');
    return;
  }

  // 5) Prepare purchase (simulation + steps + costs)
  const preparedPurchase = await product.preparePurchase({
    address: account.address,
    payload: { quantity: 1 }, // or include { redemptionCode } if your edition requires it
    gasBuffer: { multiplier: 0.25 }, // optional
  });

  console.log('Total cost:', preparedPurchase.cost.total.formatted);

  // 6) Execute purchase
  const order = await product.purchase({
    account,
    preparedPurchase,
    confirmations: 1,
    callbacks: {
      onProgress: (p) =>
        console.log(
          `[${p.status}] step=${p.currentStep?.name ?? '-'} receipts=${p.receipts?.length ?? 0}`,
        ),
    },
  });

  const last = order.receipts.at(-1);
  console.log(`Success! status=${order.status} txHash=${last?.txHash}`);
}

main().catch((e) => {
  console.error('Edition mint failed:', e?.message ?? e);
  process.exit(1);
});
```

---

### B) React (browser)

```tsx
// file: components/EditionMintUnifiedButton.tsx
import React, { useState } from 'react';
import { createClient, AppType } from '@manifoldxyz/client-sdk';
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { useConnectorClient } from 'wagmi';

const client = createClient(); // public reads; add httpRPCs if you want custom endpoints

export function EditionMintUnifiedButton({
  idOrUrl,
  quantity = 1,
  redemptionCode, // optional, only if the edition uses claim codes
}: {
  idOrUrl: string;
  quantity?: number;
  redemptionCode?: string;
}) {
  const { data: walletClient } = useConnectorClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleMint() {
    if (!walletClient) return setMsg('Connect a wallet first.');
    setBusy(true);
    setMsg('Preparing…');

    try {
      const account = viemAdapter.signer.fromViem(walletClient);

      // 1) Fetch product & check type
      const product = await client.getProduct(idOrUrl);
      if (product.type !== AppType.Edition) {
        throw new Error(`Unsupported app type: expected Edition, got ${product.type}`);
      }

      // 2) (Optional) Check allocations/eligibility
      const allocations = await product.getAllocations({ recipientAddress: account.address });
      if (!allocations.isEligible || allocations.quantity === 0) {
        setMsg(allocations.reason ?? 'Not eligible to mint');
        setBusy(false);
        return;
      }

      // 3) Prepare (simulation + pricing)
      const payload = redemptionCode ? { quantity, redemptionCode } : { quantity };
      const prepared = await product.preparePurchase({
        address: account.address,
        payload,
        gasBuffer: { multiplier: 0.25 }, // optional
      });

      setMsg(`Total: ${prepared.cost.total.formatted}. Submitting…`);

      // 4) Purchase (handles multi-step flows like ERC20 approval)
      const order = await product.purchase({
        account,
        preparedPurchase: prepared,
        callbacks: { onProgress: (p) => setMsg(`Status: ${p.status}`) },
      });

      const last = order.receipts.at(-1);
      setMsg(`Success! ${last?.txHash ?? ''}`);
    } catch (e: any) {
      setMsg(e?.message ?? 'Mint failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={handleMint} disabled={busy}>
      {busy ? 'Minting…' : 'Mint Edition'}
    </button>
  );
}
```

---

---

---

## 2) Product Display (thumbnail & basic info)

### A) Node.js (server only) – Express route returning display data

```tsx
// file: server/productRoute.ts
import express from 'express';
import { createClient } from '@manifoldxyz/client-sdk';

const router = express.Router();
const client = createClient(); // public reads require no API key

router.get('/product', async (req, res) => {
  try {
    const { idOrUrl } = req.query as { idOrUrl: string };
    const product = await client.getProduct(idOrUrl);

    const metadata = await product.getMetadata();
    const media = await product.getPreviewMedia(); // or use `product.data.publicData.asset`

    res.json({
      id: product.id,
      type: product.type,
      name: metadata.name,
      description: metadata.description,
      image: media?.image ?? null,
      animation: media?.animation ?? null,
    });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? 'Failed to fetch product' });
  }
});

export default router;
```

---

### B) React (browser) – simple thumbnail component

```tsx
// file: components/ProductThumbnail.tsx
import React, { useEffect, useState } from 'react';
import { createClient } from '@manifoldxyz/client-sdk';

const client = createClient();

export function ProductThumbnail({ instanceIdOrUrl }: { instanceIdOrUrl: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const product = await client.getProduct(instanceIdOrUrl);
      const media = await product.getPreviewMedia();
      if (!cancelled) setSrc(media?.image ?? media?.imagePreview ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceIdOrUrl]);

  if (!src) return null;
  return <img src={src} alt="Product preview" style={{ maxWidth: 320, borderRadius: 12 }} />;
}
```

---

## 4) Multi-App Support (Edition / Burn-Redeem / Blind Mint)

### A) Node.js (server only) – generalized purchase helper

```tsx
// file: lib/purchaseMultiApp.ts
import { createClient, AppType } from '@manifoldxyz/client-sdk';
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, base, optimism } from 'viem/chains';

type MultiOptions = {
  quantity?: number;
  redemptionCode?: string; // edition only
  tokensToBurn?: Array<{
    contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
    tokenId: string;
  }>; // burn-redeem only
  networkId?: number; // optional: force execution network
};

export async function purchaseMultiAppServer(params: {
  idOrUrl: string;
  rpcByChain: Record<number, string>;
  privateKey: `0x${string}`;
  options?: MultiOptions;
}) {
  const { idOrUrl, rpcByChain, privateKey, options } = params;

  const client = createClient({ httpRPCs: rpcByChain });
  const acct = privateKeyToAccount(privateKey);

  // pick chain object by networkId if you want stronger typing; here we default mainnet
  const walletClient = createWalletClient({
    account: acct,
    chain: mainnet,
    transport: http(rpcByChain[1]),
  });
  const account = viemAdapter.signer.fromViem(walletClient);

  const product = await client.getProduct(idOrUrl);
  const qty = options?.quantity ?? 1;

  let payload: any = undefined;

  switch (product.type as AppType) {
    case AppType.Edition:
      if (options?.redemptionCode)
        payload = { redemptionCode: options.redemptionCode, quantity: qty };
      else payload = { quantity: qty };
      break;

    case AppType.BurnRedeem:
      if (!options?.tokensToBurn || options.tokensToBurn.length === 0) {
        throw new Error('Burn/Redeem requires tokensToBurn.');
      }
      payload = { tokens: options.tokensToBurn };
      break;

    case AppType.BlindMint:
      // usually quantity-only; payload may be undefined
      payload = undefined;
      break;

    default:
      throw new Error(`Unsupported app type: ${product.type}`);
  }

  const prepared = await product.preparePurchase({
    address: account.address,
    payload,
    networkId: options?.networkId,
  });

  const order = await product.purchase({
    account,
    preparedPurchase: prepared,
    callbacks: {
      onProgress: (p) => console.log(`[${p.status}] step=${p.currentStep?.name ?? '-'}`),
    },
  });

  return order;
}
```

---

### B) React (browser) – thin UI wrapper

```tsx
// file: components/MultiAppPurchaseButton.tsx
import React, { useState } from 'react';
import { createClient, AppType } from '@manifoldxyz/client-sdk';
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { useConnectorClient } from 'wagmi';

const client = createClient();

export function MultiAppPurchaseButton({
  idOrUrl,
  quantity = 1,
  redemptionCode, // used for edition when needed
  tokensToBurn, // used for burn-redeem
  forceNetworkId, // optional cross-chain (relayer-enabled setups)
}: {
  idOrUrl: string;
  quantity?: number;
  redemptionCode?: string;
  tokensToBurn?: Array<{
    contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
    tokenId: string;
  }>;
  forceNetworkId?: number;
}) {
  const { data: walletClient } = useConnectorClient();
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    if (!walletClient) return setMsg('Connect a wallet first');
    setMsg('Preparing…');

    try {
      const account = viemAdapter.signer.fromViem(walletClient);
      const product = await client.getProduct(idOrUrl);

      let payload: any = undefined;

      switch (product.type as AppType) {
        case AppType.Edition:
          payload = redemptionCode ? { redemptionCode, quantity } : { quantity };
          break;
        case AppType.BurnRedeem:
          if (!tokensToBurn?.length) throw new Error('Provide tokensToBurn for Burn/Redeem');
          payload = { tokens: tokensToBurn };
          break;
        case AppType.BlindMint:
          payload = undefined;
          break;
        default:
          throw new Error(`Unsupported app type: ${product.type}`);
      }

      const prepared = await product.preparePurchase({
        address: account.address,
        payload,
        networkId: forceNetworkId,
        gasBuffer: { multiplier: 0.25 },
      });

      setMsg(`Total: ${prepared.cost.total.formatted}. Submitting…`);

      const order = await product.purchase({
        account,
        preparedPurchase: prepared,
        callbacks: { onProgress: (p) => setMsg(`Status: ${p.status}`) },
      });

      const last = order.receipts.at(-1);
      setMsg(`Success! ${last?.txHash ?? ''}`);
    } catch (e: any) {
      setMsg(e?.message ?? 'Purchase failed');
    }
  }

  return (
    <div>
      <button onClick={onClick}>Buy</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
```

---

---

## Data Types Reference

- **Product**
  | Field       | Type                                                                                                                       | Required | Description                        |
  | ----------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- | ------------- | ------------ |
  | **id**      | string                                                                                                                     | ✅       | Instance ID                        |
  | type        | [AppType](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)      | ✅       | `edition`                          | `burn-redeem` | `blind-mint` |
  | data        | [InstanceData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Product offchain data              |
  | previewData | [PreviewData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)  | ✅       | Return preview data of the product |
- EditionProduct | BurnRedeemProduct | BlindMintProduct → Product
  | Field                                                                                                                             | Type                                                                                                                                                                                                                                          | Required                                                                                                                            | Description                                                                                                                        |
  | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------- |
  | onchainData                                                                                                                       | [EditionOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)                                                                                                              | [BurnRedeemOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BlindMintOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌  | Product onchain data |
  | [**preparePurchase**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | function                                                                                                                                                                                                                                      | ✅                                                                                                                                  | Simulates purchase to check eligibility and get total cost.                                                                        |
  | [**purchase**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)        | function                                                                                                                                                                                                                                      | ✅                                                                                                                                  | Make a purchase on the product                                                                                                     |
  | [fetchOnchainData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)    | function                                                                                                                                                                                                                                      | ✅                                                                                                                                  | Fetch on-chain data for this product                                                                                               |
  | [getAllocations](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)      | function                                                                                                                                                                                                                                      | ✅                                                                                                                                  | Check product eligibility quantity for a wallet address                                                                            |
  | [getInventory](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)        | [ProductInventory](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)                                                                                                                | ✅                                                                                                                                  | Get inventory of the product                                                                                                       |
  | [getRules](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)            | [ProductRule](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)                                                                                                                     | ✅                                                                                                                                  | Product specific rules                                                                                                             |
  | [getProvenance](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)       | [](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[ProductProvenance](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅                                                                                                                                  | Product provenance info                                                                                                            |
- PreviewData
  | Field         | Type                                                                                                                   | Required | Description                          |
  | ------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ |
  | title         | string                                                                                                                 | ❌       | Product Title                        |
  | description   | string                                                                                                                 | ❌       | Product description                  |
  | contract      | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌       | Contract associated with the product |
  | thumbnail     | string                                                                                                                 | ❌       | Thumbnail for the product            |
  | payoutAddress | string                                                                                                                 | ❌       | Payout wallet address of the product |
  | network       | number                                                                                                                 | ❌       | Network the product is on            |
  | startDate     | Date                                                                                                                   | ❌       | Start date for the product           |
  | endDate       | Date                                                                                                                   | ❌       | End date for the product             |
  | price         | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)    | ❌       | Price of the product                 |
- AppType
  | Field       | Type   | Required | Description          |
  | ----------- | ------ | -------- | -------------------- |
  | Edition     | string | ✅       | Edition app type     |
  | Burn Redeem | string | ✅       | Burn Redeem app type |
  | Blind Mint  | string | ✅       | Blind Mint app type  |
- ProductMetadata
  | Field       | Type   | Required | Description         |
  | ----------- | ------ | -------- | ------------------- |
  | name        | string | ✅       | Product name        |
  | description | string | ❌       | Product description |
- Media
  | Field            | Type   | Required | Description                          |
  | ---------------- | ------ | -------- | ------------------------------------ |
  | image            | string | ✅       | Image url of the product             |
  | imagePreview     | string | ❌       | Preview image url of the product     |
  | animation        | string | ❌       | Animation url of the product         |
  | animationPreview | string | ❌       | Animation preview url of the product |
- Asset
  | Field       | Type                                                                                                                | Required | Description                  |
  | ----------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
  | name        | string                                                                                                              | ✅       |                              |
  | description | string                                                                                                              | ❌       |                              |
  | attributes  | object                                                                                                              | ❌       | Extra attributes (key/value) |
  | media       | [Media](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌       | Preview animation URL        |
- ProductProvenance
  | Field     | Type                                                                                                                    | Required | Description                                 |
  | --------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
  | creator   | [Workspace](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Media url of the product                    |
  | contract  | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)  | ❌       | Link to the contract related to the product |
  | token     | [Token](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)     | ❌       | Link to the token related to the product    |
  | networkId | number                                                                                                                  | ❌       | Network ID of the product (if applicable)   |
- Inventory
  | Field          | Type   | Required | Description                                     |
  | -------------- | ------ | -------- | ----------------------------------------------- |
  | totalSupply    | number | ✅       | Total product supply (-1 means infinite supply) |
  | totalPurchased | number | ✅       | Total product purchased                         |
- ProductRule
  | Field                   | Type   | Required | Description                                     |
  | ----------------------- | ------ | -------- | ----------------------------------------------- | ------ | ------------------ |
  | startDate               | Date   | ❌       | Start date (if not provided, start immediately) |
  | endDate                 | Date   | ❌       | End date (not provided, never ends)             |
  | **audienceRestriction** | enum   | ✅       | `allowlist`                                     | `none` | `redemption-codes` |
  | maxPerWallet            | number | ❌       | Number of allowed purchased per wallet          |
- TokenRequirement
  | Field         | Type                                                                                                                                 | Required | Description                 |
  | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------- |
  | items         | [TokenItemRequirement](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ✅       | List of eligible token sets |
  | requiredCount | number                                                                                                                               | ✅       | Number of tokens required   |
- Workspace
  | Field   | Type   | Required | Description                                  |
  | ------- | ------ | -------- | -------------------------------------------- |
  | id      | string | ✅       | identifier of the workspace                  |
  | slug    | string | ✅       | Slug of workspace                            |
  | address | string | ✅       | The Ethereum wallet address of the workspace |
  | name    | string | ❌       | Name of workspace                            |
- Identity
  | Field             | Type   | Required | Description                 |
  | ----------------- | ------ | -------- | --------------------------- |
  | walletAddress     | string | ✅       | The Ethereum wallet address |
  | twitterUsername   | string | ❌       | The user X username         |
  | instagramUsername | string | ❌       | The user instagram username |
- Contract
  | Field     | Type                                                                                                                   |     | Description                       |
  | --------- | ---------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------- | -------- |
  | networkId | number                                                                                                                 | ✅  | The Ethereum Network              |
  | address   | string                                                                                                                 | ✅  | The contract address              |
  | explorer  | [Explorer](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅  | The explorer urls of the contract |
  | name      | string                                                                                                                 |     |                                   |
  | symbol    | string                                                                                                                 |     |                                   |
  | spec      | enum                                                                                                                   | ✅  | `erc1155`                         | `erc721` |
- Token
  | Field    | Type                                                                                                                   |     | Description                    |
  | -------- | ---------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------ |
  | contract | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅  |                                |
  | tokenId  | string                                                                                                                 | ✅  | The token ID                   |
  | explorer | [Explorer](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅  | The explorer urls of the token |
- Money
  | Field        | Type   | Required | Description                                                                  |
  | ------------ | ------ | -------- | ---------------------------------------------------------------------------- | ------ | --- |
  | value        | BigInt | ✅       | The raw amount                                                               |
  | decimals     | number | ✅       | Number of decimal places for the currency                                    |
  | currency     | string | ✅       | `ETH`                                                                        | `USDC` | …   |
  | erc20        | string | ✅       | “0x0000000000000000000000000000000000000000” for native ETH or ERC20 address |
  | symbol       | string | ✅       | `ETH`                                                                        |
  | name         | string | ✅       | Name of the currency                                                         |
  | formatted    | string | ✅       | The formatted amount (Ex: “0.1 ETH” )                                        |
  | formattedUSD | string | ✅       | The formatted amount in USD                                                  |
- Explorers
  | Field        | Type   | Required | Description                            |
  | ------------ | ------ | -------- | -------------------------------------- |
  | etherscanUrl | string | ✅       | Link to Etherscan Explorer hosted site |
  | manifoldUrl  | string | ❌       | Link to Manifold hosted site           |
  | openseaUrl   | string | ❌       | Link to Opensea hosted site            |
- AccountProvider
  | Field             | Type     | Required | Description                                        |
  | ----------------- | -------- | -------- | -------------------------------------------------- |
  | address           | string   | ✅       | The Ethereum Address                               |
  | sendTransaction() | function | ✅       | Send the given transaction to the blockchain       |
  | signMessage()     | function | ✅       | Sign the given message and return the signature    |
  | signTypedData()   | function | ✅       | Sign the given typed data and return the signature |
  | getNetworkId      | number   | ✅       | Currently connected networkId                      |
  | switchNetwork     | function | ✅       | Switch to target network                           |
- Order
  | Field     | Type                                                                                                                      | Required | Description                     |
  | --------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- | ----------- | ----------- | -------- |
  | receipts  | [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]   | ✅       | The receipt of the transactions |
  | status    | enum                                                                                                                      | ✅       | `pending`                       | `confirmed` | `cancelled` | `failed` |
  | buyer     | [Identity](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)    | ✅       | The buyer of the product        |
  | **total** | [Cost](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)        | ✅       | Total cost of the product       |
  | items     | [OrderItem](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ❌       | Purchased items                 |
- OrderItem
  | Field     | Type                                                                                                                | Required | Description               |
  | --------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | ----------- | ----------- | -------- |
  | status    | enum                                                                                                                | ✅       | `pending`                 | `confirmed` | `cancelled` | `failed` |
  | **total** | [Cost](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)  | ✅       | Total cost of the product |
  | token     | [Token](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ❌       | The minted token          |
- Receipt
  | Field     | Type                                                                                                                          | Required | Description                                                    |
  | --------- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
  | networkId | number                                                                                                                        | ✅       | Network ID where the order was placed                          |
  | txHash    | string                                                                                                                        | ✅       | The transaction hash of the order                              |
  | step      | [TransactionStep](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Corresponding transaction step returned from `preparePurchase` |
  | txReceipt | [**TransactionReceipt**](https://docs.ethers.org/v5/api/providers/types/#providers-TransactionReceipt)                        | ❌       | The transaction receipt                                        |
- Cost
  | Field    | Type                                                                                                                | Required | Description                   |
  | -------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------- |
  | total    | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Total cost including all fees |
  | subtotal | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Cost excluding fees           |
  | fees     | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Platform fees                 |
- PreparedPurchase
  | Field               | Type                                                                                                                            | Required | Description                                                            |
  | ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
  | **cost**            | [Cost](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)              | ✅       | Purchase cost                                                          |
  | **transactionData** | [TransactionData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)   | ✅       | Transaction to execute                                                 |
  | steps               | [TransactionStep](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ✅       | Manual steps that need to be executed in order (For manual executions) |
- TransactionData
  | Field           | Type   | Required | Description            |
  | --------------- | ------ | -------- | ---------------------- |
  | contractAddress | string | ✅       | Target contract        |
  | transactionData | string | ✅       | Encoded calldata       |
  | gasEstimate     | BigInt | ✅       | Gas limit              |
  | networkId       | number | ✅       | Network of transaction |
- TransactionStep
  | Field                                                                                                                 | Type     | Required | Description        |
  | --------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------ | --------- |
  | id                                                                                                                    | string   | ✅       | Step ID            |
  | name                                                                                                                  | string   | ✅       | Step name          |
  | type                                                                                                                  | enum     | ✅       | `mint`             | `approve` |
  | [execute](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | function | ❌       | Execution function |
  | description                                                                                                           | BigInt   | ❌       | Step description   |
- TransactionCallbacks
  | Field                                      | Type     | Required | Description                         |
  | ------------------------------------------ | -------- | -------- | ----------------------------------- |
  | onProgress (progress: TransactionProgress) | function | ❌       | Called when purchase status changes |
- TransactionProgress
  | Field           | Type                                                                                                                            | Required | Description                                                                                                                                                                                              |
  | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
  | status          | enum                                                                                                                            | ✅       | `pending-approval`                                                                                                                                                                                       | `confirming` | `completed` |
  | steps           | [TransactionStep](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ✅       | This is the full steps object as it’s returned by the api and enhanced with some additional properties on the client. Notably the step status has been updated as well as any errors have been attached. |
  | **currentStep** | [TransactionStep](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)   | ✅       | We’ve conveniently pinpointed the current step that’s being processed and made it accessible in this callback.                                                                                           |
  | receipts        | [Receipt](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[]         | ❌       | A full list of all the transaction hashes that have been processed so far during execution.                                                                                                              |
  | data            | object                                                                                                                          | ❌       | Additional context data                                                                                                                                                                                  |
- EditionPayload
  | Field          | Type   | Required | Description                                                                                                  |
  | -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------ |
  | quantity       | number | ✅       | Amount of product to purchase                                                                                |
  | redemptionCode | string | ❌       | For Edition product with claim codes ([see more](https://help.manifold.xyz/en/articles/9590408-claim-codes)) |
- BlindMintPayload
  | Field    | Type   | Required | Description                   |
  | -------- | ------ | -------- | ----------------------------- |
  | quantity | number | ✅       | Amount of product to purchase |
- BurnRedeemPayload
  | Field  | Type                                                                                                                  | Required | Description                                                                                                  |
  | ------ | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
  | tokens | [Token](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ❌       | For Edition product with claim codes ([see more](https://help.manifold.xyz/en/articles/9590408-claim-codes)) |
- InstanceData
  | Field          | Type                                                                                                                            | Required                                                                                                                           | Description                                                                                                                       |
  | -------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------- |
  | **id**         | string                                                                                                                          | ✅                                                                                                                                 | Unique identifier (instance ID)                                                                                                   |
  | **creator**    | [Workspace](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)         | ✅                                                                                                                                 | Workspace info of the creator                                                                                                     |
  | **publicData** | [EditionPublicData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BurnRedeemPublicData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | [BlindMintPublicData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅  | Public page content and primary media |
  | appId          | number                                                                                                                          | ✅                                                                                                                                 | The appId of the product                                                                                                          |
  | appName        | string                                                                                                                          | ✅                                                                                                                                 | The app name of the product                                                                                                       |
- EditionOnchainData
  | Field           | Type                                                                                                                | Required | Description                 |
  | --------------- | ------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------- | ----------- | ---------------- |
  | totalSupply     | number                                                                                                              | ✅       | Total supply of the product |
  | totalMinted     | number                                                                                                              | ✅       | Total token minted          |
  | walletMax       | number                                                                                                              | ✅       | Max tokens per wallet       |
  | startDate       | Date                                                                                                                | ✅       | Start drop date             |
  | endDate         | Date                                                                                                                | ✅       | End drop date               |
  | audienceType    | enum                                                                                                                | ✅       | `None`                      | `Allowlist` | `RedemptionCode` |
  | cost            | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Cost of the product         |
  | paymentReceiver | string                                                                                                              | ✅       | Receiver of mint payment    |
- BurnRedeemOnchainData
  | Field           | Type                                                                                                                      | Required | Description                 |
  | --------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------- | ----------- | ---------------- |
  | totalSupply     | number                                                                                                                    | ✅       | Total supply of the product |
  | **totalMinted** | number                                                                                                                    | ✅       | Total token minted          |
  | walletMax       | number                                                                                                                    | ✅       | Max tokens per wallet       |
  | startDate       | Date                                                                                                                      | ✅       | Start drop date             |
  | endDate         | Date                                                                                                                      | ✅       | End drop date               |
  | audiencetype    | enum                                                                                                                      | ✅       | `None`                      | `Allowlist` | `RedemptionCode` |
  | cost            | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)       | ✅       | Cost of the product         |
  | paymentReceiver | string                                                                                                                    | ✅       | Receiver of mint payment    |
  | burnSet         | [BurnSetData](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Burn rules                  |
- BlindMintOnchainData
  | Field           | Type                                                                                                                 | Required | Description                            |
  | --------------- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------- | ----------- | ---------------- |
  | totalSupply     | number                                                                                                               | ✅       | Total supply of the product            |
  | **totalMinted** | number                                                                                                               | ✅       | Total token minted                     |
  | walletMax       | number                                                                                                               | ✅       | Max tokens per wallet                  |
  | startDate       | Date                                                                                                                 | ✅       | Start drop date                        |
  | endDate         | Date                                                                                                                 | ✅       | End drop date                          |
  | audiencetype    | enum                                                                                                                 | ✅       | `None`                                 | `Allowlist` | `RedemptionCode` |
  | cost            | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)  | ✅       | Cost of the product                    |
  | paymentReceiver | string                                                                                                               | ✅       | Receiver of mint payment               |
  | tokenVariations | [n](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)umber | ✅       | Number of asset variations             |
  | startingTokenId | number                                                                                                               | ✅       | The starting tokenId of the asset pool |
- EditionPublicData
  | Field            | Type                                                                                                                   | Required | Description                      |
  | ---------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
  | **title**        | string                                                                                                                 | ✅       | Title of the product             |
  | description      | string                                                                                                                 | ❌       | Description of the product       |
  | **asset**        | [Asset](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)    | ✅       | Primary media of the product     |
  | network          | number                                                                                                                 | ✅       | The network the product is on    |
  | contract         | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | The contract of the token        |
  | extensionAddress | string                                                                                                                 | ✅       | Extension address of the product |
- BurnRedeemPublicData
  | Field            | Type                                                                                                                   | Required | Description                      |
  | ---------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
  | redeemAsset      | [Asset](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)    | ✅       | The redeem asset                 |
  | network          | number                                                                                                                 | ✅       | The network the product is on    |
  | redeemContract   | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | The redeem contract              |
  | extensionAddress | string                                                                                                                 | ✅       | Extension address of the product |
- BurnSetData
  | Field         | Type                                                                                                                                 | Required | Description                 |
  | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------- |
  | items         | [TokenItemRequirement](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | ✅       | List of eligible token sets |
  | requiredCount | number                                                                                                                               | ✅       | Number of tokens required   |
- TokenItemRequirement
  | Field           | Type     | Required | Description                     |
  | --------------- | -------- | -------- | ------------------------------- | -------------- | ------------ | ----- |
  | quantity        | number   | ✅       | Required quantity of tokens     |
  | burnSpec        | enum     | ✅       | `manifold`                      | `openZeppelin` | `none`       |
  | tokenSpec       | enum     | ✅       | `erc721`                        | `erc1155`      |
  | tokenIds        | string[] | ❌       | list of required tokenIds       |
  | maxTokenId      | string   | ❌       | Max tokenId range               |
  | minTokenId      | string   | ❌       | Min tokenId range               |
  | contractAddress | string   | ✅       | The required contract address   |
  | merkleRoot      | string   | ❌       | For allowlist token requirement |
  | validationType  | enum     | ✅       | `contract`                      | `range`        | `merkleTree` | `any` |
- BlindMintPublicData
  | Field             | Type                                                                                                                               | Required | Description                        |
  | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
  | **title**         | string                                                                                                                             | ✅       | Title of the product               |
  | description       | string                                                                                                                             | ❌       | Description of the product         |
  | network           | number                                                                                                                             | ✅       | The network the product is on      |
  | contract          | [Contract](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)             | ✅       | The contract of the token          |
  | extensionAddress  | string                                                                                                                             | ✅       | Extension address of the product   |
  | tierProbabilities | [GachaTierProbability](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Tier and probability of each group |
  | pool              | [GachaPool](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)            | ✅       | Pool of assets                     |
- GachaTierProbability
  | Field   | Type     | Required | Description                                       |
  | ------- | -------- | -------- | ------------------------------------------------- |
  | group   | string   | ✅       | Name of the tier group                            |
  | indices | number[] | ✅       | Asset indices belonging to the group              |
  | rate    | number   |          | Probability chance in basis points (10000 = 100%) |
- GachaPool
  | Field    | Type                                                                                                                | Required | Description                    |
  | -------- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------ |
  | index    | number                                                                                                              | ✅       | Index of the asset in the pool |
  | metadata | [Asset](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21) | ✅       | Asset metadata                 |

---

## Error Types Reference

- Eligibility
  | Field        | Type                                                                                                                  | Description                                                                 |
  | ------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
  | reason       | string                                                                                                                | Why not eligible                                                            |
  | missingFunds | [Money](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)[] | Missing required funds to purchase (Could be in native ETH or ERC20 tokens) |

### ClientSDKError

Base error class with typed error codes.

| Field    | Type   | Required |
| -------- | ------ | -------- |
| code     | number | ✅       |
| message  | string | ❌       |
| metadata | object | ❌       |

```jsx
try {
  const product = await client.getProduct('id');
} catch (error) {
  if (error instanceof StorefrontSDKError) {
    console.log('Code:', error.code);
    console.log('Message:', error.message);
  }
}
```

### Error Codes

| Code                  | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Network Errors**    |                                                                                                                     |
| UNSUPPORTED_NETWORK   | Unsupported network                                                                                                 |
| **Data Errors**       |                                                                                                                     |
| NOT_FOUND             | Resource not found                                                                                                  |
| INVALID_INPUT         | Invalid parameters                                                                                                  |
| MISSING_TOKENS        | Missing required tokens to purchase                                                                                 |
| UNSUPPORTED_TYPE      | Unsupported product type (Only support the following types: AppType.Edition, AppType.BurnRedeem, AppType.BlindMInt) |
| **Blockchain Errors** |                                                                                                                     |
| ESTIMATION_FAILED     | Can’t estimate gas                                                                                                  |
| TRANSACTION_FAILED    | Transaction reverted                                                                                                |
| LEDGER_ERROR          | Ledger wallet error                                                                                                 |
| TRANSACTION_REVERTED  | Transaction revert                                                                                                  |
| TRANSACTION_REJECTED  | User rejected                                                                                                       |
| INSUFFICIENT_FUNDS    | Wallet does not have the required funds                                                                             |
| **Permission Errors** |                                                                                                                     |
| NOT_ELIGIBLE          | Not eligible to purchase                                                                                            |
| SOLD_OUT              | Product sold out                                                                                                    |
| LIMIT_REACHED         | Limit reach for wallet                                                                                              |
| ENDED                 | Product not available anymore                                                                                       |
| NOT_STARTED           | Not started, come back late                                                                                         |

---

---

## 🌐 Supported Networks

### Mainnet Networks

| Network  | ID   | Name          |
| -------- | ---- | ------------- |
| Ethereum | 1    | ETH Mainnet   |
| Base     | 8453 | BASE          |
| Optimism | 10   | OP Mainnet    |
| Shape    | 360  | Shape Mainnet |

### Testnet Networks

| Network | ID       | Name        |
| ------- | -------- | ----------- |
| Sepolia | 11155111 | ETH Testnet |

---

## ❓ FAQs

- **How do I get an instance ID?**
  Instance IDs are provided when you create a product in Manifold Studio:
  1. Go to studio.manifold.xyz
  2. Create your product
  3. Find the ID in the URL
  4. Example: `https://manifold.xyz/@meta8eth/id/4150231280` → ID is `4150231280`
- **How do I get my workspace ID?**
  Workspace IDs is located on the top right corner of your [studio](https://studio.manifold.xyz/)
- **Do I need an API key?**
  No! The SDK works without any API keys for public endpoints. Just install and use.
- **Which web3 libraries are supported?**
  - Viem
  - EthersV5
  - EthersV6
- **How do I handle different payment tokens?**
  The SDK automatically detects payment tokens and validate if the purchasing wallet has sufficient tokens for purchase
  The SDK will handle ERC20 token approval as part of the `product.purchase` call
- **Can I customize gas settings?**
  Yes, you can specify gas buffer using a fixed or multiplier number
  ```jsx
  const preparedPurchase = await product.**preparePurchase**({
  	account,
    quantity: 1,
    gasBuffer: {
     multiplier: 0.25 // 25% gas buffer
    }
  });
  ```

---

## 📞 Support

### Get Help

**Twitter**: [@manifoldxyz](https://twitter.com/manifoldxyz)

### Resources

- Website: https://manifold.xyz/
- **Manifold Studio**: [studio.manifold.xyz](https://studio.manifold.xyz/)
- **Smart Contracts**: https://github.com/manifoldxyz/creator-core-extensions-solidity
- Help Desk: https://help.manifold.xyz/

---

## 📖 Related Documentation

- [Minting Manifold Editions (v2)](https://www.notion.so/Minting-Manifold-Editions-v2-1fc6b055ee58807db9e1e1ea6793cfe1?pvs=21)

---

> 🏗️ Built by Manifold - Launch your own on-chain storefronts
>
> Last Updated: January 2025 • SDK Version: 1.0.0
