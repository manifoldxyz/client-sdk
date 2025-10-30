# Edition Minting Bot (Basic)

This example shows the simplest way to mint an Edition product programmatically with the Manifold Client SDK. It prepares the purchase and calls `product.purchase()` directly, so you do not have to manage individual transaction steps yourself.

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

   | Variable | Description |
   | --- | --- |
   | `INSTANCE_ID` | Edition instance ID from Manifold Studio |
   | `NETWORK_ID` | Numeric chain ID for the product (e.g. `1` for Ethereum mainnet, `8453` for Base) |
   | `RPC_URL` | HTTPS RPC endpoint for the target chain |
   | `WALLET_PRIVATE_KEY` | Private key for the wallet that will mint (no `0x` prefix) |
   | `MINT_QUANTITY` | Optional quantity to mint (defaults to `1`) |

3. Run the bot:
   ```bash
   pnpm --filter @manifoldxyz/example-edition-minting-bot run start
   ```

## How it works

`src/index.ts` performs the following steps:

1. Loads environment variables with `dotenv`.
2. Creates a Manifold client with the provided RPC endpoint.
3. Fetches the product and verifies that it is an Edition product.
4. Creates an ethers v5 wallet and wraps it with the SDK’s `createAccountEthers5` adapter.
5. Calls `preparePurchase` to validate eligibility and gather cost details.
6. Executes `product.purchase()` with the returned `preparedPurchase`. The SDK handles any required transactions automatically.

The script logs the transaction hashes returned in the order receipts so you can monitor progress in your block explorer of choice.
