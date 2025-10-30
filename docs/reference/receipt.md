# Receipt

| Field                | Type                                                  | Required | Description                                                                 |
| -------------------- | ----------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| transactionReceipt   | [TransactionReceipt](transactionreceipt.md)           | ✅        | Normalized transaction metadata (hash, block number, gas usage)            |
| order                | [TokenOrder](order.md)                                | ❌        | Parsed mint results including tokens, quantities, and cost allocations     |
