# getProduct

**getProduct(instanceId | url)** → [Product](../product/)

Fetches detailed product information.

#### Parameters

| Parameter         | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| instanceId \| url | string | ✅        | The instanceId or url of the product |

#### Returns: [Product](../product/)

#### Example

<pre class="language-typescript"><code class="lang-typescript">import { isBlindMintProduct, createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
<strong>
</strong>// Setup Wagmi config
const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http('YOUR_RPC_URL')
  }
});

// Create public provider
const publicProvider = createPublicProviderWagmi({ config });

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
