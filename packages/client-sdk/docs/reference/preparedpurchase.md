# PreparedPurchase

| Field               | Type                                     | Required | Description                                                            |
| ------------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------------- |
| **cost**            | [Cost](cost.md)                          | ✅        | Purchase cost                                                          |
| **transactionData** | [TransactionData](transactiondata.md)    | ✅        | Transaction to execute                                                 |
| steps               | [TransactionStep](transactionstep.md)\[] | ✅        | Manual steps that need to be executed in order (For manual executions) |
| gasEstimate         | [Money](money.md)                        | ✅        | Total gas estimated                                                    |
