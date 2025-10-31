# Creating a React minting app

{% hint style="info" %}
This example uses [RainbowKit](https://rainbowkit.com/) and [Viem adapter](../../sdk/account-adapters/viem.md). The SDK also works with Ethers v5 via the [EthersV5 adapter](../../sdk/account-adapters/ethersv5.md).
{% endhint %}

The repository includes a complete example at [examples/rainbowkit-mint](https://github.com/manifoldxyz/client-sdk/tree/main/packages/examples/edition/rainbowkit-mint), demonstrating how to implement minting with Manifold products including [Edition Products](../../reference/editionproduct.md)

**Overview**

The edition RainbowKit example showcases how to:

* Connect wallets with RainbowKit + wagmi
* Mint [Edition products](../../reference/editionproduct.md) through the Manifold Client SDK
* Run on Next.js 14 with the App Router and TypeScript
* Display mint progress, costs, and errors in the UI
* Complete example at [examples/rainbowkit-mint](https://github.com/manifoldxyz/client-sdk/tree/main/packages/examples/edition/rainbowkit-mint)

**Quick start**

1.  **Install workspace dependencies**

    ```bash
    pnpm install
    ```
2.  **Create environment variables**

    ```bash
    cp .env.example \
       env.local
    ```

    Fill in:

    ```env
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
    NEXT_PUBLIC_INSTANCE_ID=your_edition_instance_id
    ```

    `NEXT_PUBLIC_INSTANCE_ID` must point to an Edition product you published in Manifold Studio.\
    `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is optional but required if you want to support [WalletConnect](https://dashboard.reown.com/sign-in) wallets.
3. **Launch the example**

```bash
pnpm dev
```

Visit `http://localhost:3000` and connect a wallet with RainbowKit’s `ConnectButton`.

**Key implementation steps**

1. Follow [RainbowKit setup instructions](https://rainbowkit.com/docs/installation)

Ensure you have the [ConnectButton](https://rainbowkit.com/docs/connect-button) component on your page.\
This handles wallet connections, which are required to create an [Account](../../reference/account.md) that the SDK uses for checks and transaction execution.

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <main>
      <div>
        <ConnectButton />
      </div>
    </main>
  );
}
```

2. Implement Minting Logic in [MintButton.tsx](../../../../examples/edition/rainbowkit-mint/src/components/MintButton.tsx)

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MintButton } from '@/components/MintButton';

export default function Home() {
  return (
    <main>
      <h1>
        Manifold SDK + RainbowKit
      </h1>

      <div>
        <ConnectButton />
        <MintButton />
      </div>
    </main>
  );
}
```

**Core Steps**

a. Create a [Manifold Client](../../sdk/manifold-client/)

```typescript
const client = createClient();
```

b. Create an [Account](../../reference/account.md) representing the connected user.

```typescript
const account = createAccountViem({
  walletClient,
});
```

c. Fetch the product and verify its type

```typescript
const product = await client.getProduct(INSTANCE_ID) as EditionProduct;
```

d. Check the product status to ensure it’s still active

```typescript
const productStatus = await product.getStatus();
if (productStatus !== 'active') {
  throw new Error(`Product is ${productStatus}`);
}
```

e. Prepare the purchase by specifying the amount

```typescript
const preparedPurchase = await product.preparePurchase({
  address: address,
  payload: {
    quantity: 1,
  },
});
```

f. Execute the purchase

```typescript
const order = await product.purchase({
  account,
  preparedPurchase,
});
```

Key points:

* `createAccountViem` wraps wagmi’s wallet client so the SDK can sign and send transactions on the user’s behalf.
* `preparePurchase` performs all eligibility checks (allowlists, supply, promo codes) and returns the total cost breakdown. Supply the same `account` so balance checks run against the connected wallet.
* `purchase` executes the transaction sequence (ERC-20 approvals, mint, etc.) and returns a [Receipt](../../reference/receipt.md) with the final transaction hash and minted tokens.

**Display token media and on-chain stats**

You can enrich the UI with product art and live supply data directly from the SDK:

```typescript
const product = await client.getProduct(instanceId);

// Off-chain media and metadata (safe to render immediately)
const { asset, title, contract } = product.data.publicData;
const imageUrl = asset.image ?? asset.imagePreview;
const animationUrl = asset.animation ?? asset.animationPreview;

// Fetch on-chain data once (cost, supply, timing)
const onchainData = await product.fetchOnchainData();
const { totalMinted, totalSupply, startDate, endDate, cost } = onchainData;

return (
  <section>
    {imageUrl && <img src={imageUrl} alt={title} />}
    {animationUrl && (
      <video src={animationUrl} autoPlay loop muted playsInline />
    )}

    <dl>
      <dt>Price</dt>
      <dd>{cost.formatted}</dd>
      <dt>Minted</dt>
      <dd>{totalMinted}</dd>
      <dt>Total supply</dt>
      <dd>{totalSupply === -1 ? 'Unlimited' : totalSupply}</dd>
      <dt>Start date</dt>
      <dd>{startDate?.toLocaleString() ?? 'TBD'}</dd>
      <dt>End date</dt>
      <dd>{endDate?.toLocaleString() ?? 'Open'}</dd>
      <dt>Contract</dt>
      <dd>{contract.address}</dd>
    </dl>
  </section>
);
```

Best practices:

* **Check status** with [getStatus](../../sdk/product/common/getstatus.md) before attempting a purchase to verify the product is active.
* **Handle** [**ClientSDKError**](../../reference/clientsdkerror.md) **codes** for common cases such as ineligibility, sold-out items, or insufficient funds.
* Call [`getAllocations`](../../sdk/product/common/getallocations.md) when you need to show remaining allowlist spots.
* Inspect [`Receipt.order`](../../reference/order.md) to display which tokens were minted after `purchase`.
