# Transaction Steps Guide

## Overview

The Manifold SDK's transaction steps feature provides granular control over multi-transaction operations, enabling developers to build transparent and user-friendly Web3 interfaces. This guide explains how to leverage transaction steps for better UX.

## Why Transaction Steps Matter

In Web3, users should have explicit control and understanding of every transaction they sign. The steps pattern addresses several UX challenges:

1. **Transparency** - Users see what each transaction does before signing
2. **Control** - Users can cancel between steps without losing progress  
3. **Recovery** - Failed steps can be retried without starting over
4. **Education** - New users learn what different transaction types mean

## Understanding the Steps Array

When you call `preparePurchase()`, the returned object includes a `steps` array:

```typescript
const prepared = await product.preparePurchase({
  address: walletAddress,
  payload: { quantity: 1 }
});

console.log(prepared.steps);
// [
//   {
//     id: "approve_usdc_123",
//     name: "Approve USDC",
//     type: "approve",
//     description: "Allow contract to spend 100 USDC",
//     execute: [Function]
//   },
//   {
//     id: "mint_nft_456", 
//     name: "Mint NFT",
//     type: "mint",
//     description: "Mint 1 Edition NFT",
//     execute: [Function]
//   }
// ]
```

## Step Execution Patterns

### Pattern 1: Automatic Execution (Simple)

For simple use cases, use the high-level `purchase()` method:

```typescript
// Executes all steps automatically
const order = await product.purchase({
  account: adapter,
  preparedPurchase: prepared
});
```

### Pattern 2: Manual Execution (Recommended for Production)

For production applications, execute steps individually:

```typescript
async function executePurchase(prepared: PreparedPurchase, adapter: IAccountAdapter) {
  const receipts = [];
  
  for (const step of prepared.steps) {
    // Show user what's about to happen
    const confirmed = await showTransactionModal({
      title: step.name,
      description: step.description,
      type: step.type
    });
    
    if (!confirmed) {
      throw new Error('User cancelled transaction');
    }
    
    // Execute the step
    const receipt = await step.execute(adapter);
    receipts.push(receipt);
    
    // Show success before moving to next step
    await showSuccess(`${step.name} completed!`);
  }
  
  return receipts;
}
```

### Pattern 3: Progressive Enhancement

Build a UI that shows progress through steps:

```typescript
interface StepperProps {
  steps: TransactionStep[];
  adapter: IAccountAdapter;
}

function TransactionStepper({ steps, adapter }: StepperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [receipts, setReceipts] = useState<TransactionReceipt[]>([]);
  const [status, setStatus] = useState<'idle' | 'executing' | 'complete'>('idle');
  
  const executeCurrentStep = async () => {
    const step = steps[currentIndex];
    setStatus('executing');
    
    try {
      const receipt = await step.execute(adapter);
      setReceipts([...receipts, receipt]);
      
      if (currentIndex < steps.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setStatus('idle');
      } else {
        setStatus('complete');
      }
    } catch (error) {
      setStatus('idle');
      // Handle error
    }
  };
  
  return (
    <div>
      {steps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          status={
            index < currentIndex ? 'complete' :
            index === currentIndex ? status :
            'pending'
          }
          onExecute={index === currentIndex ? executeCurrentStep : undefined}
        />
      ))}
    </div>
  );
}
```

## Common Step Types

### Approval Steps

Approval steps grant permission for a contract to spend tokens:

```typescript
if (step.type === 'approve') {
  // Special handling for approvals
  const tokenInfo = await getTokenInfo(step.cost?.erc20s?.[0]);
  
  await displayApprovalWarning({
    token: tokenInfo.symbol,
    amount: step.cost?.erc20s?.[0]?.formatted,
    spender: contractAddress,
    message: `This allows the contract to spend up to ${amount} ${symbol}`
  });
}
```

### Mint Steps

Mint steps create the actual NFT:

```typescript
if (step.type === 'mint') {
  // Show minting details
  await displayMintDetails({
    quantity: payload.quantity,
    cost: step.cost?.native?.formatted,
    gasEstimate: prepared.gasEstimate?.formatted
  });
}
```

## Error Handling

### Handling Specific Errors

```typescript
async function executeStepSafely(step: TransactionStep, adapter: IAccountAdapter) {
  try {
    return await step.execute(adapter);
  } catch (error) {
    if (error.code === 'TRANSACTION_REJECTED') {
      // User rejected - don't retry
      showMessage('Transaction cancelled by user');
      return null;
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      // Show funding options
      const funded = await showFundingModal({
        required: step.cost?.native,
        current: await adapter.getBalance()
      });
      
      if (funded) {
        // Retry after funding
        return await step.execute(adapter);
      }
    }
    
    if (error.code === 'LEDGER_ERROR') {
      // Ledger-specific guidance
      showMessage('Please enable blind signing on your Ledger device');
      return null;
    }
    
    throw error; // Unhandled error
  }
}
```

### Recovery Strategies

```typescript
class PurchaseManager {
  private completedSteps: string[] = [];
  
  async resumePurchase(
    prepared: PreparedPurchase,
    adapter: IAccountAdapter,
    fromStep = 0
  ) {
    // Skip already completed steps
    const remainingSteps = prepared.steps.slice(fromStep);
    
    for (const step of remainingSteps) {
      if (this.completedSteps.includes(step.id)) {
        console.log(`Skipping completed step: ${step.name}`);
        continue;
      }
      
      const receipt = await this.executeWithRecovery(step, adapter);
      this.completedSteps.push(step.id);
      
      // Save progress to localStorage
      this.saveProgress();
    }
  }
  
  private saveProgress() {
    localStorage.setItem('purchase_progress', JSON.stringify({
      completedSteps: this.completedSteps,
      timestamp: Date.now()
    }));
  }
}
```

