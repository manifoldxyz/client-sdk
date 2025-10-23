# Order

| Field     | Type                         | Required | Description                     |
| --------- | ---------------------------- | -------- | ------------------------------- |
| receipts  | [Receipt](receipt.md)\[]     | ✅        | The receipt of the transactions |
| status    | enum                         | ✅        | `pending`                       |
| buyer     | [Identity](identity.md)      | ✅        | The buyer of the product        |
| **total** | [Cost](cost.md)              | ✅        | Total cost of the product       |
| items     | [OrderItem](orderitem.md)\[] | ❌        | Purchased items                 |
