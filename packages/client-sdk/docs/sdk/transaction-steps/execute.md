---
description: Handles the execution of a specific step.
---

# execute

**execute(params)** → [Receipt](../../reference/receipt.md)

| Parameter     | Type                                                            | Required | Description                                      |
| ------------- | --------------------------------------------------------------- | -------- | ------------------------------------------------ |
| account       | [Account](../../reference/account.md)                           | ✅        | Buyer’s account                                  |
| callbacks     | [TransactionCallbacks](../../reference/transactioncallbacks.md) | ❌        | Purchase callbacks for handling different stages |
| confirmations | number                                                          | ❌        | Number of confirmation blocks (Default 1)        |

#### Returns: [Receipt](../../reference/receipt.md)

#### Example:

```tsx
// account is created via createAccountEthers5 / createAccountViem
const receipts = []

for (const step of preparedPurchase.steps) {
  const receipt = await step.execute(account)
  receipts.push(receipt)

  console.log('Confirmed tx:', receipt.transactionReceipt.txHash)

  if (receipt.order) {
    receipt.order.items.forEach((item) => {
      console.log(`Minted token ${item.token.tokenId}`)
    })
  }
}
```
