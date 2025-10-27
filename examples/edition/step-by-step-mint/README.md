# Edition Product - Step-by-Step Mint Example

This example demonstrates how to implement a transparent, step-by-step transaction flow for Edition NFT purchases using the Manifold Client SDK. Unlike traditional "one-click" minting, this example gives users explicit control over each transaction step.

## Features

- **Transaction Step Visualization**: Display each transaction step (approvals, minting) in a modal interface
- **Explicit Step Execution**: Users manually execute each step with full visibility
- **Real-time Status Updates**: Visual feedback for pending, executing, completed, and failed states
- **Cost Breakdown**: Clear display of total costs before execution
- **Transaction Details**: Expandable transaction data for transparency
- **Error Handling**: Graceful error handling with user-friendly messages

## Key Concepts

### Transaction Steps

The Manifold SDK's `preparePurchase` method returns a `PreparedPurchase` object containing:

- **steps**: An array of `TransactionStep` objects, each representing a blockchain transaction
- **cost**: Breakdown of costs (item price, gas, total)
- **eligibility**: Verification of user's ability to mint

Each step includes:

- `type`: The type of transaction (e.g., "approval", "mint")
- `description`: Human-readable description
- `data`: Transaction parameters (to, value, data)
- `estimatedGas`: Gas estimate for the transaction
- `execute(account)`: Method to execute the step

### Step Execution Flow

1. **Prepare Purchase**: Call `product.preparePurchase()` to get transaction steps
2. **Display Steps**: Show all steps in a modal with their current status
3. **Execute Sequentially**: Users execute each step one by one
4. **Track Progress**: Update UI as each step completes
5. **Handle Completion**: Close modal and show success message

## Setup

### Prerequisites

- Node.js 18+
- A Manifold Studio account with an Edition product
- An Alchemy API key (optional but recommended)
- A WalletConnect Project ID

### Installation

1. Install dependencies:

```bash
cd examples/edition/step-by-step-mint
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env
```

3. Configure environment variables:

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_INSTANCE_ID=your_edition_instance_id
```

### Finding Your Instance ID

1. Go to [Manifold Studio](https://studio.manifold.xyz/)
2. Navigate to your Edition product
3. Copy the instance ID from the URL: `https://manifold.xyz/@creator/id/[INSTANCE_ID]`

## Running the Example

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
step-by-step-mint/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with providers
│   │   ├── page.tsx          # Main page with UI
│   │   ├── providers.tsx     # RainbowKit and Wagmi setup
│   │   └── globals.css       # Tailwind CSS styles
│   └── components/
│       ├── MintButton.tsx    # Main minting logic (Edition-specific)
│       └── StepModal.tsx     # Transaction step modal
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

## Code Walkthrough

### MintButton Component

The main component that handles the minting process:

```typescript
// Prepare purchase and get steps
const prepared = await product.preparePurchase({
  address,
  payload: { quantity },
});

// Store steps for modal display
setPreparedPurchase(prepared);
setIsModalOpen(true);
```

### StepModal Component

Displays transaction steps with execution controls:

```typescript
// Execute individual step
const handleExecuteStep = async (stepIndex: number) => {
  const step = preparedPurchase.steps[stepIndex];
  const result = await step.execute(account);
  // Update status and move to next step
};
```

### Step Status Management

Track the status of each step:

- `idle`: Step not yet reached
- `pending`: Current step ready for execution
- `executing`: Transaction in progress
- `completed`: Step successfully executed
- `failed`: Step execution failed

## Customization

### Styling

The modal uses Tailwind CSS classes. Customize the appearance by modifying:

- Colors: Update the color scheme in `StepModal.tsx`
- Layout: Adjust spacing and sizes
- Icons: Replace status icons with custom ones

### Step Descriptions

Enhance step descriptions for better UX:

```typescript
const getStepDescription = (step: TransactionStep) => {
  switch (step.type) {
    case 'approval':
      return 'Approve the contract to spend tokens';
    case 'mint':
      return 'Execute the Edition mint transaction';
    default:
      return step.description;
  }
};
```

### Error Handling

Implement custom error handling:

```typescript
catch (error) {
  if (error.code === 'USER_REJECTED') {
    // User cancelled transaction
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    // Not enough funds
  }
  // Handle other errors
}
```

## Best Practices

1. **Always Show Cost**: Display total cost prominently before execution
2. **Provide Context**: Explain what each step does and why it's necessary
3. **Handle Failures Gracefully**: Allow users to retry failed steps
4. **Prevent Double Execution**: Disable buttons during execution
5. **Show Progress**: Indicate which step is current and how many remain

## Comparison with Standard Flow

### Standard Purchase Flow

```typescript
// One-click purchase
const order = await product.purchase({
  account,
  preparedPurchase,
});
```

### Step-by-Step Flow

```typescript
// Manual step execution
for (const step of preparedPurchase.steps) {
  await step.execute(account);
  // Update UI between steps
}
```

## Troubleshooting

### Common Issues

1. **"Missing required data" error**
   - Ensure wallet is connected
   - Verify instance ID is correct
   - Check network compatibility

2. **Steps not executing**
   - Confirm sufficient balance for gas
   - Check if product is active
   - Verify wallet is on correct network

3. **Modal not opening**
   - Check browser console for errors
   - Ensure preparePurchase succeeded
   - Verify environment variables are set

## Advanced Usage

### Batch Operations

For multiple mints, you can prepare multiple purchases:

```typescript
const preparations = await Promise.all(
  instanceIds.map(id => product.preparePurchase({...}))
)
```

### Custom Step Validation

Add validation before executing steps:

```typescript
const validateStep = (step: TransactionStep) => {
  // Check gas price
  // Verify contract state
  // Confirm user balance
  return isValid;
};
```

### Analytics Integration

Track user behavior through the flow:

```typescript
const trackStepExecution = (step, status) => {
  analytics.track('step_executed', {
    step_type: step.type,
    status,
    product_id: instanceId,
  });
};
```

## Resources

- [Manifold Client SDK Documentation](https://github.com/manifoldxyz/client-sdk)
- [Manifold Studio](https://studio.manifold.xyz/)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)

## License

MIT
