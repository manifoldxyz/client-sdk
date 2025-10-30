# TransactionStep

Individual transaction step within a purchase flow. Represents a single blockchain transaction that needs to be executed. Steps enable explicit user control over multi-transaction operations, following Web3 best practices for transparency and user consent.

## Fields

| Field                                                      | Type                    | Required | Description                                                                |
| ---------------------------------------------------------- | ----------------------- | -------- | -------------------------------------------------------------------------- |
| id                                                         | string                  | ✅       | Unique identifier for this step                                           |
| name                                                       | string                  | ✅       | Human-readable step name (e.g., "Approve USDC", "Mint NFT")               |
| type                                                       | TransactionStepType     | ✅       | Type of transaction: `'mint'` \| `'approve'`                              |
| [transactionData](../sdk/transaction-steps/transactionData.md) | TransactionData    | ✅       | Raw transaction data for custom execution                                 |
| [execute](../sdk/transaction-steps/execute.md)            | function                | ✅       | Executes this transaction step                                            |
| description                                                | string                  | ❌       | Optional detailed description of what this step does                      |
| cost                                                       | object                  | ❌       | Cost breakdown for this specific step                                     |
| cost.native                                                | Money                   | ❌       | Native token cost (ETH, etc.)                                             |
| cost.erc20s                                                | Money[]                 | ❌       | ERC20 token costs                                                         |

## Common Step Types

- **`approve`**: ERC20 token approval for payment
- **`mint`**: Actual NFT minting transaction

## Usage

Steps should be executed in order, as later steps may depend on earlier ones.

### Example: Manual Step Execution

```typescript
// Manual step execution with user confirmation
const step = preparedPurchase.steps[0];

if (step.type === 'approve') {
  const confirmed = await showApprovalModal({
    token: step.cost?.erc20s?.[0],
    spender: step.transactionData.contractAddress
  });

  if (confirmed) {
    const receipt = await step.execute(adapter);
    console.log('Approval TX:', receipt.txHash);
  }
}
```

### Example: Iterating Through Steps

```typescript
// Execute steps manually for better UX
for (const step of preparedPurchase.steps) {
  console.log(`Executing: ${step.name}`);
  const receipt = await step.execute(adapter);
  console.log(`✓ ${step.name} complete: ${receipt.txHash}`);
}
```

## See Also

- [TransactionData](../sdk/transaction-steps/transactionData.md) - Raw transaction data for custom execution
- [execute](../sdk/transaction-steps/execute.md) - Built-in execution function
- [PreparedPurchase](./preparedpurchase.md) - Parent structure containing steps
