# TransactionStep

| Field                                          | Type     | Required | Description        |
| ---------------------------------------------- | -------- | -------- | ------------------ |
| id                                             | string   | ✅        | Step ID            |
| name                                           | string   | ✅        | Step name          |
| type                                           | enum     | ✅        | `mint`             |
| [execute](../sdk/transaction-steps/execute.md) | function | ❌        | Execution function |
| description                                    | BigInt   | ❌        | Step description   |
