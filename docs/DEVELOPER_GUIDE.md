# Manifold Client SDK Developer Guide

Build rich, headless minting experiences backed by Manifold Studio products. This guide covers the end-to-end developer journey—from spinning up your first product to shipping production-ready apps powered by the Manifold Client SDK.

## Why Manifold Client SDK?

- **Headless storefronts** – Pair Manifold’s product engine with fully custom UIs.
- **No API keys required** – Start building immediately against public endpoints.
- **TypeScript-first** – Strong types, rich IntelliSense, and strict linting guardrails.
- **Wallet agnostic** – Official support for ethers v5 and viem, with more adapters coming.
- **Complete purchase flow** – Fetch products, check allocations, simulate pricing, and execute transactions safely.
- **Transaction step UX** – Present multi-step flows (approvals, mints, relays) with full transparency.

## Getting Started

### Requirements

- Node.js **18+** (`package.json:75`)
- npm (ships with Node 18+)
- Access to [Manifold Studio](https://studio.manifold.xyz/) to configure products
- Optional RPC endpoints if you plan to execute transactions (Alchemy, Infura, custom infrastructure)

### Installation

Install the SDK in your project:

```bash
npm install @manifoldxyz/client-sdk
```

Add peer dependencies as needed:

- `ethers@^5.7.2` (runtime dependency)
- `viem@^2.0.0` (optional peer, already bundled for tests and examples)

### Quick Start

```ts
import { createClient } from '@manifoldxyz/client-sdk';

const client = createClient({
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
  },
});

const product = await client.getProduct('4150231280');
const prepared = await product.preparePurchase({
  address: '0xBuyer',
  payload: { quantity: 1 },
});

const order = await product.purchase({
  account: walletAdapter,
  preparedPurchase: prepared,
});
```

## Create Your First Product

1. Visit [studio.manifold.xyz](https://studio.manifold.xyz/) and sign in.
2. Choose a product type (Edition, Burn/Redeem, Blind Mint).
3. Configure metadata, allowlists, supply caps, and price.
4. Publish the product and note the **instance ID** in the URL.
5. Use the instance ID or shareable URL with `client.getProduct`.

> Tip: Workspace IDs (needed for `getProductsByWorkspace`) are displayed in the Studio header.

## Building with AI

Leverage code-generation tools to accelerate integrations:

- Prompt AI assistants with the SDK Quick Start plus your product instance details to scaffold transaction flows.
- Generate UI skeletons (e.g., React components) then wire them to the SDK APIs documented below.
- Use structured prompts to draft transaction step modals, error messaging, and localization strings; validate against the TypeScript types exported by the SDK.
- When using AI for onchain automation (bots, scheduled mints), pair generated code with unit tests (`vitest`) and dry-run logic before executing on mainnet.

## How-To Guides

### Creating a React Minting App

The repo ships with a full example at `examples/rainbowkit-mint/`.

1. **Install dependencies**
   ```bash
   cd examples/rainbowkit-mint
   npm install
   ```
2. **Configure environment** – Copy `.env.example` to `.env` and set RPC endpoints plus app configuration.
3. **Run locally**
   ```bash
   npm run dev
   ```
4. **Key patterns**
   - `src/app/providers.tsx` wires RainbowKit + Wagmi.
   - `src/components/MintButton.tsx` calls `product.preparePurchase` then `product.purchase`.
   - Error states bubble through React toasts—mirror this pattern for user-friendly UX.

### Creating a Minting Bot

Automate purchases or analytics with Node + SDK.

```ts
import { createClient } from '@manifoldxyz/client-sdk';
import { ethers5Adapter } from '@manifoldxyz/client-sdk/adapters';

const client = createClient({
  httpRPCs: { 1: process.env.MAINNET_RPC! },
});

const product = await client.getProduct('INSTANCE_ID');
const prepared = await product.preparePurchase({
  address: wallet.address,
  payload: { quantity: 1 },
});

const order = await product.purchase({
  account: ethers5Adapter({ signer: wallet }),
  preparedPurchase: prepared,
});

console.log(order.status, order.receipts.map((r) => r.txHash));
```

Best practices:

- Run `product.getStatus()` before attempting a purchase.
- Handle `ClientSDKError` codes (eligibility, sold out, insufficient funds).
- Throttle polling; respect RPC rate limits.
- Dry run on testnets (Sepolia ID `11155111`) before mainnet execution.

### Using a Custom Web3 Provider

The SDK builds providers via `createProvider` (`src/utils/provider-factory.ts`). Supply custom RPC URLs to leverage private infrastructure or bridge providers.

```ts
const client = createClient({
  httpRPCs: {
    1: 'https://my-node.example.com',
    8453: 'https://base.custom-rpc.io',
  },
});
```

To integrate with bespoke wallet stacks:

- Implement the `IAccount` adapter interface (`src/types/account-adapter.ts`).
- Forward `sendTransaction`, `waitForTx`, and `getAddress` to your signer.
- Register the adapter when calling `product.purchase`.

## FAQ

- **Do I need an API key?** No—public endpoints work out of the box. Provide RPC keys only when executing transactions.
- **Which networks are supported?** Ethereum (1), Base (8453), Optimism (10), Shape (360), Sepolia testnet (`docs/Manifold_Client_SDK-Complete_Developer_Guide.md`).
- **How do I check allowlist eligibility?** Call `product.getAllocations({ recipientAddress })`.
- **What happens if a step fails?** Catch the error, show context to users, and allow retries. Transaction steps expose `execute()` for manual control (`docs/TRANSACTION_STEPS_GUIDE.md`).
- **Can I fetch multiple products?** Use `client.getProductsByWorkspace(workspaceId, options)`.
- **Where do I file issues?** [GitHub Issues](https://github.com/manifoldxyz/client-sdk) or Manifold support.

## SDK Reference

### Concepts

#### Manifold Client

`createClient` returns an object with:

- `providers`: lazily created ethers `JsonRpcProvider` instances keyed by network ID (`src/client/index.ts:68`–`src/client/index.ts:82`).
- `getProduct`: Fetches instance + preview data via Studio Apps client.
- `getProductsByWorkspace`: (Implementation placeholder) intended for workspace listings.

The client enforces instance ID validation (`validateInstanceId`) and URL parsing (`parseManifoldUrl`) before hitting the API.

#### Product

Calling `getProduct` returns a product object with a consistent shape across Manifold app types:

- **Identity** – `id` (numeric instance ID) and `type` (`AppType`) identify the product (`src/types/product.ts:21`–`src/types/product.ts:40`).
- **Metadata** – `data.publicData` contains Studio configuration (title, media, pricing, network), while `previewData` exposes lightweight card content from Studio previews.
- **Status helpers** – `getStatus()` resolves to `active`, `upcoming`, `ended`, or `sold-out` after reading on-chain state (`src/products/blindmint.ts:593`–`src/products/blindmint.ts:606`).
- **Eligibility** – `getAllocations({ recipientAddress })` reports if a wallet can mint and remaining quantity (`src/products/blindmint.ts:608`–`src/products/blindmint.ts:626`).
- **Preparation** – `preparePurchase(params)` simulates the mint, calculates totals, and returns a `PreparedPurchase` with a `steps` array for UX display (`src/products/blindmint.ts:205`–`src/products/blindmint.ts:355`).
- **Execution** – `purchase({ account, preparedPurchase })` iterates through steps, sending transactions with your chosen adapter and returning an `Order` containing receipts.
- **On-chain data** – Products expose `fetchOnchainData(force?)` to load supply, pricing, and timing details directly from contracts, caching results for reuse (`src/products/blindmint.ts:141`–`src/products/blindmint.ts:203`).

Product instances are created per type (Edition, Burn/Redeem, Blind Mint). Each specialization layers additional methods and type guards while preserving this shared core API.

#### Transaction Steps

`preparePurchase` responses include a `steps` array describing each transaction. Present these steps in your UI for transparency and resilience (`docs/TRANSACTION_STEPS_GUIDE.md`).

### Core API

#### `createClient(config?: ClientConfig)`

- **Parameters**
  - `httpRPCs`: Record<networkId, rpcUrl> (required for purchases).
  - `debug`: boolean flag for verbose logging.
- **Returns** `ManifoldClient`.
- **Errors**: Throws `ClientSDKError` when RPC configuration is invalid.

#### `getProduct(instanceIdOrUrl: string)`

- Accepts a Manifold URL (`https://manifold.xyz/@creator/id/123`) or raw instance ID.
- Validates format and fetches instance data via `createManifoldApiClient`.
- Returns a typed product (Edition, Burn/Redeem, Blind Mint). Currently Blind Mint is fully implemented (`src/client/index.ts:147`–`src/client/index.ts:159`).
- Throws `ClientSDKError` with codes:
  - `INVALID_INPUT` for malformed IDs/URLs.
  - `NOT_FOUND` when API returns 404.
  - `UNSUPPORTED_PRODUCT_TYPE` if the product type is not yet implemented.

### Adapters

Adapters implement the `IAccount` contract (`src/types/account-adapter.ts`) and translate SDK calls to wallet libraries.

#### ethers v5 (`src/adapters/ethers5-adapter.ts`)

- Wraps an ethers v5 `Signer`.
- Provides `getAddress`, `sendTransaction`, `waitForTransaction`.
- Handles chain ID detection and error normalization in tests (`tests/adapters/ethers5-adapter.test.ts`).

#### ethers v6 (coming soon)

- Planned implementation will follow the same interface using ethers v6 `AbstractSigner`.
- Track progress via repository release notes.

#### viem (`src/adapters/viem-adapter.ts`)

- Accepts a `WalletClient` + optional `PublicClient`.
- Supports chain switching via `walletClient.switchChain`.
- Streams transaction status back to consumers.
- See `tests/adapters/viem-adapter.test.ts` for usage patterns.

### Product Types

#### Edition Product

Editions represent fixed or open edition NFT drops.

##### Methods

- `getAllocations({ recipientAddress })`
  - Returns eligibility, reason, and remaining quantity.
- `preparePurchase({ address, payload, networkId?, gasBuffer? })`
  - Simulates the purchase, returns cost breakdown + steps.
- `purchase({ account, preparedPurchase })`
  - Executes steps sequentially using the provided adapter.

##### Types

- `EditionOnchainData`
  - Contract addresses, mint price, supply metrics, start/end timestamps.
- `EditionPublicData`
  - Title, description, media assets, creator info.

> Implementation note: Edition support is on the roadmap; refer to legacy documentation in `docs/Manifold_Client_SDK-Complete_Developer_Guide.md` while the TypeScript classes are finalized.

#### Blind Mint Product

Blind Mints offer randomized gacha-style minting.

##### Methods

- `getAllocations`
  - Eligibility and quantity for blind mint pools.
- `preparePurchase`
  - Includes step metadata (approvals + mint) and total cost.
- `purchase`
  - Executes stored steps; handles receipt aggregation.

##### Types

- `BlindMintOnchainData`
  - Mint contract, network, pricing, reveal schedule.
- `BlindMintPublicData`
  - Collection metadata, media previews, supply visibility.

Example usage lives in `src/products/blindmint.ts` with unit coverage in `tests/products/blindmint.test.ts`.

## Testing & Tooling

- **Unit tests** – Run `npm test` (Vitest) to execute suites under `tests/`.
- **Coverage** – `npm run test:coverage` produces HTML + JSON reports (`coverage/`).
- **Linting** – `npm run lint` enforces TypeScript and Prettier rules.
- **Build** – `npm run build` generates ESM + CJS bundles under `dist/` using Vite (`vite.config.ts`).
- **Type safety** – `npm run typecheck` leverages `tsconfig.json` strict mode.
- **Playground** – Test flows interactively via `npm run playground` (`playground/index.ts`).

## Release Notes

- Track official releases on the [GitHub Releases](https://github.com/manifoldxyz/client-sdk/releases) page.
- The npm package `@manifoldxyz/client-sdk` publishes pre-release builds tagged `0.x` until GA.
- `prepublishOnly` ensures builds are fresh prior to publish (`package.json:27`).

## Additional Resources

- **Transaction Steps Guide** – `docs/TRANSACTION_STEPS_GUIDE.md` for advanced UX patterns.
- **API Reference** – `API_REFERENCE.md` for quick method lookups.
- **Support** – Reach out via [@manifoldxyz](https://twitter.com/manifoldxyz) or the Help Desk.
- **Related repos** – Smart contracts at [creator-core-extensions-solidity](https://github.com/manifoldxyz/creator-core-extensions-solidity).

---

Ready to build? Start by fetching your first product with `createClient`, wire up an adapter, and tailor the transaction step experience to your audience. Ship confidently—tests, linting, and type safety are baked in.
