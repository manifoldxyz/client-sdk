# Edition Product - Manifold SDK + RainbowKit Example

This is a minimal example demonstrating how to integrate the Manifold Client SDK with RainbowKit for wallet connection and Edition NFT minting.

## Features

- 🌈 RainbowKit wallet connection
- 🎨 Edition NFT minting via Manifold SDK
- ⚡ Next.js 14 with App Router
- 🔧 TypeScript support with Edition type guards
- 💳 Multi-wallet support via RainbowKit
- 🎟️ Support for promo codes and allowlists

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then update the values:

```env
# Required: Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Add your own RPC URLs for better performance
NEXT_PUBLIC_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_RPC_URL_BASE=https://base-mainnet.infura.io/v3/YOUR_KEY

# Your Edition product instance ID from Manifold Studio
NEXT_PUBLIC_INSTANCE_ID=your_edition_instance_id
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How It Works

### 1. **Wallet Connection (RainbowKit)**
   - The app uses RainbowKit's `ConnectButton` component
   - Supports multiple wallets (MetaMask, WalletConnect, Coinbase, etc.)
   - Configured in `src/app/providers.tsx`

### 2. **Edition Minting Process (Manifold SDK)**
   - Located in `src/components/MintButton.tsx`
   - Steps:
     1. Create Manifold SDK client
     2. Create account from wagmi's wallet client
     3. Fetch Edition product details using instance ID
     4. Verify product type with `isEditionProduct`
     5. Check product status is active
     6. Prepare purchase with quantity and optional promo code
     7. Execute purchase with wallet signing

### 3. **Key Components**

- **`providers.tsx`**: Sets up RainbowKit, wagmi, and TanStack Query providers
- **`MintButton.tsx`**: Main minting logic using Manifold SDK
- **`page.tsx`**: Simple UI with connect wallet and mint buttons

## Code Structure

```
examples/rainbowkit-mint/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Main page with UI
│   │   └── providers.tsx   # RainbowKit & wagmi setup
│   └── components/
│       └── MintButton.tsx  # Minting logic
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Key Code Snippets

### Creating the Manifold Client

```typescript
const client = createClient({
  httpRPCs: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
  }
});
```

### Creating an Account with wagmi

```typescript
import { createAccountViem } from '@manifoldxyz/client-sdk';
import { useWalletClient, usePublicClient } from 'wagmi';

const { data: walletClient } = useWalletClient();
const publicClient = usePublicClient();
const account = createAccountViem({
  walletClient,
  publicClient: publicClient!
});
```

### Minting Flow

```typescript
import { isEditionProduct } from '@manifoldxyz/client-sdk';

// 1. Get product
const product = await client.getProduct(INSTANCE_ID);

// 2. Verify it's an Edition product
if (!isEditionProduct(product)) {
  throw new Error('Product is not an Edition type');
}

// 3. Check product status
const productStatus = await product.getStatus();
if (productStatus !== 'active') {
  throw new Error(`Edition product is ${productStatus}`);
}

// 4. Prepare purchase with Edition-specific payload
const preparedPurchase = await product.preparePurchase({
  address: address,
  payload: { 
    quantity: 1,
    // Optional: promo code for discounts
    // code: 'PROMO_CODE'
  }
});

// 5. Execute purchase
const order = await product.purchase({
  account,
  preparedPurchase,
});
```

## Customization

### Change Instance ID

Update `NEXT_PUBLIC_INSTANCE_ID` in your `.env.local` file to mint from a different Edition product. You can find your Edition instance ID in Manifold Studio.

### Add More Networks

Edit `src/app/providers.tsx` to add more chains. Currently configured chains include:
- Ethereum Mainnet
- Base
- Optimism
- Arbitrum
- Sepolia (testnet)

To add more chains:
```typescript
import { polygon, avalanche } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [mainnet, base, optimism, arbitrum, sepolia, polygon, avalanche],
  // ...
});
```

### Customize UI

The example uses inline styles for simplicity. You can replace with:
- Tailwind CSS
- CSS Modules  
- Styled Components
- Any CSS framework

## Troubleshooting

### "Please connect your wallet first"
Make sure to connect a wallet using the RainbowKit button before attempting to mint.

### "Product is not an Edition type"
Make sure the instance ID is for an Edition product, not a BlindMint or Burn/Redeem product.

### "Edition product is not active"
The Edition product might be:
- Sold out (reached max supply)
- Not started yet (before startTime)
- Paused
- Ended (after endTime)
- Reached per-wallet limit

### Transaction Fails
Common reasons:
- Insufficient funds (ETH for gas + mint price)
- Network congestion
- Wrong network selected
- Product requirements not met (allowlist, etc.)

## Resources

- [Manifold SDK Docs](https://github.com/manifoldxyz/client-sdk)
- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [wagmi Documentation](https://wagmi.sh)
- [Manifold Studio](https://studio.manifold.xyz/)

## License

MIT