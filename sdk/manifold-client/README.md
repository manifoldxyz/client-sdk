# Manifold Client

### Client Creation

**createClient(config?)** → ManifoldClient&#x20;

Creates a new SDK client instance.

#### Parameters

| Parameter | Type                   | Required |                                                                                               |
| --------- | ---------------------- | -------- | --------------------------------------------------------------------------------------------- |
| httpRPCs  | {\[networkId]: string} | ❌        | Custom RPC URLs by network. **You need to provide one for every network you want to support** |

#### Returns: ManifoldClient

| Property                    | Type     | Description   |
| --------------------------- | -------- | ------------- |
| [getProduct](getproduct.md) | function | Get a product |

#### Example

```jsx
const client = createClient({
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  },
});
```
