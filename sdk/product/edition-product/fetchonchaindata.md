# fetchOnchainData

**fetchOnchainData()** → [EditionOnchainData](../../../reference/editiononchaindata.md)

Get on-chain data and assign `onchainData` properties for the product object.

#### Example

```tsx
const product = await sdk.getProduct('31231232')
await product.fetchOnchainData()
console.log(`cost: ${product.onchainData.cost.formatted}`)
```

