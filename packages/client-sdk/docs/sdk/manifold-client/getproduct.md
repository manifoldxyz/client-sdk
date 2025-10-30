# getProduct

**getProduct(instanceId | url)** → [Product](../product/)

Fetches detailed product information.

#### Parameters

| Parameter         | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| instanceId \| url | string | ✅        | The instanceId or url of the product |

#### Returns: [Product](../product/)

#### Example

<pre class="language-jsx"><code class="lang-jsx">import { isBlindMintProduct, createClient } from '@manifoldxyz/client-sdk';
<strong>
</strong>const client = createClient();

<strong>const product = await client.getProduct('4150231280');
</strong>console.log(`AppType: ${product.type}`);
</code></pre>

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code              | Message                  |
| ----------------- | ------------------------ |
| NOT\_FOUND        | product not found        |
| UNSUPPORTED\_TYPE | Unsupported product type |
