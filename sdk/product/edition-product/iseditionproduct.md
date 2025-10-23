# isEditionProduct

isEditionProduc&#x74;**()** → boolean

Validate whether a [product](../) is an [Edition product](../../../reference/editionproduct.md)

Provides additional TypeScript typing support by narrowing the product type to [EditionProduct](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/references/editionproduct)

#### Example

```tsx
const product = await sdk.getProduct('31231232')
if (!isEditionProduct(product)) {
  throw new Error('Is not an edition instance')
}
// product is now EditionProduct
```
