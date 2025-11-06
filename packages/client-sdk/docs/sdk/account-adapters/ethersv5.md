# EthersV5

**createAccountEthers5(params)** → [Account](../../reference/account.md)

Creates an account representation from an **Ethers v5** signer or wallet.\
(You only need to provide either a signer **or** a wallet.)

#### Parameters

| Parameter | Type                                                                                      | Required | Description                                                                                            |
| --------- | ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| signer    | [JsonRpcSigner](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcSigner) | ❌        | Instance of  [JsonRpcSigner](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcSigner) |
| wallet    | [Wallet](https://docs.ethers.org/v5/api/signer/#Wallet)                                   | ❌        | Useful for server-side applications using programmatic wallet generation.                              |

#### Returns: [Account](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/reference/account)

#### Example

<pre class="language-typescript"><code class="lang-typescript">import { createAccountEthers5, createClient, createPublicProviderEthers5, EditionProduct } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

// Create provider for the network
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');

// Create public provider for the client
const publicProvider = createPublicProviderEthers5({
  1: provider // mainnet
});

// Initialize the client
const client = createClient({ publicProvider });

<strong>const product = await client.getProduct('4150231280') as EditionProduct;
</strong>
// Create wallet for signing
const wallet = new ethers.Wallet('wallet-private-key', provider);

const prepared = await product.preparePurchase({
  address: wallet.address,
  payload: {
    quantity: 1
  },
});

// Create account from wallet
const account = createAccountEthers5({
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
