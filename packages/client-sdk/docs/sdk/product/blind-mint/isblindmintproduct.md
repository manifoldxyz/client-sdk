# isBlindMintProduct

isBlindMintProduc&#x74;**()** → boolean

Validate whether a [product](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/sdk/product) is a [Blind Mint product](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/sdk/product/product-types/blind-mint)

Provides additional TypeScript typing support by narrowing the product type to [BlindMintProduct](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/references/blindmintproduct)

#### Example

```tsx
const product = await sdk.getProduct('31231232')
if (!isBlindMintProduct(product)) {
  throw new Error('Is not a blind mint instance')
}
// product is now BlindMintProduct
```
