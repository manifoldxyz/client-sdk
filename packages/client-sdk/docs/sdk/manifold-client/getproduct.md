# getProduct

**getProduct(instanceId | url)** → [Product](../product/)

Fetches detailed product information.

#### Parameters

| Parameter         | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| instanceId \| url | string | ✅        | The instanceId or url of the product |

#### Returns: [Product](../product/)

#### Example

<pre class="language-typescript"><code class="lang-typescript">import { isBlindMintProduct, createClient, createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
<strong>
</strong>// Setup public provider
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('YOUR_RPC_URL')
});
const publicProvider = createPublicProviderViem({ 1: publicClient });

// Create client
const client = createClient({ publicProvider });

<strong>const product = await client.getProduct('4150231280');
</strong>console.log(`AppType: ${product.type}`);
</code></pre>

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code              | Message                  |
| ----------------- | ------------------------ |
| NOT\_FOUND        | product not found        |
| UNSUPPORTED\_TYPE | Unsupported product type |
