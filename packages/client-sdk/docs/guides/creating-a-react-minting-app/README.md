# Creating a React minting app

{% hint style="info" %}
This example uses [RainbowKit](https://rainbowkit.com/) and [Viem adapter](../../sdk/account-adapters/viem.md). The SDK also works with Ethers v5 via the [EthersV5 adapter](../../sdk/account-adapters/ethersv5.md).
{% endhint %}

The repository includes a complete example at [examples/rainbowkit-mint](https://github.com/manifoldxyz/client-sdk/tree/main/examples/rainbowkit-mint), demonstrating how to implement minting with Manifold products including [Edition Products](../../reference/editionproduct.md) and [Blind Mint Products](../../reference/blindmintproduct.md)

**Install dependencies**

```bash
cd examples/rainbowkit-mint
npm install
```

**Configure environment** – Copy `.env.example` to `.env` and set the following:

```bash
NEXT_PUBLIC_INSTANCE_ID= # Your product instance ID from Manifold Studio (Edition or Blind Mint) 
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # Obtain one at https://dashboard.reown.com/sign-in
```

**Run locally**

```bash
npm run dev
```

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

2. Implement Minting Logic in [MintButton.tsx](../../examples/rainbowkit-mint/src/components/MintButton.tsx)

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
  walletClient
})
```

c. Fetch the product and verify its type

```typescript
const product = await client.getProduct(INSTANCE_ID);
if (!isBlindMintProduct(product)) {
  throw new Error('Is not a blind mint instance')
}
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
    quantity: 1
  }
});
```

f. Execute the purchase

```typescript
const order = await product.purchase({
    account,
    preparedPurchase,
});
```

Best practices:

* **Validate product type** using [isBlindMintProduct](../../sdk/product/blind-mint/isblindmintproduct.md) or [isEditionProduct](../../sdk/product/edition-product/iseditionproduct.md) to ensure proper TypeScript typings.
* **Check status** with [getStatus](../../sdk/product/common/getstatus.md) before attempting a purchase to verify the product is active.
* **Handle** [**ClientSDKError**](../../reference/clientsdkerror.md) **codes** for common cases such as ineligibility, sold-out items, or insufficient funds.
