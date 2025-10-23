# getInventory

**getInventory()** → [ProductInventory](../../../reference/productinventory.md)

Retrieves the product’s total supply and total number of purchases.

#### Returns: [ProductInventory](../../../reference/productinventory.md)

| Field          | Type   | Required | Description                                                        |
| -------------- | ------ | -------- | ------------------------------------------------------------------ |
| totalSupply    | number | ✅        | Total product supply.  A value of `-1` indicates unlimited supply. |
| totalPurchased | number | ✅        | Total product purchased                                            |
