# Blind Minting Bot (Basic)

A minimal, headless example that mints a Blind Mint product using the Manifold Client SDK. This flow relies on `product.purchase()` so you can execute the full mint with a single call—no manual transaction step handling required.

## Prerequisites

- Node.js 18 or newer
- Build the SDK once from the repository root so the local `dist/` output is up to date:
  ```bash
  npm install
  npm run build
  ```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and supply your settings:
   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `INSTANCE_ID` | Blind Mint instance ID from Manifold Studio |
   | `NETWORK_ID` | Numeric chain ID for the drop (e.g. `8453` for Base) |
   | `RPC_URL` | HTTPS RPC endpoint for the network |
   | `WALLET_PRIVATE_KEY` | Private key for the wallet executing the mint (without the `0x` prefix) |
   | `MINT_QUANTITY` | Optional quantity to mint (defaults to `1`) |

3. Run the bot:
   ```bash
   npm run start
   ```

## Flow overview

`src/index.ts` performs a straightforward mint:

1. Loads environment variables with `dotenv`.
2. Creates a Manifold client configured with your RPC URL.
3. Fetches the product and confirms it is a Blind Mint via `isBlindMintProduct`.
4. Instantiates an ethers v5 wallet and wraps it with the `createAccountEthers5` adapter.
5. Calls `preparePurchase` to run all eligibility and cost checks.
6. Submits `product.purchase()` using the prepared purchase response; the SDK runs any required transactions for you.

When the mint succeeds, the script prints the transaction hashes returned in the order receipts for easy tracking.
