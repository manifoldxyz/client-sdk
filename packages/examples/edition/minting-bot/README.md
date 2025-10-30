# Edition Minting Bot Examples

This directory contains examples demonstrating different ways to mint Edition NFTs using the Manifold Client SDK.

## Examples

### 1. Basic Minting Bot (`src/index.ts`)
Shows the simplest way to mint an Edition product programmatically with the SDK's built-in transaction execution.

### 2. Custom Transaction Execution (`src/custom-transaction.ts`)
Demonstrates how to use the new `transactionData` field to execute transactions directly using viem's `sendTransaction`, giving you full control over the transaction lifecycle.

## Prerequisites

- Node.js 18 or newer
- pnpm (the repo is configured for pnpm workspaces)

## Setup

1. Install the workspace dependencies (from the repository root). This links the example to the local `@manifoldxyz/client-sdk` package:
   ```bash
   pnpm install
   pnpm --filter @manifoldxyz/client-sdk build
   ```

2. Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```

   ### Environment Variables
   | Variable | Description |
   | --- | --- |
   | `INSTANCE_ID` | Edition instance ID from Manifold Studio |
   | `NETWORK_ID` | Numeric chain ID for the product (e.g. `1` for Ethereum mainnet, `8453` for Base) |
   | `RPC_URL` | HTTPS RPC endpoint for the target chain |
   | `WALLET_PRIVATE_KEY` | Private key for the wallet that will mint (no `0x` prefix) |
   | `MINT_QUANTITY` | Optional quantity to mint (defaults to `1`) |

## Running the Examples

### Basic Minting Bot
```bash
pnpm --filter @manifoldxyz/example-edition-minting-bot run start
```

This performs the following steps:
1. Loads environment variables with `dotenv`.
2. Creates a Manifold client with the provided RPC endpoint.
3. Fetches the product and verifies that it is an Edition product.
4. Creates a viem wallet and wraps it with the SDK's `createAccountViem` adapter.
5. Calls `preparePurchase` to validate eligibility and gather cost details.
6. Executes `product.purchase()` with the returned `preparedPurchase`. The SDK handles any required transactions automatically.

### Custom Transaction Execution
```bash
pnpm --filter @manifoldxyz/example-edition-minting-bot run start:custom
```

This example demonstrates direct transaction execution using viem:

#### Key Features
1. **Raw Transaction Data**: Extracts `transactionData` field from SDK preparation
2. **Custom Gas Management**: Implement your own gas buffer strategies
3. **Direct Execution**: Use viem's `sendTransaction` directly
4. **Full Control**: Complete control over nonce, gas price, and other parameters

#### How It Works

1. **Preparation Phase**
   - SDK prepares the mint transaction
   - Raw transaction data is extracted from steps
   
2. **Execution Phase**
   - Loop through each step (approvals, mints, etc.)
   - Execute transactions directly with viem
   - Custom gas limits and error handling
   
3. **Receipt Handling**
   - Manual receipt processing
   - Event log analysis
   - Custom status tracking

#### Use Cases

- **EIP-7702**: Implement delegation-based transactions
- **Custom Gas Strategies**: Implement your own gas pricing logic
- **Transaction Queuing**: Batch and queue transactions
- **Retry Logic**: Custom retry mechanisms for failures
- **Integration**: Use with existing transaction infrastructure
- **Monitoring**: Custom logging and tracking systems
- **Account Abstraction**: Build AA solutions like EIP-4337

## Understanding the transactionData Field

The `transactionData` field is a new addition to the SDK that exposes the raw transaction details for each step in the purchase process. This enables developers to:

1. **Build Custom Executors**: Implement your own transaction submission logic
2. **Integrate with Account Abstraction**: Use with EIP-4337, EIP-7702, or custom AA solutions
3. **Batch Transactions**: Combine multiple operations efficiently
4. **Gas Optimization**: Fine-tune gas settings for specific use cases

Each `TransactionStep` now includes:
```typescript
transactionData: {
  contractAddress: string;    // Target contract
  transactionData: string;    // Encoded function call
  gasEstimate: bigint;       // Estimated gas needed
  networkId: number;         // Chain ID
  value?: bigint;           // ETH value to send (if any)
}
```

## Advanced Examples

### Implementing EIP-7702 Delegation

Using the custom transaction example as a base, you can implement EIP-7702 delegation:

1. Extract transaction data using the SDK
2. Create authorization for delegation contract
3. Send transactions through delegation
4. Enable gas sponsorship patterns

### Batch Transaction Processing

The custom transaction pattern enables:
- Sequential nonce management
- Parallel transaction submission
- Custom retry strategies
- Queue-based execution

### Integration with Relayers

Use the `transactionData` field to:
- Send transactions through Gelato or Biconomy
- Implement meta-transactions
- Use account abstraction providers
- Integrate with custom wallet infrastructure

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**: Ensure all required variables are set in `.env`
2. **"Insufficient funds"**: The wallet needs ETH for gas and mint costs
3. **Transaction failures**: Check gas estimates and network congestion
4. **Type errors**: Make sure to rebuild the SDK after changes: `pnpm --filter @manifoldxyz/client-sdk build`

### Debugging Tips

- Use the detailed logging in custom transaction example to debug issues
- Check transaction receipts for revert reasons
- Monitor gas usage vs. estimates
- Verify contract addresses and network IDs

## Further Reading

- [Viem Documentation](https://viem.sh)
- [Manifold SDK Documentation](../../docs/README.md)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Account Abstraction Overview](https://ethereum.org/en/roadmap/account-abstraction/)