# transactionData

The `transactionData` field provides raw blockchain transaction data that can be used for custom transaction execution, bypassing the SDK's built-in execution logic.

## Overview

Each `TransactionStep` contains a `transactionData` object with all the information needed to execute the transaction directly using your preferred Web3 library (ethers, viem, web3.js, etc.).

## TransactionData Interface

```typescript
interface TransactionData {
  value: bigint; // Amount of native token (ETH) to send
  contractAddress: string; // Target contract address
  transactionData: string; // Encoded function call data (hex string)
  gasEstimate: bigint; // Estimated gas for the transaction
  networkId: number; // Chain ID for the transaction
}
```

## Use Cases

Custom transaction execution is useful for:

- **EIP-7702 Support**: Account abstraction and smart contract wallets
- **Custom Gas Management**: Implement your own gas strategies
- **Transaction Infrastructure**: Integrate with existing transaction systems
- **Batch Transactions**: Combine multiple transactions
- **Custom Wallet Implementations**: Use non-standard wallet providers
- **Transaction Queuing**: Queue transactions for later execution
- **Advanced Error Handling**: Implement custom retry logic

## Complete Example: Custom Transaction Execution

This example from the SDK demonstrates how to extract and use `transactionData` for custom execution:

```typescript
import { createClient, isEditionProduct } from '@manifoldxyz/client-sdk';
import { createWalletClient, createPublicClient, http, type Hex, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

async function customMint() {
  // Step 1: Prepare the purchase using Manifold SDK
  const client = createClient({
    httpRPCs: {
      11155111: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
    },
  });

  const product = await client.getProduct('4133757168');
  if (!isEditionProduct(product)) {
    throw new Error('Not an Edition product');
  }

  // Prepare purchase for wallet address
  const preparedPurchase = await product.preparePurchase({
    userAddress: '0xYourWalletAddress',
    payload: { quantity: 1 },
  });

  // Step 2: Extract transaction data from steps
  console.log(`Total steps: ${preparedPurchase.steps.length}`);

  for (const step of preparedPurchase.steps) {
    console.log(`Step: ${step.name} (${step.type})`);
    console.log(`  Contract: ${step.transactionData.contractAddress}`);
    console.log(`  Value: ${step.transactionData.value} wei`);
    console.log(`  Gas estimate: ${step.transactionData.gasEstimate}`);
    console.log(`  Network: Chain ID ${step.transactionData.networkId}`);
  }

  // Step 3: Execute using custom logic with viem
  const account = privateKeyToAccount('0xYourPrivateKey');

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // Execute each step with custom parameters
  for (const step of preparedPurchase.steps) {
    const { contractAddress, transactionData, value, gasEstimate } = step.transactionData;

    // Custom gas management - 10% buffer instead of default 20%
    const customGasLimit = (BigInt(gasEstimate) * 110n) / 100n;

    console.log(`Executing ${step.name}...`);

    // Send transaction with custom parameters
    const txHash = await walletClient.sendTransaction({
      to: contractAddress as Address,
      data: transactionData as Hex,
      value: value ? BigInt(value) : 0n,
      gas: customGasLimit,
      // Add custom parameters:
      // maxFeePerGas: ...,
      // maxPriorityFeePerGas: ...,
      // nonce: ...,
    });

    console.log(`Transaction hash: ${txHash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      // Optional: custom confirmation blocks
      // confirmations: 2,
    });

    console.log(`Status: ${receipt.status}`);
    console.log(
      `Gas used: ${receipt.gasUsed} (${(receipt.gasUsed * 100n) / customGasLimit}% of limit)`,
    );
  }
}
```

## Step-by-Step Breakdown

### 1. Prepare Purchase

First, use the SDK normally to prepare the purchase:

```typescript
const preparedPurchase = await product.preparePurchase({
  userAddress: walletAddress,
  payload: { quantity: 1 },
});
```

### 2. Inspect Transaction Data

Each step contains the raw transaction data:

```typescript
preparedPurchase.steps.forEach((step) => {
  const txData = step.transactionData;
  console.log('Contract:', txData.contractAddress);
  console.log('Value:', txData.value);
  console.log('Data:', txData.transactionData);
  console.log('Gas Estimate:', txData.gasEstimate);
  console.log('Network ID:', txData.networkId);
});
```

### 3. Custom Execution

Execute with your preferred method:

```typescript
// Example with ethers v5
const tx = await signer.sendTransaction({
  to: step.transactionData.contractAddress,
  data: step.transactionData.transactionData,
  value: step.transactionData.value,
  gasLimit: step.transactionData.gasEstimate,
});

// Example with viem
const hash = await walletClient.sendTransaction({
  to: step.transactionData.contractAddress as `0x${string}`,
  data: step.transactionData.transactionData as `0x${string}`,
  value: BigInt(step.transactionData.value),
  gas: BigInt(step.transactionData.gasEstimate),
});

// Example with web3.js
const receipt = await web3.eth.sendTransaction({
  to: step.transactionData.contractAddress,
  data: step.transactionData.transactionData,
  value: step.transactionData.value.toString(),
  gas: step.transactionData.gasEstimate.toString(),
});
```

## Benefits of Custom Execution

### Gas Optimization

```typescript
// Implement custom gas buffer strategy
const customGasLimit = (gasEstimate * 105n) / 100n; // 5% buffer
const customMaxFee = await calculateOptimalGasPrice();
```

### Error Handling

```typescript
try {
  const receipt = await sendTransaction(txData);
  if (receipt.status === 'reverted') {
    // Custom retry logic
    await retryWithHigherGas(txData);
  }
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    // Handle insufficient funds
  } else if (error.code === 'NONCE_TOO_LOW') {
    // Handle nonce issues
  }
}
```

### Transaction Batching

```typescript
// Collect all transactions
const transactions = preparedPurchase.steps.map((step) => ({
  to: step.transactionData.contractAddress,
  data: step.transactionData.transactionData,
  value: step.transactionData.value,
}));

// Execute as batch (if supported by wallet)
await wallet.sendBatch(transactions);
```

## Important Notes

1. **Order Matters**: Execute steps in the order provided - later steps may depend on earlier ones (e.g., approval before mint)

2. **Network Verification**: Always verify the `networkId` matches your expected chain

3. **Gas Estimates**: The provided `gasEstimate` is conservative. You can adjust based on your needs

4. **Value Field**: The `value` field is in wei. Convert as needed for display

5. **Error Handling**: Implement proper error handling for failed transactions

## See Also

- [TransactionStep](../../reference/transactionstep.md) - Complete step interface
- [execute](./execute.md) - Built-in execution method
- [PreparedPurchase](../../reference/preparedpurchase.md) - Purchase preparation
