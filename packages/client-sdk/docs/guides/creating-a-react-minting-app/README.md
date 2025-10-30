# Creating a React minting app

{% hint style="info" %}
This guide uses the Edition + RainbowKit example that lives at `packages/examples/edition/rainbowkit-mint`. The sample relies on the [Viem adapter](../../sdk/account-adapters/viem.md), but you can swap in the [Ethers v5 adapter](../../sdk/account-adapters/ethersv5.md) if your project already uses ethers.
{% endhint %}

## Example overview

The edition RainbowKit example showcases how to:

* Connect wallets with RainbowKit + wagmi
* Mint [Edition products](../../reference/editionproduct.md) through the Manifold Client SDK
* Run on Next.js 14 with the App Router and TypeScript
* Display mint progress, costs, and errors in the UI

You will find the source under [`packages/examples/edition/rainbowkit-mint`](../../examples/edition/rainbowkit-mint/README.md).

## Quick start

1. **Install workspace dependencies**

   ```bash
   pnpm install
   ```

2. **Create environment variables**

   ```bash
   cp packages/examples/edition/rainbowkit-mint/.env.example \
      packages/examples/edition/rainbowkit-mint/.env.local
   ```

   Fill in:

   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   NEXT_PUBLIC_INSTANCE_ID=your_edition_instance_id
   NEXT_PUBLIC_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
   NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.infura.io/v3/YOUR_KEY
   ```

   `NEXT_PUBLIC_INSTANCE_ID` must point to an Edition product you published in Manifold Studio. Custom RPC URLs are optional but help with reliability.

3. **Launch the example**

   ```bash
   pnpm --filter @manifoldxyz/example-edition-rainbowkit-example dev
   ```

   Visit `http://localhost:3000` and connect a wallet with RainbowKit’s `ConnectButton`.

## Mint flow walkthrough

The entire mint flow lives in [`src/components/MintButton.tsx`](../../examples/edition/rainbowkit-mint/src/components/MintButton.tsx):

```typescript
const client = createClient({
  httpRPCs: {
    1: process.env.NEXT_PUBLIC_RPC_URL_MAINNET ?? 'https://eth-mainnet.g.alchemy.com/v2/demo',
    8453: process.env.NEXT_PUBLIC_RPC_URL_BASE ?? 'https://base-mainnet.infura.io/v3/demo',
  },
});

const account = createAccountViem({ walletClient });

const product = await client.getProduct(instanceId);
if (!isEditionProduct(product)) {
  throw new Error('Product is not an Edition');
}

const status = await product.getStatus();
if (status !== 'active') {
  throw new Error(`Edition product is ${status}`);
}

const preparedPurchase = await product.preparePurchase({
  userAddress: address,
  payload: { quantity: 1 },
  account,
});

await product.purchase({
  account,
  preparedPurchase,
});
```

Key points:

* `createAccountViem` wraps wagmi’s wallet client so the SDK can sign and send transactions on the user’s behalf.
* Always gate functionality behind the appropriate type guard (`isEditionProduct`) before calling edition-specific helpers.
* `preparePurchase` performs all eligibility checks (allowlists, supply, promo codes) and returns the total cost breakdown. Supply the same `account` so balance checks run against the connected wallet.
* `purchase` executes the transaction sequence (ERC-20 approvals, mint, etc.) and returns a [Receipt](../../reference/receipt.md) with the final transaction hash and minted tokens.

## Display token media and on-chain stats

You can enrich the UI with product art and live supply data directly from the SDK:

```typescript
const product = await client.getProduct(instanceId);

if (!isEditionProduct(product)) {
  throw new Error('Edition product required');
}

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

Notes:

* `fetchOnchainData` populates `product.onchainData` so you can cache the result or poll carefully. The totals update as purchases succeed.
* `totalSupply` may be `-1` for open editions—treat that as “unlimited”.
* `asset` fields provide images, animations, and thumbnails. Use `imagePreview` / `animationPreview` as fallbacks when the primary media is missing.
* Combine the on-chain data with `preparedPurchase.cost` to surface real-time pricing with native and ERC-20 breakdowns.

## Best practices

* Keep the RainbowKit `ConnectButton` visible so users can easily switch wallets or networks.
* Call [`getAllocations`](../../sdk/product/common/getallocations.md) when you need to show remaining allowlist spots.
* Inspect [`Receipt.order`](../../reference/order.md) to display which tokens were minted after `purchase`.
* Handle [ClientSDKError](../../reference/clientsdkerror.md) codes to provide actionable error messages (not eligible, sold out, insufficient funds, etc.).
