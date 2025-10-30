# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Manifold Client SDK monorepo.

## Workspace Commands (run from repo root)
- `pnpm install` - Install workspace dependencies
- `pnpm build` - Run `turbo run build` across all packages
- `pnpm lint` - Run lint tasks through Turbo
- `pnpm test` - Run test tasks across the workspace
- `pnpm clean` - Trigger each package's clean script

## Package: `@manifoldxyz/client-sdk`
- `pnpm --filter @manifoldxyz/client-sdk install` - Install dependencies just for the SDK package
- `pnpm --filter @manifoldxyz/client-sdk run build` - Build the SDK distribution files
- `pnpm --filter @manifoldxyz/client-sdk run dev` - Build in watch mode for development
- `pnpm --filter @manifoldxyz/client-sdk run clean` - Clean the distribution directory

### Testing
- `pnpm --filter @manifoldxyz/client-sdk run test` - Run all tests with Vitest
- `pnpm --filter @manifoldxyz/client-sdk run test -- [pattern]` - Run specific tests matching the pattern
- `pnpm --filter @manifoldxyz/client-sdk run test:coverage` - Run tests with coverage report

### Code Quality
- `pnpm --filter @manifoldxyz/client-sdk run lint` - Run ESLint on TypeScript files
- `pnpm --filter @manifoldxyz/client-sdk run lint:fix` - Auto-fix ESLint issues
- `pnpm --filter @manifoldxyz/client-sdk run typecheck` - Run TypeScript type checking

### Examples & Playground
- `pnpm --filter @manifoldxyz/client-sdk run playground` - Run the interactive playground for testing the SDK

## Architecture Overview

### Core SDK Structure
The SDK provides a TypeScript-first interface for integrating Manifold NFT products:

1. **Client Factory** (`src/client/index.ts`): Entry point creating the SDK client instance
   - Handles RPC provider initialization
   - Manages product fetching via Studio Apps API
   - Routes to appropriate product types

2. **Product Types** (`src/products/`): Implementations for different NFT product types
   - `BlindMintProduct`: Mystery/gacha-style random NFT mints
   - Edition and Burn/Redeem products to be implemented

3. **Account Adapters** (`src/adapters/`): Wallet integration layer
   - `ethers5-adapter`: Support for ethers v5
   - `viem-adapter`: Support for viem
   - Unified interface for transaction signing

4. **Type System** (`src/types/`): Comprehensive TypeScript definitions
   - Product data structures
   - Purchase flow types
   - Error definitions with typed error codes
   - Money/cost abstractions

### Purchase Flow Architecture
The SDK implements a two-step purchase pattern:
1. **Prepare**: Validate eligibility, calculate costs, generate transaction data
2. **Execute**: Send transaction(s) to blockchain with wallet adapter

### API Integration
- **Manifold API** (`src/api/manifold-api.ts`): Core backend integration using Studio Apps Client
- **Coinbase** (`src/api/coinbase.ts`): Price/exchange rate data
- **Provider Factory** (`src/utils/provider-factory.ts`): JsonRPC provider management

### Network Support
Multi-chain support configured in `src/config/networks.ts`:
- Ethereum mainnet
- Base
- Optimism  
- Shape
- Additional networks configurable via RPC URLs

## Code Style Guidelines

- **TypeScript Strict Mode**: All code must pass strict type checking
- **No Explicit Any**: Use proper typing instead of `any`
- **Consistent Type Imports**: Use `import type` for type-only imports
- **Error Handling**: Use typed `ClientSDKError` with specific error codes
- **Unused Variables**: Prefix with underscore for intentionally unused parameters
- **Documentation**: Use JSDoc comments for public API methods

## Testing Approach

Tests are located in `tests/` directory using Vitest:
- Unit tests for utilities and core functionality
- Mock-based testing for API interactions
- Test files follow `*.test.ts` naming convention
- Run specific tests with filters: `pnpm --filter @manifoldxyz/client-sdk run test -- --grep validation`

## Distribution

The SDK builds to multiple formats:
- CommonJS: `dist/index.cjs`
- ES Module: `dist/index.mjs`
- TypeScript definitions: `dist/index.d.ts`

Peer dependencies:
- `viem` (optional): For viem wallet adapter
- `ethers` (optional): For ethers wallet adapter

## Key Implementation Details

### Product Fetching
Products are fetched via instance ID or Manifold URL:
- Parse and validate instance IDs
- Fetch instance and preview data
- Route to appropriate product class based on `AppId`

### Transaction Steps
Purchase transactions may involve multiple steps:
- Token approvals for ERC20 payments
- Cross-chain bridging (future)
- Actual mint transaction
- Each step tracked with progress callbacks

### Error Handling
Typed errors via `ClientSDKError` enum:
- `INVALID_INPUT`: Validation failures
- `NOT_FOUND`: Resource not found
- `UNSUPPORTED_PRODUCT_TYPE`: Product type not implemented
- `API_ERROR`: Backend communication failures
- Additional specific error codes for purchase flow

### Money Abstraction
The `Money` class (`src/libs/money.ts`) handles:
- BigInt arithmetic for wei values
- Decimal formatting for display
- Currency conversions
- Safe mathematical operations

## Documentation Updates

When making code changes to the repository, always update the external documentation in the `docs/` directory:

### Release Notes
- **Always update** `docs/sdk/release-notes.md` when making code changes
- **Preserve existing format**: Follow the date-based structure (e.g., "October 21, 2025 (0.1.0-beta.1)")
- **Include version number** in parentheses after the date
- Use bullet points for listing changes

### Documentation Review Process
When code changes are made:
1. **Review changes against main branch**: Use `git diff main` to identify all modifications
2. **Scan entire docs/ directory**: Review all documentation files to identify update opportunities
3. **Update relevant documentation**:
   - API reference files in `docs/reference/` for type/interface changes
   - SDK documentation in `docs/sdk/` for method/behavior changes
   - Guide files in `docs/guides/` for usage pattern changes
   - Transaction guide in `docs/TRANSACTION_STEPS_GUIDE.md` for flow changes

### Documentation Update Checklist
- [ ] Updated `docs/sdk/release-notes.md` with new changes
- [ ] Reviewed and updated API reference documentation
- [ ] Updated code examples in guides if APIs changed
- [ ] Verified all file paths and imports in examples
- [ ] Updated method signatures and parameters
- [ ] Added documentation for new features/methods
- [ ] Removed documentation for deprecated features
