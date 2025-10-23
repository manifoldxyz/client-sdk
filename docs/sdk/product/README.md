# Product

Calling [getProduct](../manifold-client/getproduct.md) returns a product object with a consistent structure across all Manifold app types.

| Field       | Type                                            | Required | Description                        |
| ----------- | ----------------------------------------------- | -------- | ---------------------------------- |
| **id**      | string                                          | ✅        | Instance ID                        |
| type        | [AppType](../../reference/apptype.md)           | ✅        | `edition`                          |
| data        | [InstanceData](../../reference/instancedata.md) | ✅        | Product offchain data              |
| previewData | [PreviewData](../../reference/previewdata.md)   | ✅        | Return preview data of the product |

Product instances are created based on their specific type (**Edition**, **Burn/Redeem**, or **Blind Mint**). Each specialization adds additional methods and type guards while preserving the shared core API.
