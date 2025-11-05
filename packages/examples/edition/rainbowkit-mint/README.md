# Edition Product - Manifold SDK + RainbowKit Example with Enhanced Display

This example demonstrates how to integrate the Manifold Client SDK with RainbowKit for wallet connection and Edition NFT minting, featuring comprehensive product information display.

## Features

### Product Display Capabilities
- 🖼️ **NFT Image Display** - Shows the product artwork/media
- 📊 **Live Supply Tracking** - Real-time minted count and remaining supply with visual progress bar
- 💰 **Pricing Information** - Displays mint price and platform fees
- ⏰ **Time-based Sales** - Shows start/end dates with live countdown timer
- 🚦 **Status Indicators** - Visual feedback for product availability (active, paused, upcoming, sold out)
- 🔢 **Wallet Limits** - Shows maximum mints per wallet

### Core Functionality
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

### 1. **Product Information Display (NEW)**
   - The `ProductDisplay` component fetches and displays comprehensive product data:
     - Product image from `asset` field
     - On-chain data (price, supply, dates) via `fetchOnchainData()`
     - Live inventory tracking via `getInventory()`
     - Product rules and limitations via `getRules()`
     - Real-time countdown timer for sale start/end
     - Visual progress bar for minted vs available supply

### 2. **Wallet Connection (RainbowKit)**
   - The app uses RainbowKit's `ConnectButton` component
   - Supports multiple wallets (MetaMask, WalletConnect, Coinbase, etc.)
   - Configured in `src/app/providers.tsx`

### 3. **Edition Minting Process (Manifold SDK)**
   - Located in `src/components/MintButton.tsx`
   - Steps:
     1. Create Manifold SDK client
     2. Create account from wagmi's wallet client
     3. Fetch Edition product details using instance ID
     4. Verify product type with `isEditionProduct`
     5. Check product status is active
     6. Prepare purchase with quantity and optional promo code
     7. Execute purchase with wallet signing

### 4. **Key Components**

- **`ProductDisplay.tsx`** (NEW): Fetches and displays all product information
- **`providers.tsx`**: Sets up RainbowKit, wagmi, and TanStack Query providers
- **`MintButton.tsx`**: Main minting logic using Manifold SDK
- **`page.tsx`**: Enhanced UI with product display and mint functionality

## Code Structure

```
examples/rainbowkit-mint/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Enhanced main page with product display
│   │   └── providers.tsx   # RainbowKit & wagmi setup
│   └── components/
│       ├── ProductDisplay.tsx  # Product information display (NEW)
│       └── MintButton.tsx      # Minting logic
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Key Code Snippets

### Fetching Product Display Information (NEW)

```typescript
// Fetch comprehensive product data
const product = await client.getProduct(instanceId);

// Get all product information
const [status, onchainData, inventory, rules, metadata] = await Promise.all([
  product.getStatus(),           // Active, paused, upcoming, completed
  product.fetchOnchainData(),     // Price, supply, dates, limits
  product.getInventory(),         // Minted count, available
  product.getRules(),             // Restrictions and requirements
  product.getMetadata(),          // Name, description
]);

// Extract image URLs
const imageUrl = product.data.publicData?.asset?.image || 
                product.previewData?.media?.image?.url;

// Display price
console.log(`Price: ${onchainData.cost?.formatted}`);

// Display supply information
console.log(`Minted: ${onchainData.total} / ${onchainData.totalMax || 'Unlimited'}`);
```

### Creating the Manifold Client

```typescript
// Now with built-in public providers - no RPC URLs needed!
const publicProvider = createPublicProviderViem(providers);
const client = createClient({ publicProvider });
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