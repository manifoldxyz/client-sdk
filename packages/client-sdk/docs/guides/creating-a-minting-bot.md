# Creating a minting bot

The SDK can be used on the server side, enabling use cases such as running a [minting bot](https://help.manifold.xyz/en/articles/11509060-bankrbot)

## Example Scripts

Two ready-to-run bots live in this repository:

- **Edition**: `examples/edition/minting-bot`
- **Blind Mint**: `examples/blindmint/minting-bot`

Each script demonstrates the most direct path to minting—`preparePurchase` followed by `product.purchase()`—so you don’t have to orchestrate transaction steps manually.

### Running an example

1. From the repository root:
   ```bash
   npm install
   npm run build
   ```
2. Inside the example directory:
   ```bash
   npm install
   cp .env.example .env
   npm run start
   ```
3. Fill in the environment variables before running. Each script logs the transaction hashes returned in the order receipts.

## Basic Example

```ts
import {
  createClient,
  createAccountEthers5,
  isBlindMintProduct,
  isEditionProduct,
} from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

const client = createClient({
  httpRPCs: {
    [Number(process.env.NETWORK_ID!)]: process.env.RPC_URL!,
  },
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

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);
const account = createAccountEthers5(client, { wallet });

try {
  const prepared = await product.preparePurchase({
    address: wallet.address,
    payload: { quantity: 1 },
  });

  const order = await product.purchase({
    account,
    preparedPurchase: prepared,
  });
  console.log(
    order.status,
    order.receipts.map((r) => r.txHash),
  );
} catch (error) {
  console.log(`Unable to execute transaction: ${(error as Error).message}`);
}
```

## Best Practices

- **Type Validation**: Use [isBlindMintProduct](../sdk/product/blind-mint/isblindmintproduct.md) or [isEditionProduct](../sdk/product/edition-product/iseditionproduct.md) for proper TypeScript typings
- **Status Checks**: Always run [getStatus](../sdk/product/common/getstatus.md) before attempting purchases
- **Error Handling**: Properly handle [ClientSDKError](../reference/clientsdkerror.md) codes
- **Gas Management**: Monitor gas prices and set appropriate limits
- **Retry Logic**: Implement retry mechanisms for transient failures
- **Security**: Never commit private keys, use environment variables

## Environment Configuration

```env
# Required
WALLET_PRIVATE_KEY=your_private_key_here
INSTANCE_ID=your_product_instance_id
NETWORK_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# RPC Endpoints

# Optional
MINT_QUANTITY=1
PROMO_CODE=optional_promo_code
MAX_RETRIES=3
```

## Resources

- **[Edition Minting Bot](../../examples/edition/minting-bot/README.md)** - Minimal Edition minting script
- **[Blind Minting Bot](../../examples/blindmint/minting-bot/README.md)** - Minimal Blind Mint minting script
- **[Examples Overview](../../examples/README.md)** - Directory of all SDK examples
- See method documentation for detailed error descriptions
