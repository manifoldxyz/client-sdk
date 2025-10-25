# Transaction Steps

## Introduction

Some product purchases may require more than one transaction to complete. For example, Edition products configurd with ERC20 payments require:

1. **ERC20 spend approval**: Grant contract permission to spend user tokens
2. **Mint**: Execute the actual purchase transaction

Other scenarios include cross-chain purchases (bridge, then mint) or batch operations.

## Explicit vs. Automatic Execution

For **user-facing apps**, the SDK separates transactions into explicit steps. This gives you:
- Progress tracking for multi-step flows
- Fine-grained error handling per transaction
- Safer UX - users approve each step individually

The [preparePurchase](../product/blind-mint/preparepurchase.md) function returns [TransactionStep](./) objects. Call [execute](execute.md) on each step to submit the transaction. The SDK automatically skips unnecessary steps (e.g., if approval is already granted).

For **server-side apps** or **agentic flows**, call [purchase](../product/common/purchase.md) directly and the SDK handles all transactions sequentially without explicit step management.
