# Edition Minting Bot Examples

This directory contains examples demonstrating different ways to mint Edition NFTs using the Manifold Client SDK.

## Examples

### 1. Basic Minting Bot (`src/index.ts`)
Shows the simplest way to mint an Edition product programmatically with the SDK's built-in transaction execution.

### 2. Custom Transaction Execution (`src/custom-transaction.ts`)
Demonstrates how to use the new `transactionData` field to execute transactions directly using viem's `sendTransaction`, giving you full control over the transaction lifecycle.

### 3. EIP-7702 Sponsored Transactions (`src/eip7702-sponsored.ts`)
Advanced example showing how to use the new `transactionData` field to implement custom transaction execution with EIP-7702 delegation for gas sponsorship.

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

   ### Basic Minting Configuration
   | Variable | Description |
   | --- | --- |
   | `INSTANCE_ID` | Edition instance ID from Manifold Studio |
   | `NETWORK_ID` | Numeric chain ID for the product (e.g. `1` for Ethereum mainnet, `8453` for Base) |
   | `RPC_URL` | HTTPS RPC endpoint for the target chain |
   | `WALLET_PRIVATE_KEY` | Private key for the wallet that will mint (no `0x` prefix) |
   | `MINT_QUANTITY` | Optional quantity to mint (defaults to `1`) |

   ### EIP-7702 Sponsored Transaction Configuration
   Additional variables needed for sponsored transactions:
   | Variable | Description |
   | --- | --- |
   | `SPONSOR_PRIVATE_KEY` | Private key of the sponsor account (pays for gas and mint costs) |
   | `USER_PRIVATE_KEY` | Private key of the user account (receives the NFT) |
   | `DELEGATION_CONTRACT_ADDRESS` | Optional: Address of pre-deployed delegation contract |

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
   - Loop through each step
   - Execute transactions directly with viem
   - Custom gas limits and error handling
   
3. **Receipt Handling**
   - Manual receipt processing
   - Event log analysis
   - Custom status tracking

#### Use Cases

- **Custom Gas Strategies**: Implement your own gas pricing logic
- **Transaction Queuing**: Batch and queue transactions
- **Retry Logic**: Custom retry mechanisms for failures
- **Integration**: Use with existing transaction infrastructure
- **Monitoring**: Custom logging and tracking systems

### EIP-7702 Sponsored Transactions
```bash
pnpm --filter @manifoldxyz/example-edition-minting-bot run start:eip7702
```

This advanced example demonstrates:

#### Key Features
1. **Transaction Data Extraction**: Uses the new `transactionData` field from prepared steps to get raw transaction details
2. **EIP-7702 Delegation**: User authorizes a delegation contract to act on their behalf
3. **Gas Sponsorship**: Sponsor pays for both gas and mint costs while NFT goes to the user
4. **Custom Execution**: Bypasses SDK's built-in execution to implement custom transaction flow

#### How It Works

1. **Setup Phase**
   - Sponsor and user accounts are initialized
   - Delegation contract is deployed (or existing one is used)
   
2. **Authorization Phase**
   - User signs an EIP-7702 authorization for the delegation contract
   - This allows the contract to execute transactions on the user's behalf
   
3. **Preparation Phase**
   - SDK prepares the mint transaction for the user's address
   - Raw transaction data is extracted from the `transactionData` field
   - Any required token approvals are identified
   
4. **Execution Phase**
   - Sponsor executes approvals (if needed) via delegation
   - Sponsor executes the mint transaction via delegation
   - Sponsor pays all gas and mint costs
   - NFT is minted directly to the user's address

#### Benefits of This Approach

- **No Gas Required**: Users can mint NFTs without holding ETH
- **Batch Operations**: Can be extended to sponsor multiple users
- **Custom Logic**: Full control over transaction execution
- **Account Abstraction**: Foundation for complex AA patterns
- **Better UX**: Remove gas friction for mainstream users

#### Real-World Use Cases

- **Onboarding**: New users can mint without acquiring ETH first
- **Airdrops**: Efficiently sponsor mints for community members
- **Gaming**: In-game NFT rewards without gas requirements
- **Enterprise**: Companies sponsor NFTs for customers/employees
- **Events**: Conference attendees claim POAPs without gas

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
}
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**: Ensure all required variables are set in `.env`
2. **"Insufficient funds"**: The sponsor account needs ETH for gas and mint costs
3. **"Authorization failed"**: Ensure the delegation contract is properly deployed
4. **Type errors**: Make sure to rebuild the SDK after changes: `pnpm --filter @manifoldxyz/client-sdk build`

### Network Support

EIP-7702 is currently supported on:
- Ethereum Sepolia (testnet)
- Networks with EIP-7702 enabled

Check your network's documentation for EIP-7702 support status.

## Further Reading

- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)
- [Viem EIP-7702 Documentation](https://viem.sh/docs/eip7702)
- [Manifold SDK Documentation](../../docs/README.md)
- [Account Abstraction Overview](https://ethereum.org/en/roadmap/account-abstraction/)