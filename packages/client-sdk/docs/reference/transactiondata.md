# TransactionData

| Field           | Type   | Required | Description                            |
| --------------- | ------ | -------- | -------------------------------------- |
| contractAddress | string | ✅        | Target contract                        |
| transactionData | string | ✅        | Encoded calldata                       |
| gasEstimate     | BigInt | ✅        | Gas estimate of the transaction        |
| networkId       | number | ✅        | Network of transaction                 |
| value           | bigint | ✅        | The required value for the transaction |
