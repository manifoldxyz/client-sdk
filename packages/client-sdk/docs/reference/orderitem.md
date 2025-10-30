# OrderItem

Represents a minted token (or group of tokens) within a purchase order.

| Field    | Type              | Required | Description                               |
| -------- | ----------------- | -------- | ----------------------------------------- |
| total    | [Cost](cost.md)   | ✅        | Cost allocation for this specific item    |
| token    | [Token](token.md) | ✅        | Token metadata (contract, media, tokenId) |
| quantity | number            | ✅        | Number of tokens represented by this item |
