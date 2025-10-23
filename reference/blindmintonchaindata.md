# BlindMintOnchaindata

| Field           | Type              | Required | Description                            |
| --------------- | ----------------- | -------- | -------------------------------------- |
| totalSupply     | number            | ✅        | Total supply of the product            |
| **totalMinted** | number            | ✅        | Total token minted                     |
| walletMax       | number            | ✅        | Max tokens per wallet                  |
| startDate       | Date              | ✅        | Start drop date                        |
| endDate         | Date              | ✅        | End drop date                          |
| audiencetype    | enum              | ✅        | `None`                                 |
| cost            | [Money](money.md) | ✅        | Cost of the product                    |
| paymentReceiver | string            | ✅        | Receiver of mint payment               |
| tokenVariations | number            | ✅        | Number of asset variations             |
| startingTokenId | number            | ✅        | The starting tokenId of the asset pool |
