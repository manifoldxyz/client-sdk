# Manifold Client SDK Playground

Interactive testing environment for the Manifold Client SDK with full environment variable configuration.

## Setup

### 1. Install Dependencies

```bash
cd playground
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# HTTP Provider URLs for each network
ETH_MAINNET_RPC=https://mainnet.infura.io/v3/YOUR_KEY
BASE_RPC=https://base-mainnet.infura.io/v3/YOUR_KEY
OPTIMISM_RPC=https://optimism-mainnet.infura.io/v3/YOUR_KEY
SHAPE_RPC=https://shape-mainnet.infura.io/v3/YOUR_KEY
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY

# Test Configuration
TEST_NETWORK_ID=11155111  # Sepolia testnet
TEST_INSTANCE_ID=4150231280  # Your test instance

# Test wallet private key (NEVER use mainnet keys!)
TEST_PRIVATE_KEY=0x...

# Optional: Specific instances for each product type
TEST_EDITION_INSTANCE_ID=
TEST_BURN_REDEEM_INSTANCE_ID=
TEST_BLIND_MINT_INSTANCE_ID=

# Debug mode
DEBUG=true
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TEST_NETWORK_ID` | Network ID for testing | `11155111` (Sepolia) |
| `TEST_INSTANCE_ID` | Default instance ID to test | `4150231280` |

### Network RPC URLs

Configure RPC endpoints for the networks you want to test:

| Variable | Network | Chain ID |
|----------|---------|----------|
| `ETH_MAINNET_RPC` | Ethereum Mainnet | 1 |
| `BASE_RPC` | Base | 8453 |
| `OPTIMISM_RPC` | Optimism | 10 |
| `SHAPE_RPC` | Shape | 360 |
| `SEPOLIA_RPC` | Sepolia Testnet | 11155111 |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_PRIVATE_KEY` | Private key for test wallet (transactions) | Read-only mode |
| `TEST_EDITION_INSTANCE_ID` | Edition product instance | - |
| `TEST_BURN_REDEEM_INSTANCE_ID` | Burn/Redeem product instance | - |
| `TEST_BLIND_MINT_INSTANCE_ID` | BlindMint product instance | - |
| `TEST_WORKSPACE` | Workspace ID for testing | - |
| `DEBUG` | Enable debug logging | `false` |

## Running the Playground

```bash
# Run with npm
npm run dev

# Or directly with tsx
npx tsx index.ts
```

## What the Playground Tests

1. **Product Fetching**
   - Get product by instance ID
   - Parse Manifold URLs
   - Fetch workspace products

2. **Product Types**
   - **Edition Products**: Standard NFT editions with optional allowlists
   - **BlindMint Products**: Mystery/gacha-style random NFT mints
   - **BurnRedeem Products**: Exchange existing tokens for new ones (coming soon)

3. **Product Operations**
   - Check product status
   - Get allocation for addresses
   - Prepare purchase transactions
   - Calculate costs and fees
   - Show transaction steps

4. **Wallet Integration** (if private key provided)
   - Connect to configured network
   - Check wallet balance
   - Prepare actual transactions
   - (Optional) Execute purchases

## Security Notes

⚠️ **IMPORTANT SECURITY WARNINGS**:

1. **NEVER commit `.env` files** - The `.gitignore` is configured to exclude them
2. **NEVER use mainnet private keys** in the playground
3. **Use testnet (Sepolia) for testing** real transactions
4. **Keep private keys secure** - Use test wallets only

## Getting Test Funds

For Sepolia testnet:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

## Getting RPC URLs

Popular RPC providers:
- [Infura](https://infura.io/) - Free tier available
- [Alchemy](https://www.alchemy.com/) - Free tier available
- [QuickNode](https://www.quicknode.com/) - Free tier available
- [Ankr](https://www.ankr.com/) - Public RPCs available

## Example Output

```
🎭 Manifold Client SDK Playground
==================================

📋 Configuration:
   Debug: true
   Test Network: 11155111
   Test Instance: 4150231280
   RPC Networks: 11155111
   Wallet: 0x742d35Cc6...
   Balance: 1.5 ETH

✅ Client created successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1: Get Product by Instance ID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Testing edition Product
   Name: Test Edition
   ID: 4150231280
   Network: 11155111
   Status: active

   🎫 Allocation for 0x742d35Cc6...
      Eligible: true
      Available: 10

   💰 Preparing purchase for 1 NFT...
      Total Cost (native): 0.01 ETH
      Product Cost: 0.008 ETH
      Platform Fee: 0.002 ETH
      Steps: 1
      Step 1: Mint Edition NFTs (mint)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 2: Product Type Specific Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing Edition (Instance: 4150231281)...

📦 Testing edition Product
   Name: Limited Edition
   ID: 4150231281
   Network: 11155111
   Status: active

   🎫 Allocation for 0x742d35Cc6...
      Eligible: true
      Available: 3
      
   💰 Preparing purchase for 1 NFT...
      Total Cost (native): 0.05 ETH
      Product Cost: 0.048 ETH
      Platform Fee: 0.002 ETH
      Steps: 1
      Step 1: Mint Edition NFTs (mint)

🎉 Playground completed!
```

## Troubleshooting

### Common Issues

1. **Missing environment variable error**
   - Ensure all required variables are set in `.env`
   - Check variable names match exactly

2. **RPC connection errors**
   - Verify RPC URLs are correct
   - Check API keys are valid
   - Ensure network is supported

3. **Insufficient funds error**
   - Get test tokens from faucets
   - Use Sepolia testnet for testing

4. **Product not found**
   - Verify instance ID exists
   - Check network ID matches product

## Development

To modify the playground:

1. Edit `index.ts` with your changes
2. Run `npm run dev` to test
3. Update this README if adding new features

## Support

For SDK issues: [GitHub Issues](https://github.com/manifoldxyz/client-sdk/issues)
For Manifold Studio: [studio.manifold.xyz](https://studio.manifold.xyz/)