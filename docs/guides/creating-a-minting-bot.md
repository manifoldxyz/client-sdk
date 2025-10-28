# Creating a minting bot

The SDK can be used on the server side, enabling use cases such as running a [minting bot](https://help.manifold.xyz/en/articles/11509060-bankrbot)

## Complete Examples Available

Full working examples with comprehensive error handling, monitoring, and batch operations are available in the `/examples/server-side/` directory:

* **`blindmint-bot.ts`** - Complete BlindMint automated minting bot with retry logic
* **`edition-bot.ts`** - Complete Edition automated minting bot with monitoring capabilities

## Basic Example

```ts
import { createClient, createAccountEthers5, isBlindMintProduct, isEditionProduct } from '@manifoldxyz/client-sdk';
import { ethers } from "ethers";

const client = createClient();

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
} catch (error) {
  console.log(`Unable to execute transaction: ${error.message}`)
}
```

## Best Practices

* **Type Validation**: Use [isBlindMintProduct](../sdk/product/blind-mint/isblindmintproduct.md) or [isEditionProduct](../sdk/product/edition-product/iseditionproduct.md) for proper TypeScript typings
* **Status Checks**: Always run [getStatus](../sdk/product/common/getstatus.md) before attempting purchases
* **Error Handling**: Properly handle [ClientSDKError](../reference/clientsdkerror.md) codes
* **Gas Management**: Monitor gas prices and set appropriate limits
* **Retry Logic**: Implement retry mechanisms for transient failures
* **Security**: Never commit private keys, use environment variables



## Environment Configuration

```env
# Required
WALLET_PRIVATE_KEY=your_private_key_here
INSTANCE_ID=your_product_instance_id

# Optional
MINT_QUANTITY=1
PROMO_CODE=optional_promo_code
MAX_RETRIES=3
```

## Resources

* [**Complete BlindMint Bot Example**](../../examples/server-side/blindmint-bot.ts) - Full implementation with pools, tiers, and reveal handling
* [**Complete Edition Bot Example**](../../examples/server-side/edition-bot.ts) - Full implementation with monitoring and promo codes
* [**Server-Side Examples README**](../../examples/server-side/) - Setup and deployment guide
* See method documentation for detailed error descriptions
