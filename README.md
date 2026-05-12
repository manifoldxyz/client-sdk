# Manifold Client SDK Monorepo

The official TypeScript SDK for **headless purchasing and display** of Manifold products. Build custom storefronts, minting bots, and payment-gated experiences using Manifold's on-chain product infrastructure — no API keys required.

Head to [studio.manifold.xyz](https://studio.manifold.xyz/) to launch your product, then use this SDK to integrate purchasing into your own UI.

[Full Documentation](https://manifold-1.gitbook.io/manifold-client-sdk) · [GitHub Issues](https://github.com/manifoldxyz/client-sdk/issues) · [Help Center](https://help.manifold.xyz/)

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10.15 (`corepack enable && corepack prepare pnpm@latest --activate`)
- A wallet library: [viem](https://viem.sh/) ≥ 2.0, [wagmi](https://wagmi.sh/) ≥ 2.0, or [ethers v5](https://docs.ethers.org/v5/)

## Getting Started

```bash
git clone https://github.com/manifoldxyz/client-sdk.git
cd client-sdk
pnpm install
pnpm build
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages via Turborepo |
| `pnpm dev` | Run all `dev` scripts in watch mode |
| `pnpm lint` | Run ESLint across packages |
| `pnpm lint:fix` | Lint + auto-fix |
| `pnpm test` | Run tests via Vitest |
| `pnpm typecheck` | TypeScript type checks |
| `pnpm clean` | Remove build artifacts |
| `pnpm publish:sdk` | Publish `@manifoldxyz/client-sdk` to npm |
| `pnpm x402:start` | Start x402 Express server |
| `pnpm x402:dev` | Start x402 Express in dev mode |

To target a specific package:

```bash
pnpm --filter @manifoldxyz/client-sdk run build
pnpm --filter @manifoldxyz/examples exec <command>
```

## Architecture

This is a **pnpm workspace** monorepo powered by [Turborepo](https://turbo.build/):

```
client-sdk/
├── packages/
│   ├── client-sdk/                  # @manifoldxyz/client-sdk — the core SDK
│   │   ├── src/
│   │   │   ├── client/              # createClient() factory
│   │   │   ├── products/            # Product type handlers (Edition, BlindMint)
│   │   │   ├── adapters/            # Wallet adapters (viem, ethers5, wagmi)
│   │   │   ├── api/                 # Manifold API client, Coinbase price feeds
│   │   │   ├── abis/                # Smart contract ABIs
│   │   │   ├── config/              # Network configurations
│   │   │   ├── libs/                # Money/currency utilities
│   │   │   ├── types/               # TypeScript type definitions
│   │   │   └── utils/               # Validation, gas estimation, network helpers
│   │   ├── tests/                   # Vitest test suite
│   │   ├── docs/                    # GitBook documentation source
│   │   └── playground/              # Interactive testing playground
│   └── examples/                    # Example applications
│       ├── blindmint/
│       │   ├── rainbowkit-mint/     # Next.js + RainbowKit minting UI
│       │   ├── step-by-step-mint/   # Step-by-step Next.js minting flow
│       │   └── minting-bot/         # Headless Node.js minting bot
│       ├── edition/
│       │   ├── rainbowkit-mint/     # Edition minting with RainbowKit
│       │   ├── step-by-step-mint/   # Step-by-step edition minting
│       │   └── minting-bot/         # Headless edition minting bot
│       └── x402/
│           └── express/             # HTTP 402 payment-gated Express server
│               └── playground-react/ # React playground for x402
├── turbo.json                       # Turborepo task configuration
├── package.json                     # Workspace root
└── pnpm-lock.yaml
```

### How It Works

1. **`createClient()`** — Initializes the SDK with a public provider adapter (viem, wagmi, or ethers5)
2. **`client.getProduct(url)`** — Fetches product data from Manifold's API by URL or instance ID
3. **Two-step purchase flow**:
   - `product.preparePurchase()` — checks eligibility, calculates cost, generates transaction data
   - `product.purchase()` — sends the transaction to the blockchain
4. **Built-in provider fallbacks** — automatic failover between multiple RPC endpoints

### Supported Product Types

| Type | Description |
|------|-------------|
| **Edition** | Standard NFT editions with optional allowlists |
| **BlindMint** | Mystery/gacha-style random NFT mints |

### Supported Chains

Ethereum, Base, Optimism, Shape (+ Sepolia testnets)

## Environment Variables

### SDK Playground (`packages/client-sdk/playground/.env.example`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Verbose output | `false` |
| `TEST_NETWORK_ID` | Network ID for testing | `11155111` (Sepolia) |
| `TEST_INSTANCE_ID` | Default product instance ID | `4149776624` |
| `TEST_EDITION_INSTANCE_ID` | Edition-specific test instance | — |
| `TEST_BLIND_MINT_INSTANCE_ID` | BlindMint-specific test instance | — |
| `TEST_PRIVATE_KEY` | Private key for sending txns (read-only if default) | `0x0000...0000` |
| `EXECUTE_PURCHASE` | Whether to execute actual purchases | `false` |
| `RPC_URL` | Ethereum RPC endpoint | — |

### Example Apps — BlindMint/Edition RainbowKit (`packages/examples/*/rainbowkit-mint/`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [WalletConnect Cloud](https://cloud.walletconnect.com) project ID |
| `NEXT_PUBLIC_RPC_URL_MAINNET` | Ethereum mainnet RPC |
| `NEXT_PUBLIC_RPC_URL_BASE` | Base mainnet RPC |
| `NEXT_PUBLIC_INSTANCE_ID` | Manifold product instance ID |

### Example Apps — Minting Bot (`packages/examples/*/minting-bot/`)

| Variable | Description |
|----------|-------------|
| `INSTANCE_ID` | Product instance ID |
| `NETWORK_ID` | Target chain ID (e.g. `8453` for Base) |
| `RPC_URL` | RPC endpoint for the target chain |
| `WALLET_PRIVATE_KEY` | Wallet private key (without `0x` prefix) |
| `MINT_QUANTITY` | Number of tokens to mint (default: `1`) |

### Example Apps — x402 Express (`packages/examples/x402/express/`)

| Variable | Description |
|----------|-------------|
| `ADMIN_WALLET_PRIVATE_KEY` | Admin wallet private key for minting on behalf of users |
| `ADMIN_WALLET_ADDRESS` | Admin wallet address |
| `RPC_URL_BASE` | Base RPC endpoint |
| `RPC_URL_OPTIMISM` | Optimism RPC endpoint |
| `RPC_URL_MAINNET` | Ethereum mainnet RPC endpoint |
| `RPC_URL_BASE_SEPOLIA` | Base Sepolia testnet RPC |
| `RPC_URL_SEPOLIA` | Ethereum Sepolia testnet RPC |
| `PORT` | Server port (default: `4022`) |
| `NODE_ENV` | Environment mode |

## External Dependencies

### Internal Manifold Packages

| Package | Version | Purpose |
|---------|---------|---------|
| [`@manifoldxyz/js-ts-utils`](https://github.com/manifoldxyz/js-ts-utils) | `^9.0.0` | Shared utilities, network configs, type definitions |
| [`@manifoldxyz/studio-apps-client-public`](https://github.com/manifoldxyz/studio-apps-server) | `^1.0.0-beta.0` | Public API client for fetching product/instance data |

### Internal Manifold Services

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Studio Apps API | `https://apps.api.manifoldxyz.dev` | Product instance data, previews, purchase preparation |

### Third-Party Services

| Service | Purpose | Config |
|---------|---------|--------|
| [Coinbase API](https://api.coinbase.com) | ETH/token → USD price conversion | No config needed |
| [CoinGecko API](https://api.coingecko.com) | ERC-20 token pricing fallback | No config needed |
| [WalletConnect](https://cloud.walletconnect.com) | Wallet connection for example apps | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
| Ethereum RPC (Alchemy/Infura) | Blockchain reads + transaction submission | Various `RPC_URL_*` env vars |

### Peer Dependencies (choose your wallet library)

| Library | Version | Notes |
|---------|---------|-------|
| `viem` | `≥ 2.0.0` | Optional — recommended for new projects |
| `@wagmi/core` | `≥ 2.0.0` | Optional — for React/wagmi apps |
| `ethers` | `^5.7.2` | Bundled — legacy adapter |

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All participants in our project are expected to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive criticism and collaborative problem-solving
- Respect differing viewpoints and experiences
- Accept responsibility for mistakes and learn from them

Unacceptable behavior includes harassment, discrimination, or any conduct that creates an unsafe or unwelcoming environment. Such behavior will not be tolerated.

## Security

### Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please reach out to us on [X](https://x.com/manifoldxyz) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We take all security reports seriously and will respond promptly to address the issue.

## Support

- **Documentation**: [Manifold Client SDK Docs](https://manifold-1.gitbook.io/manifold-client-sdk)
- **Help Center**: [Manifold Help](https://help.manifold.xyz/)
- **Issues**: [GitHub Issues](https://github.com/manifoldxyz/client-sdk/issues)

### HARD RULE
- NEVER edit pnpm-workspace.yaml, the file is reserved for human to edit