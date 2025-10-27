# Manifold Client SDK Examples

This directory contains comprehensive examples demonstrating various ways to integrate the Manifold Client SDK into your applications.

## 📁 Directory Structure

```
examples/
├── blindmint/              # BlindMint product examples (mystery/gacha NFTs)
│   ├── rainbowkit-mint/   # Web app with RainbowKit wallet connection
│   └── step-by-step-mint/ # Transparent step-by-step transaction flow
│
├── edition/                # Edition product examples (fixed/open editions)
│   ├── rainbowkit-mint/   # Web app with RainbowKit wallet connection
│   └── step-by-step-mint/ # Transparent step-by-step transaction flow
│
└── server-side/            # Server-side minting bots
    ├── blindmint-bot.ts    # Automated BlindMint minting
    └── edition-bot.ts      # Automated Edition minting
```

## 🎯 Product Types

### BlindMint Products
Mystery/gacha-style NFT mints where buyers receive random items from pools:
- Random tier selection based on probabilities
- Reveal mechanisms
- Pool-based inventory

### Edition Products
Fixed or open edition NFT drops with specific quantities:
- Limited supply editions
- Open editions (unlimited)
- Time-based sales windows
- Promo code support
- Allowlist functionality

## 🚀 Quick Start Guide

### 1. Choose Your Product Type
- **BlindMint**: For mystery boxes and randomized mints
- **Edition**: For specific NFT collections and drops

### 2. Choose Your Implementation
- **RainbowKit Examples**: Full web app with wallet UI
- **Step-by-Step Examples**: Transparent transaction execution
- **Server-Side Bots**: Automated minting without UI

### 3. Follow Example-Specific Setup
Each example has its own README with detailed instructions.

## 💻 Frontend Examples

### RainbowKit Integration
Full Next.js applications with wallet connection UI:
- Multi-wallet support via RainbowKit
- One-click minting experience
- Real-time status updates
- Error handling

**Setup:**
```bash
cd examples/[blindmint|edition]/rainbowkit-mint
npm install
npm run dev
```

### Step-by-Step Transaction Flow
Transparent minting with explicit control over each transaction:
- Visual transaction steps
- Manual step execution
- Cost breakdown display
- Progress tracking

**Setup:**
```bash
cd examples/[blindmint|edition]/step-by-step-mint
npm install
npm run dev
```

## 🤖 Server-Side Examples

Automated minting bots for backend operations:
- No browser required
- Scheduled minting
- Batch operations
- Monitoring capabilities

**Setup:**
```bash
cd examples/server-side
npm install
npx ts-node [blindmint-bot.ts|edition-bot.ts]
```

## 📋 Feature Comparison

| Feature | RainbowKit | Step-by-Step | Server-Side |
|---------|------------|--------------|-------------|
| Wallet UI | ✅ | ✅ | ❌ |
| Browser Required | ✅ | ✅ | ❌ |
| Transaction Visibility | Basic | Full | Logs |
| Batch Minting | ❌ | ❌ | ✅ |
| Automation | ❌ | ❌ | ✅ |
| User Interaction | Required | Required | None |
| Best For | End users | Power users | Automation |

## 🔧 Common Configuration

All examples use similar environment variables:

```env
# Product Configuration
INSTANCE_ID=your_product_instance_id
NEXT_PUBLIC_INSTANCE_ID=your_product_instance_id

# RPC Endpoints
MAINNET_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# Wallet (server-side only)
WALLET_PRIVATE_KEY=your_private_key

# Optional
PROMO_CODE=discount_code
MINT_QUANTITY=1
```

## 📚 Key Concepts

### 1. Product Fetching
```typescript
const product = await client.getProduct(instanceId);
```

### 2. Type Guards
```typescript
import { isEditionProduct, isBlindMintProduct } from '@manifoldxyz/client-sdk';

if (isEditionProduct(product)) {
  // Edition-specific logic
} else if (isBlindMintProduct(product)) {
  // BlindMint-specific logic
}
```

### 3. Purchase Flow
```typescript
// Prepare (simulate)
const prepared = await product.preparePurchase({
  address: walletAddress,
  payload: { quantity: 1 }
});

// Execute
const order = await product.purchase({
  account,
  preparedPurchase: prepared
});
```

## 🎓 Learning Path

### Beginners
1. Start with **RainbowKit examples** for a complete UI experience
2. Understand the basic purchase flow
3. Learn about product types and their differences

### Intermediate
1. Explore **Step-by-Step examples** to understand transaction mechanics
2. Learn about gas estimation and cost breakdowns
3. Implement error handling and retry logic

### Advanced
1. Study **Server-Side examples** for automation
2. Implement batch minting operations
3. Build monitoring and alerting systems
4. Create custom integrations

## 🛠️ Development Tips

### Testing
- Use testnets first (Sepolia, Base Goerli)
- Start with small quantities
- Monitor gas prices
- Test error scenarios

### Production
- Implement proper error handling
- Add retry mechanisms
- Monitor transaction status
- Log all operations
- Secure private keys

### Performance
- Cache product data when possible
- Batch operations efficiently
- Use appropriate RPC endpoints
- Monitor rate limits

## 📖 Documentation Links

- [Manifold Client SDK Docs](../README.md)
- [API Reference](../API_REFERENCE.md)
- [Manifold Studio](https://studio.manifold.xyz/)
- [Creating a Minting Bot Guide](../docs/guides/creating-a-minting-bot.md)

## 🤝 Contributing

We welcome contributions! To add new examples:

1. Follow the existing directory structure
2. Include a comprehensive README
3. Add environment variable examples
4. Document all configuration options
5. Include error handling
6. Add TypeScript types

## 📄 License

All examples are MIT licensed and free to use in your projects.