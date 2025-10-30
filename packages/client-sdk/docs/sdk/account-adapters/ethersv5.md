# EthersV5

**createAccountEthers5(params)** → [Account](../../reference/account.md)

Creates an account representation from an **Ethers v5** signer or wallet.\
(You only need to provide either a signer **or** a wallet.)

#### Parameters

| Parameter       | Type                                                                                      | Required | Description                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| client          | [ManifoldClient](../manifold-client/)                                                     | ✅        | Instance of Manifold Client                                                                            |
| provider.signer | [JsonRpcSigner](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcSigner) | ❌        | Instance of  [JsonRpcSigner](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcSigner) |
| provider.wallet | [Wallet](https://docs.ethers.org/v5/api/signer/#Wallet)                                   | ❌        | Useful for server-side applications using programmatic wallet generation.                              |

#### Returns: [Account](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/reference/account)

#### Example

<pre class="language-jsx"><code class="lang-jsx">import { createAccountEthers5, createClient } from '@manifoldxyz/client-sdk';

const client = createClient();
<strong>const product = await client.getProduct('4150231280');
</strong>const prepared = await product.preparePurchase({
  address: wallet.address,
  payload: {
    quantity: 1
  },
});
const wallet = new ethers.Wallet(&#x3C;wallet-private-key>);
const account = createAccountEthers5(client,  {
  wallet
})
const order = await product.purchase({
  account,
  preparedPurchase: prepared,
});
</code></pre>

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code           | Message                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| INVALID\_INPUT | Provide either signer or wallet, not both \| Signer or wallet is required |
