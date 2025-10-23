---
description: purchase
---

# purchase

**purchase(params)** → [Order](../../../reference/order.md)

Initiates a purchase for the specified product. &#x20;

This method may trigger multiple write transactions (e.g., token approval and minting).

#### Parameters

| Parameter        | Type                                                               | Required | Description                                                                                             |
| ---------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| account          | [Account](../../../reference/account.md)                           | ✅        | Buyer’s account                                                                                         |
| preparedPurchase | [PreparedPurchase](../../../reference/preparedpurchase.md)         | ✅        | Prepared transaction object returned from [preparePurchase](../edition-product/preparepurchase.md) call |
| callbacks        | [TransactionCallbacks](../../../reference/transactioncallbacks.md) | ❌        | Purchase callbacks for handling different stages                                                        |
| confirmations    | number                                                             | ❌        | Number of confirmation blocks (Default 1)                                                               |

#### Returns: [Order](../../../reference/order.md)

#### Example

```jsx
const results = await product.**purchase**({
  account,
  preparedPurchase
  });
if (!simulation.eligibility.isEligible) {
  console.log('Cannot mint:', simulation.eligibility.reason);  
  return;
}
console.log('Total cost:', simulation.totalCost.formatted);
```

[**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

<table><thead><tr><th width="234.6640625">Code</th><th width="175.30859375">Message</th><th width="142.54296875">data</th><th>metadata</th></tr></thead><tbody><tr><td>TRANSACTION_FAILED</td><td>transaction failed</td><td><a href="https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception">CallExceptions</a></td><td>{ receipts :  <a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/5/reference/receipt">Receipt</a>[]} (For completed steps)</td></tr><tr><td>TRANSACTION_REVERTED</td><td>transaction reverted</td><td><a href="https://docs.ethers.org/v5/api/utils/logger/#errors--call-exception">CallExceptions</a></td><td>{ receipts : <a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/5/reference/receipt">Receipt</a>[]} (For completed steps)</td></tr><tr><td>TRANSACTION_REJECTED</td><td>user rejected transaction</td><td></td><td>{ receipts :  <a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/5/reference/receipt">Receipt</a>[]} (For completed steps)</td></tr><tr><td>INSUFFIENT_FUNDS</td><td>wallet does not have sufficient funds for purchase</td><td></td><td>{ receipts :  <a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/5/reference/receipt">Receipt</a>[]} (For completed steps)</td></tr><tr><td>LEDGER_ERROR</td><td>error with ledger wallet, make sure blind signing is on</td><td></td><td>{ receipts :  <a href="https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/5/reference/receipt">Receipt</a>[]} (For completed steps)</td></tr></tbody></table>
