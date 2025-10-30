# InstanceData

| Field          | Type                                                                                        | Required | Description                     |
| -------------- | ------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| **id**         | string                                                                                      | ✅        | Unique identifier (instance ID) |
| **creator**    | [Creator](creator.md)                                                                       | ✅        | The creator of the product      |
| **publicData** | [EditionPublicData](editionpublicdata.md) \| [BlindMintPublicData](blindmintpublicdata.md)  | ✅        | The product data                |
| appId          | number                                                                                      | ✅        | The appId of the product        |
| appName        | string                                                                                      | ✅        | The app name of the product     |

