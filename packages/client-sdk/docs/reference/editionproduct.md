# EditionProduct

| Field                                                                  | Type                                        | Required | Description                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------- | -------- | ----------------------------------------------------------- |
| onchainData                                                            | [EditionOnchainData](editiononchaindata.md) | ❌        | Product onchain data                                        |
| [**preparePurchase**](../sdk/product/edition-product/preparepurchase.md) | function                                    | ✅        | Simulates purchase to check eligibility and get total cost. |
| [**purchase**](../sdk/product/common/purchase.md)                      | function                                    | ✅        | Make a purchase on the product                              |
| [fetchOnchainData](../sdk/product/edition-product/fetchonchaindata.md) | function                                    | ✅        | Fetch on-chain data for this product                        |
| [getAllocations](../sdk/product/common/getallocations.md)              | function                                    | ✅        | Check product eligibility quantity for a wallet address     |
| [getInventory](../sdk/product/common/getinventory.md)                  | [ProductInventory](productinventory.md)     | ✅        | Get inventory of the product                                |
| [getRules](../sdk/product/common/getrules.md)                          | [ProductRule](productrule.md)               | ✅        | Product specific rules                                      |
| [getProvenance](../sdk/product/common/getprovenance.md)                | [ProductProvenance](productprovenance.md)   | ✅        | Product provenance info                                     |
