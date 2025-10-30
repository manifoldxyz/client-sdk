# preparePurchase

**preparePurchase(params)** → [PreparedPurchase](../../../reference/preparedpurchase.md)

Simulates purchase to check eligibility and get total cost.

#### Parameters

<table><thead><tr><th width="181.0078125">Parameter</th><th width="168.01171875">Type</th><th width="107.44140625">Required</th><th>Description</th></tr></thead><tbody><tr><td>address</td><td>string</td><td>✅</td><td>The address making the purchase</td></tr><tr><td><strong>recipientAddress</strong></td><td>string</td><td>❌</td><td>If different than <code>address</code></td></tr><tr><td><strong>networkId</strong></td><td>number</td><td>❌</td><td>If specify, forced transaction on the network (handle funds bridging automatically), assume product network otherwise</td></tr><tr><td>payload</td><td>{quantity: number}</td><td>✅</td><td>Specific to Edition Products. Specify quantity of purchase</td></tr><tr><td><strong>gasBuffer</strong></td><td>object</td><td>❌</td><td>How much additional gas to spend on the purchase</td></tr><tr><td>gasBuffer.fixed</td><td>BigInt</td><td>❌</td><td>Fixed gas buffer amount</td></tr><tr><td>gasBuffer.multipller</td><td>number</td><td>❌</td><td><p></p><p>Gas buffer by multiplier. </p><p>The multiplier represents a percentage (as a number out of 100). For example:</p><ul><li>multiplier: 120 means 120% of the original estimate (20% increase)</li><li>multiplier: 150 means 150% of the original estimate (50% increase)</li></ul></td></tr><tr><td>account</td><td><a href="../../../reference/account.md">Account</a></td><td>❌</td><td>If provided, it will perform balance checks on the specified account; otherwise, it will skip balance checks.</td></tr></tbody></table>

#### Returns: [PreparedPurchase](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

#### Example

```jsx
import { createClient, type AppType, isBlindMintProduct } from '@manifoldxyz/client-sdk'

const client = createClient();

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
