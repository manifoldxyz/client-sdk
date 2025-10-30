# Viem

**createAccountViem(params)** → [Account](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/reference/account)

Create an account representation from [Viem Wallet Client](https://viem.sh/docs/clients/wallet)

#### Parameters

| Parameter    | Type                                                | Required | Description                    |
| ------------ | --------------------------------------------------- | -------- | ------------------------------ |
| walletClient | [WalletClient](https://viem.sh/docs/clients/wallet) | ✅        | Instance of Viem Wallet client |

#### Returns: [Account](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/reference/account)

#### Example

{% tabs %}
{% tab title="index.ts" %}
```typescript
import { createClient, isBlindMintProduct, createAccountViem } from '@manifoldxyz/client-sdk';
import { walletClient } from './client.ts';

const client = createClient();
// Grab product
const product = await client.getProduct('4150231280');
// Check product is of type you expect 
if (!isBlindMintProduct(product)) {
  throw new Error('Is not a blind mint instance')
}
const prepared = await product.preparePurchase({
  address: '0xBuyer',
  payload: { quantity: 1 },
});

const account = createAccountViem({
  walletClient
})
const order = await product.purchase({
  account,
  preparedPurchase: prepared,
});
const txHash = order.receipts[0]?.txHash;
console.log(`Transaction submitted ${txHash}`)
```
{% endtab %}

{% tab title="client.ts" %}
```typescript
import { createWalletClient, custom } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const account = privateKeyToAccount('0x...') 
const client = createWalletClient({
  account, 
  chain: mainnet,
  transport: custom(window.ethereum)
})
export { walletClient }
```
{% endtab %}
{% endtabs %}

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code           | Message                                                                                |
| -------------- | -------------------------------------------------------------------------------------- |
| INVALID\_INPUT | Account not found. Please provide an Account explicitly when creating the Viem client. |
