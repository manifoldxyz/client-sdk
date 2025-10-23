---
description: Handles the execution of a specific step.
---

# execute

**execute(params)** → [Order](../../reference/order.md)

| Parameter     | Type                                                            | Required | Description                                      |
| ------------- | --------------------------------------------------------------- | -------- | ------------------------------------------------ |
| account       | [Account](../../reference/account.md)                           | ✅        | Buyer’s account                                  |
| callbacks     | [TransactionCallbacks](../../reference/transactioncallbacks.md) | ❌        | Purchase callbacks for handling different stages |
| confirmations | number                                                          | ❌        | Number of confirmation blocks (Default 1)        |

#### Returns: [Order](../../reference/order.md)

#### Example:

```tsx
import { ethers5Adapter } from '@manifoldxyz/client-sdk'

const preparedPurchase = await product.preparePurchase<EditionPayload>({
  address: '0x...',
  payload: {
    quantity: 1
  },
  gasBuffer: {
  	multiplier: 0.25 // 25% gas buffer
  }
});

const signer = // your ether signer
const account = ethers5Adapter.signer.fromEthers({signer})

// Execute steps one by one
let order
try {
  for (const step of preparedPurchase.steps) {
    order = await step.execute({account})
    const receipt = order.receipts[0]
    console.log(`Successfully executed ${receipt.step.name} txHash: ${receipt.txHash}`)
  }
} catch (error : StudioSDKError) {
  console.log(`Failed to execute transaction ${error.message}`)
}
```
