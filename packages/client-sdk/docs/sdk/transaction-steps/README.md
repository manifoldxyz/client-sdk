# Transaction Steps

## Introduction

Some product purchases may require more than one transaction to complete. For example, Edition products configured with ERC20 payments require:

1. **ERC20 spend approval**: Grant contract permission to spend user tokens
2. **Mint**: Execute the actual purchase transaction

Other scenarios include cross-chain purchases (bridge, then mint) or batch operations.

## Execution Methods

### 1. Built-in Execution (Recommended)

For **user-facing apps**, the SDK separates transactions into explicit steps. This gives you:
- Progress tracking for multi-step flows
- Fine-grained error handling per transaction
- Safer UX - users approve each step individually

The [preparePurchase](../product/blind-mint/preparepurchase.md) function returns [TransactionStep](./) objects. Call [execute](execute.md) on each step to submit the transaction. The SDK automatically skips unnecessary steps (e.g., if approval is already granted).

For **server-side apps** or **agentic flows**, call [purchase](../product/common/purchase.md) directly and the SDK handles all transactions sequentially without explicit step management.

### 2. Custom Execution with transactionData

Each `TransactionStep` includes a [transactionData](transactionData.md) field containing raw blockchain transaction data. This enables custom transaction execution for advanced use cases:

- **EIP-7702 Support**: Account abstraction and smart contract wallets
- **Custom Gas Management**: Implement your own gas strategies
- **Transaction Infrastructure**: Integrate with existing systems
- **Batch Transactions**: Combine multiple transactions
- **Custom Error Handling**: Implement retry logic

Example:
```typescript
// Prepare purchase normally
const preparedPurchase = await product.preparePurchase({
  userAddress: walletAddress,
  payload: { quantity: 1 }
});

// Execute with custom logic
for (const step of preparedPurchase.steps) {
  const { contractAddress, transactionData, value, gasEstimate } = step.transactionData;
  
  // Use your preferred Web3 library
  const txHash = await walletClient.sendTransaction({
    to: contractAddress,
    data: transactionData,
    value: value,
    gas: gasEstimate * 110n / 100n, // Custom gas buffer
  });
}
```

## Available Documentation

- [execute](execute.md) - Built-in execution method for transaction steps
- [transactionData](transactionData.md) - Raw transaction data for custom execution
