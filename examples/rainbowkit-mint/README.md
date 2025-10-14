# Manifold SDK + RainbowKit Example

This is a minimal example demonstrating how to integrate the Manifold Client SDK with RainbowKit for wallet connection and NFT minting.

## Features

- 🌈 RainbowKit wallet connection
- 🎨 Manifold SDK NFT minting
- ⚡ Next.js 14 with App Router
- 🔧 TypeScript support
- 💳 Multi-wallet support via RainbowKit

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

# The Manifold instance ID to mint from
NEXT_PUBLIC_INSTANCE_ID=4149776624
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

### 2. **Minting Process (Manifold SDK)**
   - Located in `src/components/MintButton.tsx`
   - Steps:
     1. Create Manifold SDK client
     2. Create viem adapter from wagmi's wallet client
     3. Fetch product details using instance ID
     4. Prepare purchase (simulate transaction)
     5. Execute purchase with wallet signing

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

### Using viem Adapter with wagmi

```typescript
import { viemAdapter } from '@manifoldxyz/client-sdk/adapters';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();
const account = viemAdapter.signer.fromViem(walletClient);
```

### Minting Flow

```typescript
// 1. Get product
const product = await client.getProduct(INSTANCE_ID);

// 2. Prepare purchase
const preparedPurchase = await product.preparePurchase({
  address: address,
  payload: { quantity: 1 }
});

// 3. Execute purchase
const order = await product.purchase({
  account,
  preparedPurchase,
});
```

## Customization

### Change Instance ID

Update `NEXT_PUBLIC_INSTANCE_ID` in your `.env.local` file to mint from a different Manifold product.

### Add More Networks

Edit `src/app/providers.tsx` to add more chains:

```typescript
import { polygon, avalanche } from 'wagmi/chains';

const config = getDefaultConfig({
  chains: [mainnet, base, optimism, arbitrum, polygon, avalanche],
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

### "Product is not active"
The product might be:
- Sold out
- Not started yet
- Paused
- Ended

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