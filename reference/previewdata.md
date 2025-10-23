# PreviewData

| Field         | Type                    | Required | Description                          |
| ------------- | ----------------------- | -------- | ------------------------------------ |
| title         | string                  | ❌        | Product Title                        |
| description   | string                  | ❌        | Product description                  |
| contract      | [Contract](contract.md) | ❌        | Contract associated with the product |
| thumbnail     | string                  | ❌        | Thumbnail for the product            |
| payoutAddress | string                  | ❌        | Payout wallet address of the product |
| network       | number                  | ❌        | Network the product is on            |
| startDate     | Date                    | ❌        | Start date for the product           |
| endDate       | Date                    | ❌        | End date for the product             |
| price         | [Money](money.md)       | ❌        | Price of the product                 |
