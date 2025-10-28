# Manifold Client

### Client Creation

**createClient(config?)** → ManifoldClient&#x20;

Creates a new SDK client instance.

#### Parameters

| Parameter | Type                   | Required |                                      |
| --------- | ---------------------- | -------- | ------------------------------------ |
| httpRPCs  | {\[networkId]: string} | ❌        | Optional custom RPC URLs by network. |

#### Returns: ManifoldClient

| Property                    | Type     | Description   |
| --------------------------- | -------- | ------------- |
| [getProduct](getproduct.md) | function | Get a product |

#### Example

```jsx
const client = createClient();
```
