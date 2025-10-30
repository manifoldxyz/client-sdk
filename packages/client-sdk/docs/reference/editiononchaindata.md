# EditionOnchainData

| Field           | Type              | Required | Description                 |
| --------------- | ----------------- | -------- | --------------------------- |
| totalSupply     | number            | ✅        | Total supply of the product |
| totalMinted     | number            | ✅        | Total token minted          |
| walletMax       | number            | ✅        | Max tokens per wallet       |
| startDate       | Date              | ✅        | Start drop date             |
| endDate         | Date              | ✅        | End drop date               |
| audienceType    | enum              | ✅        | `None`                      |
| cost            | [Money](money.md) | ✅        | Cost of the product         |
| paymentReceiver | string            | ✅        | Receiver of mint payment    |
