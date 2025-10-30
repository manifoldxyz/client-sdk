# preparePurchase

**preparePurchase(params)** → [PreparedPurchase](../../../reference/preparedpurchase.md)

Simulates purchase to check eligibility and get total cost.

#### Parameters

| Parameter            | Type                                     | Required | Description                                                                                                           |
| -------------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| address              | string                                   | ✅        | The address making the purchase                                                                                       |
| **recipientAddress** | string                                   | ❌        | If different than `address`                                                                                           |
| **networkId**        | number                                   | ❌        | If specify, forced transaction on the network (handle funds bridging automatically), assume product network otherwise |
| payload              | {quantity: number}                       | ✅        | Specific to Edition Products. Specify quantity of purchase                                                            |
| **gasBuffer**        | object                                   | ❌        | How much additional gas to spend on the purchase                                                                      |
| gasBuffer.fixed      | BigInt                                   | ❌        | Fixed gas buffer amount                                                                                               |
| gasBuffer.multipller | number                                   | ❌        | Gas buffer by multiplier                                                                                              |
| account              | [Account](../../../reference/account.md) | ❌        | If provided, it will perform balance checks on the specified account; otherwise, it will skip balance checks.         |

#### Returns: [PreparedPurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

#### Example

```jsx
import { createClient, type AppType, isBlindMintProduct } from '@manifoldxyz/client-sdk'

const client = createClient({
  httpRPCs: {
    1: "<https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY>",
  }
});

const product = await client.getProduct('12311232')
if (!isBlindMintProduct(product)) {
  throw new Error(`Unsupported app type`)
}
try {
  const preparedPurchase = await product.preparePurchase({
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

| Code                 | Message                              | data                                                                                  |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| INVALID\_INPUT       | `invalid input`                      |                                                                                       |
| UNSUPPORTED\_NETWORK | `unsupported networkId ${networkId}` |                                                                                       |
| SOLD\_OUT            | `product sold out`                   |                                                                                       |
| LIMIT\_REACHED       | `you've reached your purchase limit` |                                                                                       |
| ENDED                | `ended`                              |                                                                                       |
| NOT\_STARTED         | `not started, come back later`       |                                                                                       |
| ESTIMATION\_FAILED   | `transaction estimation failed`      | [CallExceptions](https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception) |
