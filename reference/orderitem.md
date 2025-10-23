# OrderItem

| Field  | Type              | Required | Description               |
| ------ | ----------------- | -------- | ------------------------- |
| status | enum              | ✅        | `pending`                 |
| cost   | [Cost](cost.md)   | ✅        | Total cost of the product |
| token  | [Token](token.md) | ❌        | The minted token          |
