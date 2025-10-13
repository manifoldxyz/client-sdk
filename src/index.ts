/**
 * @packageDocumentation
 *
 * # Manifold Client SDK
 *
 * The official TypeScript SDK for integrating Manifold NFT products into your application.
 *
 * ## Features
 * - 🚀 No API keys required
 * - 📦 Support for Edition, Burn/Redeem, and BlindMint products
 * - 💳 Complete purchase flow with eligibility checking
 * - 🔗 Multi-chain support (Ethereum, Base, Optimism, Shape)
 * - 🔌 Wallet agnostic (ethers v5/v6, viem)
 * - 🛡️ Type-safe with full TypeScript support
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createClient } from '@manifoldxyz/client-sdk';
 *
 * // Initialize client
 * const client = createClient({
 *   httpRPCs: {
 *     1: "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY",
 *     8453: "https://base-mainnet.infura.io/v3/YOUR_KEY"
 *   }
 * });
 *
 * // Fetch product
 * const product = await client.getProduct('4150231280');
 *
 * // Prepare purchase
 * const prepared = await product.preparePurchase({
 *   address: '0x...',
 *   payload: { quantity: 1 }
 * });
 *
 * // Execute purchase
 * const order = await product.purchase({
 *   account: walletAdapter,
 *   preparedPurchase: prepared
 * });
 * ```
 *
 * ## Core Concepts
 *
 * ### Two-Step Purchase Flow
 * 1. **Prepare**: Check eligibility, calculate costs, generate transaction data
 * 2. **Execute**: Send transaction(s) to blockchain
 *
 * ### Product Types
 * - **Edition**: Standard NFT editions with optional allowlists
 * - **Burn/Redeem**: Exchange existing tokens for new ones
 * - **BlindMint**: Mystery/gacha-style random NFT mints
 *
 * ### Wallet Adapters
 * Unified interface for different wallet libraries:
 * - Ethers v5: `ethers5Adapter`
 * - Ethers v6: `ethers6Adapter`
 * - Viem: `viemAdapter`
 *
 * @see {@link https://manifold.xyz} for more information
 * @see {@link https://studio.manifold.xyz} to create products
 *
 * @module @manifoldxyz/client-sdk
 */

// Core client factory
export { createClient } from './client';

export { isBlindMintProduct } from './products/index';

// All type exports
export * from './types';

// Account adapters for wallet integration
export * from './adapters';
