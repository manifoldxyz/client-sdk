# Manifold Client

### Client Creation

**createClient(config?)** → ManifoldClient&#x20;

Creates a new SDK client instance.

#### Parameters

| Parameter | Type   | Required |                                          |
| --------- | ------ | -------- | ---------------------------------------- |
| config    | object | ❌        | Optional configuration object           |
| └─ debug  | boolean| ❌        | Enable debug logging (default: false)   |

#### Returns: ManifoldClient

| Property                    | Type     | Description   |
| --------------------------- | -------- | ------------- |
| [getProduct](getproduct.md) | function | Get a product |

#### Example

```jsx
const client = createClient();
```
