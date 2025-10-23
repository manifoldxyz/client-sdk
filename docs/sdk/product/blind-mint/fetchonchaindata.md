# fetchOnchainData

**fetchOnchainData()** → [BlindMintOnchainData](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/references/blindmintonchaindata)

Retrieves on-chain data and assigns the `onchainData` properties to the [product](../) object.

#### Example

```tsx
const product = await sdk.getProduct('31231232')
await product.fetchOnchainData()
console.log(`cost: ${product.onchainData.cost.formatted}`)
```

