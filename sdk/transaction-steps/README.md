# Transaction Steps

When purchasing a [product](../product/), an [account](../../reference/account.md) may need to execute multiple transactions (e.g., approving tokens, then minting).

For [JSON-RPC accounts](https://viem.sh/docs/accounts/jsonRpc) (e.g., browser extension wallets, WalletConnect, etc.), it is recommended that transactions be executed explicitly (e.g., via button clicks).\
The [preparePurchase](../product/blind-mint/preparepurchase.md) function returns a list of [TransactionStep](./) objects for this purpose. Each step represents an on-chain transaction that can be executed by calling the [execute](execute.md) function.\
Each [execute](execute.md) call performs the necessary on-chain checks to determine whether the transaction is still required; if it is not, the step is skipped.

{% hint style="info" %}
If your application is server-side only, you can call [preparePurchase](../product/blind-mint/preparepurchase.md)  and then [purchase](../product/common/purchase.md) and not worry about the transaction steps. The SDK will execute the necessary transactions sequentially.
{% endhint %}
