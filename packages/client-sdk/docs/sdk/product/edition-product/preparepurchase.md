# preparePurchase

**preparePurchase(params)** → [PreparedPurchase](../../../reference/preparedpurchase.md)

Simulates a purchase to check eligibility and calculate the total cost.

#### Parameters

| Parameter            | Type                                                                                                            | Required | Description                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| address              | string                                                                                                          | ✅        | The address making the purchase                                                                                       |
| **recipientAddress** | string                                                                                                          | ❌        | If different than `address`                                                                                           |
| **networkId**        | number                                                                                                          | ❌        | If specify, forced transaction on the network (handle funds bridging automatically), assume product network otherwise |
| payload              | {quantity: number}                                                                                              | ✅        | Specific to Edition Products. Specify quantity of purchase                                                            |
| **gasBuffer**        | object                                                                                                          | ❌        | How much additional gas to spend on the purchase                                                                      |
| gasBuffer.fixed      | BigInt                                                                                                          | ❌        | Fixed gas buffer amount                                                                                               |
| gasBuffer.multipller | number                                                                                                          | ❌        | Gas buffer by multiplier                                                                                              |
| account              | [Account](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/references/account) | ❌        | If provided, it will perform balance checks on the specified account; otherwise, it will skip balance checks.         |

#### Returns: [PreparedPurchase](../../../reference/preparedpurchase.md)

> A purchase can involve more than one transaction.\
> For example, minting and paying with ERC-20 tokens requires an approval transaction followed by a mint transaction.\
> If you’re building your own front end with the SDK, you may want users to trigger these transactions explicitly (e.g., by clicking separate buttons).
>
> [PreparedPurchase](../../../reference/preparedpurchase.md) returns a list of steps for this purpose.\
> Each step represents an on-chain transaction that can be executed by calling [step.execute](../../transaction-steps/execute.md)().\
> Each `execute` call performs the necessary on-chain checks to determine whether the transaction is still required; if it isn’t, the step is skipped. [Click here to learn more](../../transaction-steps/)

#### Example

<pre class="language-jsx"><code class="lang-jsx">import { createClient, type AppType } from '@manifoldxyz/client-sdk'

const client = createClient();

const product = await client.getProduct('12311232')
if (product.type !== AppType.Edition) {
	throw new Error(`Unsupported app type`)
}
try {
<strong>  const preparedPurchase = await product.preparePurchase&#x3C;EditionPayload>({
</strong>    address: '0x....', // the connected wallet
    payload: {
	  quantity: 1
    },
    gasBuffer: {
     multiplier: 0.25 // 25% gas buffer
    }
<strong>  });
</strong>} catch (error: ClientSDKError) {
  console.log(`Error: ${error.message}`)
  return
}

console.log('Total cost:', simulation.totalCost.formatted);
</code></pre>

[**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

<table><thead><tr><th>Code</th><th width="338.7421875">Message</th><th>data</th></tr></thead><tbody><tr><td>INVALID_INPUT</td><td><code>invalid input</code></td><td></td></tr><tr><td>UNSUPPORTED_NETWORK</td><td><code>unsupported networkId ${networkId}</code></td><td></td></tr><tr><td>NOT_ELIGIBLE</td><td><code>wallet not eligible to purchase product</code></td><td>Eligibility</td></tr><tr><td>SOLD_OUT</td><td><code>product sold out</code></td><td></td></tr><tr><td>LIMIT_REACHED</td><td><code>you've reached your purchase limit</code></td><td></td></tr><tr><td>ENDED</td><td><code>ended</code></td><td></td></tr><tr><td>NOT_STARTED</td><td><code>not started, come back later</code></td><td></td></tr><tr><td>ESTIMATION_FAILED</td><td><code>transaction estimation failed</code></td><td><a href="https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception">CallExceptions</a></td></tr></tbody></table>

Eligibiliy

| Field        | Type                                    | Description                                                                 |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------- |
| reason       | string                                  | Why not eligible                                                            |
| missingFunds | [Money](../../../reference/money.md)\[] | Missing required funds to purchase (Could be in native ETH or ERC20 tokens) |
