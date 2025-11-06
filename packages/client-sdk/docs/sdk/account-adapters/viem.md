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
import { createClient, BlindMintProduct, createAccountViem, createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { walletClient, publicClient } from './client.ts';

// Create public provider for blockchain interactions
const publicProvider = createPublicProviderViem({
  1: publicClient // mainnet
});

// Initialize client with public provider
const client = createClient({ publicProvider });

// Grab product
const product = await client.getProduct('4150231280') as BlindMintProduct;

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
import { createWalletClient, createPublicClient, custom, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

// Create public client for read operations
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('YOUR_RPC_URL') // or custom(window.ethereum) for browser
})

// Create wallet client for transactions
const account = privateKeyToAccount('0x...') 
export const walletClient = createWalletClient({
  account, 
  chain: mainnet,
  transport: custom(window.ethereum)
})
```
{% endtab %}
{% endtabs %}

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code           | Message                                                                                |
| -------------- | -------------------------------------------------------------------------------------- |
| INVALID\_INPUT | Account not found. Please provide an Account explicitly when creating the Viem client. |
