# Order

Base order information shared across all purchase flows:

| Field              | Type            | Required | Description                                     |
| ------------------ | --------------- | -------- | ----------------------------------------------- |
| recipientAddress   | string          | ✅        | Wallet address that receives the minted tokens  |
| total              | [Cost](cost.md) | ✅        | Total cost for this purchase flow               |

`TokenOrder` extends `Order` and is returned when mint results are available:

| Field | Type                               | Required | Description                                                  |
| ----- | ---------------------------------- | -------- | ------------------------------------------------------------ |
| items | [OrderItem](orderitem.md)\[]       | ✅        | Detailed list of minted tokens with quantities and per-item cost breakdown |
