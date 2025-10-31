# preparePurchase

**preparePurchase(params)** → [PreparedPurchase](../../../reference/preparedpurchase.md)

Simulates a purchase to check eligibility and calculate the total cost.

#### Parameters

<table><thead><tr><th width="182.84375">Parameter</th><th width="181.56640625">Type</th><th width="97.63671875">Required</th><th>Description</th></tr></thead><tbody><tr><td>userAddress</td><td>string</td><td>✅</td><td>The address making the purchase</td></tr><tr><td>recipientAddress</td><td>string</td><td>❌</td><td>If different than <code>address</code></td></tr><tr><td>networkId</td><td>number</td><td>❌</td><td>If specify, forced transaction on the network (handle funds bridging automatically), assume product network otherwise</td></tr><tr><td>payload</td><td>{quantity: number}</td><td>✅</td><td>Specific to Edition Products. Specify quantity of purchase</td></tr><tr><td><strong>gasBuffer</strong></td><td>object</td><td>❌</td><td>How much additional gas to spend on the purchase</td></tr><tr><td>gasBuffer.fixed</td><td>BigInt</td><td>❌</td><td>Fixed gas buffer amount</td></tr><tr><td>gasBuffer.multipller</td><td>number</td><td>❌</td><td><p>Gas buffer by multiplier. </p><p>The multiplier represents a percentage (as a number out of 100). For example:</p><ul><li>multiplier: 120 means 120% of the original estimate (20% increase)</li><li>multiplier: 150 means 150% of the original estimate (50% increase)</li></ul></td></tr><tr><td>account</td><td><a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/references/account">Account</a></td><td>❌</td><td>If provided, it will perform balance checks on the specified account; otherwise, it will skip balance checks.</td></tr></tbody></table>

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
</strong>    userAddress: '0x....', // the connected wallet
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
