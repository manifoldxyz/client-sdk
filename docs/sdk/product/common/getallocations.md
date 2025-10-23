# getAllocations

**getAllocations(params)** → AllocationResponse

Retrieves the allocation quantity for a given wallet address.

#### Parameters

| Parameter            | Type   | Required | Description    |
| -------------------- | ------ | -------- | -------------- |
| **recipientAddress** | string | ✅        | Buyer’s wallet |

#### Returns: AllocationResponse

| Field      | Type    | Required | Description                                                      |
| ---------- | ------- | -------- | ---------------------------------------------------------------- |
| isEligible | boolean | ✅        | Can purchase?                                                    |
| reason     | string  | ❌        | Why not eligible                                                 |
| quantity   | number  | ✅        | Quantity eligible. A value of `-1` indicates unlimited quantity. |

#### Example

```jsx
const allocations = await product.getAllocations**({
  recipientAddress: '0x742d35Cc...'
  });
if (!allocations.isEligible) {
  console.log('Cannot mint:', allocations.reason);  
  return;
}
console.log('Total alloted:', allocations.quantity);
```

[**Errors**](https://www.notion.so/Manifold-Client-SDK-Complete-Developer-Guide-2676b055ee58800abc38ccd30cdfca70?pvs=21)

| Code           | Message                     |
| -------------- | --------------------------- |
| INVALID\_INPUT | `invalid recipient address` |

*
