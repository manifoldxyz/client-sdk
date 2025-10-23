# Receipt

| Field     | Type                                            | Required | Description                                                    |
| --------- | ----------------------------------------------- | -------- | -------------------------------------------------------------- |
| networkId | number                                          | ✅        | Network ID where the order was placed                          |
| txHash    | string                                          | ✅        | The transaction hash of the order                              |
| step      | [TransactionStep](transactionstep.md)           | ✅        | Corresponding transaction step returned from `preparePurchase` |
| txReceipt | [**TransactionReceipt**](transactionreceipt.md) | ❌        | The transaction receipt                                        |

