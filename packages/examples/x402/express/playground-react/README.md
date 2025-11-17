# X402 Manifold NFT React Playground

A React application that demonstrates how to use x402-axios to purchase NFTs through the Manifold x402 endpoint with automatic USDC payment handling, featuring secure wallet connection via RainbowKit.

## Features

- 🔐 Secure wallet connection with RainbowKit
- 🎨 NFT purchase through Manifold SDK
- 💳 Automatic x402 payment handling with USDC
- 🔄 Support for Base and Base Sepolia networks
- 📊 Real-time transaction status display
- 💰 USDC balance display
- 🎯 Clean, modern UI

## Prerequisites

1. **Test Wallet**: You need a wallet with test USDC on Base Sepolia
2. **X402 Server**: The Express server must be running (default: http://localhost:4022)
3. **Node.js**: v20+ recommended

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Get a WalletConnect Project ID:
   - Visit https://cloud.walletconnect.com
   - Create a new project or use an existing one
   - Copy your Project ID
   - Update `src/wagmi.js` with your Project ID

   Note: The app includes a default Project ID for development. For production, you should use your own.

3. Start the development server:
```bash
npm run dev
```

The app will open in your browser at http://localhost:3000

## Usage

### 1. Connect Your Wallet

1. Click the "Connect Wallet" button (powered by RainbowKit)
2. Choose your preferred wallet provider
3. Approve the connection
4. Your wallet address and USDC balance will be displayed

The app supports popular wallets including MetaMask, Coinbase Wallet, WalletConnect, and more.

### 2. Configure Purchase

- **Server URL**: The x402 endpoint URL (default: http://localhost:4022)
- **Network**: Automatically detected from your connected wallet (Base or Base Sepolia)
- **Instance ID**: The Manifold product instance ID
- **Quantity**: Number of NFTs to mint

### 3. Purchase NFT

1. Click "Purchase NFT"
2. The x402-axios interceptor will automatically:
   - Detect the 402 payment requirement
   - Create a payment authorization with your wallet
   - Retry the request with payment proof
3. View the transaction details and minted NFT information

## How It Works

The playground uses `x402-axios` with `withPaymentInterceptor` to automatically handle the x402 payment flow:

```javascript
// Get wallet client from wagmi
const { data: walletClient } = useWalletClient();

// Create axios instance with payment interceptor
const api = withPaymentInterceptor(
  axios.create({ baseURL: serverUrl }),
  walletClient // wagmi wallet client
);

// Make request - payment is handled automatically
const response = await api.get('/manifold/base-sepolia/id/123/purchase');
```

The interceptor:
1. Makes the initial request
2. If 402 response, parses payment requirements
3. Creates payment authorization with wallet
4. Retries request with X-PAYMENT header
5. Returns the successful response

## Testing with Different Products

You can test with any Manifold product by changing the Instance ID. The product must:
- Be on Base or Base Sepolia
- Be active (not paused or completed)
- Use ETH or USDC for payment

## Troubleshooting

### "Payment Required" Error
- Ensure your wallet has sufficient USDC balance
- Check that the payment network matches your wallet's network
- Verify the server is running and accessible

### "Unsupported Network" Error
- The product must be on Base or Base Sepolia
- Check the product's network on Manifold

### Connection Issues
- Verify the server URL is correct
- Ensure the Express server is running
- Check for CORS issues (server should have CORS enabled)

## Project Structure

```
playground-react/
├── src/
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # React entry point
│   └── index.css       # Styling
├── index.html          # HTML template
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies
```

## Technologies Used

- **React**: UI framework
- **Vite**: Build tool for fast development
- **RainbowKit**: Wallet connection UI and UX
- **wagmi**: React hooks for Ethereum
- **x402-axios**: Automatic x402 payment handling
- **viem**: Ethereum client library
- **axios**: HTTP client

## License

ISC