## Best Practices

### 1. Always Show Step Details

```typescript
function StepDetails({ step }: { step: TransactionStep }) {
  return (
    <div>
      <h3>{step.name}</h3>
      <p>{step.description}</p>
      
      {step.type === 'approve' && (
        <Alert type="info">
          This transaction approves the contract to spend your tokens.
          You'll only need to do this once.
        </Alert>
      )}
      
      {step.cost && (
        <CostBreakdown cost={step.cost} />
      )}
    </div>
  );
}
```

### 2. Implement Step Validation

```typescript
async function validateStep(
  step: TransactionStep,
  adapter: IAccountAdapter
): Promise<{ valid: boolean; reason?: string }> {
  // Check balance for the step
  if (step.cost?.native) {
    const balance = await adapter.getBalance();
    if (balance.value < step.cost.native.value) {
      return { 
        valid: false, 
        reason: 'Insufficient balance for this step' 
      };
    }
  }
  
  // Check network
  const networkId = await adapter.getConnectedNetworkId();
  if (networkId !== requiredNetworkId) {
    return { 
      valid: false, 
      reason: `Please switch to network ${requiredNetworkId}` 
    };
  }
  
  return { valid: true };
}
```

### 3. Provide Clear Status Updates

```typescript
enum StepStatus {
  Pending = 'pending',
  Executing = 'executing',
  Confirming = 'confirming',
  Complete = 'complete',
  Failed = 'failed'
}

function useStepExecution(step: TransactionStep, adapter: IAccountAdapter) {
  const [status, setStatus] = useState<StepStatus>(StepStatus.Pending);
  const [error, setError] = useState<Error>();
  const [receipt, setReceipt] = useState<TransactionReceipt>();
  
  const execute = async () => {
    setStatus(StepStatus.Executing);
    setError(undefined);
    
    try {
      const receipt = await step.execute(adapter, {
        callbacks: {
          onProgress: (progress) => {
            if (progress.status === 'pending') {
              setStatus(StepStatus.Confirming);
            }
          }
        }
      });
      
      setReceipt(receipt);
      setStatus(StepStatus.Complete);
    } catch (err) {
      setError(err);
      setStatus(StepStatus.Failed);
    }
  };
  
  return { execute, status, error, receipt };
}
```

## Real-World Example: ERC20 Purchase Flow

```typescript
// Complete implementation of a stepped purchase flow
async function handleERC20Purchase(
  product: Product,
  adapter: IAccountAdapter
) {
  // 1. Prepare the purchase
  const prepared = await product.preparePurchase({
    address: adapter.address,
    payload: { quantity: 1 }
  });
  
  // 2. Show total cost and steps
  const userConfirmed = await showPurchaseOverview({
    totalCost: prepared.cost.total.formatted,
    steps: prepared.steps.map(s => ({
      name: s.name,
      type: s.type
    }))
  });
  
  if (!userConfirmed) return;
  
  // 3. Execute each step with UI feedback
  for (const [index, step] of prepared.steps.entries()) {
    // Show step modal
    updateUI({
      title: `Step ${index + 1} of ${prepared.steps.length}`,
      current: step.name,
      progress: (index / prepared.steps.length) * 100
    });
    
    // Special handling for approval
    if (step.type === 'approve') {
      const approvalConfirmed = await showApprovalModal({
        token: 'USDC',
        amount: step.cost?.erc20s?.[0]?.formatted,
        purpose: 'NFT Purchase'
      });
      
      if (!approvalConfirmed) {
        throw new Error('Purchase cancelled during approval');
      }
    }
    
    // Execute the step
    try {
      const receipt = await step.execute(adapter, {
        confirmations: 1
      });
      
      // Show success
      showToast({
        type: 'success',
        message: `${step.name} completed`,
        txHash: receipt.txHash
      });
      
    } catch (error) {
      // Handle failure
      const retry = await showErrorModal({
        step: step.name,
        error: error.message,
        canRetry: error.code !== 'TRANSACTION_REJECTED'
      });
      
      if (retry) {
        // Retry logic
        index--; // Retry current step
      } else {
        throw error;
      }
    }
  }
  
  // 4. Show completion
  showSuccess({
    title: 'Purchase Complete!',
    message: 'Your NFT has been minted successfully'
  });
}
```

## Testing Transaction Steps

```typescript
// Mock step execution for testing
function createMockStep(
  name: string,
  type: TransactionStepType,
  delay = 1000
): TransactionStep {
  return {
    id: `mock_${Date.now()}`,
    name,
    type,
    description: `Mock ${type} step`,
    execute: async (adapter: IAccountAdapter) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return {
        networkId: 1,
        step: name,
        txHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 12345,
        status: 'confirmed'
      };
    }
  };
}

// Test your UI with mock steps
const mockSteps = [
  createMockStep('Approve USDC', 'approve'),
  createMockStep('Mint NFT', 'mint')
];
```

## Summary

Transaction steps provide the foundation for building user-friendly Web3 interfaces. By executing steps individually:

- Users maintain control over their transactions
- Complex operations become understandable
- Failed transactions can be recovered gracefully
- The overall experience matches Web3 best practices

Remember: In Web3, transparency and user control are paramount. Transaction steps help achieve both.