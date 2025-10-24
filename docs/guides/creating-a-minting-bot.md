# Creating a minting bot

The SDK can be used on the server side, enabling use cases such as running a [minting bot ](https://help.manifold.xyz/en/articles/11509060-bankrbot)

```ts
import { createClient, createAccountEthers5, isBlindMintProduct, isEditionProduct } from '@manifoldxyz/client-sdk';
import { ethers } from "ethers";

const client = createClient({
  httpRPCs: { 1: process.env.MAINNET_RPC! },
});

const product = await client.getProduct('INSTANCE_ID');

// Check product status first
const productStatus = await product.getStatus();
if (productStatus !== 'active') {
  throw new Error(`Product is ${productStatus}`);
}

// Handle different product types
if (isEditionProduct(product)) {
  console.log('Edition product detected - NFT drop with fixed/open editions');
} else if (isBlindMintProduct(product)) {
  console.log('Blind Mint product detected - mystery/gacha-style mint');
} else {
  throw new Error('Unsupported product type');
}

const wallet = new ethers.Wallet(<wallet-private-key>)
const account = createAccountEthers5(client, provider: { wallet })
try {
  const prepared = await product.preparePurchase({
    address: wallet.address,
    payload: { quantity: 1 },
  });
  
  const order = await product.purchase({
    account,
    preparedPurchase: prepared,
  });
  console.log(order.status, order.receipts.map((r) => r.txHash));
catch (error) {
  console.log(`Unable to execute transaction: ${error.message}`)
}
```

Best practices:

* Validate the product type using [isBlindMintProduct](../sdk/product/blind-mint/isblindmintproduct.md) or [isEditionProduct](../sdk/product/edition-product/iseditionproduct.md) to ensure proper TypeScript typings.
* Run [getStatus](../sdk/product/common/getstatus.md) before attempting a purchase to verify the product is available.
* Handle [ClientSDKError](../reference/clientsdkerror.md) codes for scenarios like ineligibility, sold-out items, or insufficient funds.
* See each method’s documentation for detailed error descriptions.
