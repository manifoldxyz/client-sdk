/**
 * @packageDocumentation
 *
 * # Manifold Client SDK
 *
 * The official TypeScript SDK for integrating Manifold products into your application.
 *
 * ## Features
 * - 🚀 No API keys required
 * - 📦 Support for Edition and BlindMint products
 * - 💳 Complete purchase flow with eligibility checking
 * - 🔗 Multi-chain support (Ethereum, Base, Optimism, Shape)
 * - 🔌 Wallet agnostic (ethers v5, viem, wagmi)
 * - 🛡️ Type-safe with full TypeScript support
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createClient, createPublicProviderViem } from '@manifoldxyz/client-sdk';
 * import { createPublicClient, http } from 'viem';
 * import { mainnet } from 'viem/chains';
 *
 * const publicClient = createPublicClient({
 *   chain: mainnet,
 *   transport: http(),
 * });
 * const publicProvider = createPublicProviderViem({ 1: publicClient });
 *
 * // Initialize client
 * const client = createClient({ publicProvider });
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
 * - **BlindMint**: Mystery/gacha-style random NFT mints
 *
 * ### Wallet Adapters
 * Unified interface for different wallet libraries:
 * - Ethers v5
 * - Viem
 * - Wagmi (public provider)
 *
 * @see {@link https://docs.manifold.xyz/client-sdk} for more information
 * @see {@link https://studio.manifold.xyz} to create products
 *
 * @module @manifoldxyz/client-sdk
 */

// Core client factory
export { createClient } from './client';

export { isBlindMintProduct, isEditionProduct } from './products/index';

// All type exports
export * from './types';

// Account adapters for wallet integration
export * from './adapters';
