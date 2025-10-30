# getStatus

**getStatus()** → StatusResponse

Retrieves the current status of the product.

#### Returns:&#x20;

```typescript
'active' | 'upcoming' | 'sold-out' | 'ended'
```

* **active**: The product is currently active and available for purchase.
* **upcoming**: The product sale has not started yet.
* **sold-out**: The product is sold out.
* **ended**: The product sale has ended.

#### Example

```jsx
const status = await product.getStatus();
console.log(`Current product status ${status}`)
```
