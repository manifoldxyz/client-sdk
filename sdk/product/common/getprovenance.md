# getProvenance

**getProvenance()** → [ProductProvenance](../../../reference/productprovenance.md)

Retrieves provenance information for the product, such as the related contract address, token ID, creator details, and more.

#### Returns: [ProductProvenance](../../../reference/productprovenance.md)

| Field     | Type                                       | Required | Description                                  |
| --------- | ------------------------------------------ | -------- | -------------------------------------------- |
| creator   | [Creator](../../../reference/creator.md)   | ✅        | Information about the creator of the product |
| contract  | [Contract](../../../reference/contract.md) | ❌        | Information about the contract the product   |
| token     | [Token](../../../reference/token.md)       | ❌        | Information about the token of the product   |
| networkId | number                                     | ❌        | Network ID of the product                    |

