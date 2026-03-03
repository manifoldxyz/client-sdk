# Changelog

## 0.0.1 (March 2, 2026)

First stable release of `@manifoldxyz/client-sdk`.

### Features

- **BlindMint product** — Full support for mystery/gacha-style NFT minting (prepare + execute purchase flow)
- **Edition product** — Support for edition-based NFT minting with ERC721 and ERC1155 claim contracts
- **Wallet adapters** — Pluggable adapter layer for ethers v5, viem, and wagmi
- **Multi-chain support** — Ethereum, Base, Optimism, Shape, Sepolia, and ApeChain
- **ERC20 payments** — Pay with ERC20 tokens (e.g. USDC) including gas estimation and token approvals
- **Transaction data passthrough** — `transactionData` field on purchase steps for custom transaction execution
- **Contract event subscriptions** — `subscribeToContractEvents` on the public provider interface
- **Confirmation blocks** — Configurable confirmation block count for purchase transactions
- **ABI normalization** — Automatic ABI normalization for viem/wagmi providers
- **Monorepo structure** — pnpm workspace with Turborepo for builds, linting, and testing

### Bug Fixes

- Fix viem adapter chain info handling
- Fix ERC20 gas estimation failures
- Fix edition token approval bug
- Validate primary RPC health before provider use
- Widen wagmi/viem peer dependency ranges for broader compatibility
