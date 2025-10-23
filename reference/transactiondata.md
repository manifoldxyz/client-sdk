# TransactionData

| Field           | Type   | Required | Description            |
| --------------- | ------ | -------- | ---------------------- |
| contractAddress | string | ✅        | Target contract        |
| transactionData | string | ✅        | Encoded calldata       |
| gasEstimate     | BigInt | ✅        | Gas limit              |
| networkId       | number | ✅        | Network of transaction |
