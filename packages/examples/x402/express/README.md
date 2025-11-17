# X402 Manifold NFT Purchase Endpoint

This is an Express server that implements an x402 payment-enabled endpoint for purchasing NFTs through the Manifold Client SDK. The endpoint handles payment verification, cost calculation in USDC, and NFT minting on behalf of users.

## Features

- **X402 Payment Protocol**: Implements HTTP 402 Payment Required for micropayments
- **Manifold Integration**: Uses Manifold Client SDK to interact with NFT products
- **USDC Cost Conversion**: Converts ETH and other costs to USDC using Relay SDK
- **Multi-Network Support**: Supports Base mainnet (8453) and Base Sepolia (84532)
- **Admin Wallet Minting**: Admin wallet pays for gas while user receives the NFT

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/xn8lJp?referralCode=0RS2bU&utm_medium=integration&utm_source=template&utm_campaign=generic)

## Architecture

```
Client → X402 Endpoint → Manifold SDK → Blockchain
           ↓                ↓
      Facilitator      Relay SDK
      (Payment)       (Cost Conversion)
```

## Prerequisites

- Node.js v20+
- pnpm or npm
- Admin wallet with ETH for gas on Base/Base Sepolia
- USDC on Base/Base Sepolia for testing payments

## Installation

1. Install dependencies:

```bash
npm install
```

2. Copy and configure environment variables:

```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:

- `FACILITATOR_URL`: X402 facilitator URL for payment verification
- `ADMIN_WALLET_PRIVATE_KEY`: Admin wallet private key for minting
- `ADMIN_WALLET_ADDRESS`: Admin wallet address
- `RPC_URL_BASE`: Base mainnet RPC URL
- `RPC_URL_BASE_SEPOLIA`: Base Sepolia RPC URL

## Usage

### Starting the Server

```bash
npm run dev
```

The server will start on `http://localhost:4022`

### Endpoint: GET /manifold/:chainName/id/:id/purchase

**Supported chain names:**

- `base` or `base-mainnet` - Base Mainnet (chainId: 8453)
- `base-sepolia` or `basesepolia` - Base Sepolia (chainId: 84532)

The `chainName` parameter specifies the payment network where the USDC payment will be made.

#### Phase 1: Cost Calculation (No Payment)

**Request:**

```
GET /manifold/base-sepolia/id/4150231280/purchase?quantity=1&userAddress=0x...
```

**Response (402):**

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "1000000",
      "resource": "http://localhost:4022/manifold/base-sepolia/id/4150231280/purchase",
      "description": "NFT Purchase: Cool NFT",
      "mimeType": "application/json",
      "payTo": "0xAdminWallet",
      "maxTimeoutSeconds": 300,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "extra": {
        "name": "USDC",
        "version": "2",
        "productId": "4150231280",
        "quantity": 1
      }
    }
  ]
}
```

#### Phase 2: Payment and Minting

**Request with X-PAYMENT header:**

```
GET /manifold/base-sepolia/id/4150231280/purchase
Headers:
  X-PAYMENT: <base64 encoded payment>
```

**Success Response (200):**

```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 123456,
  "recipient": "0xUserWallet",
  "product": {
    "id": "4150231280",
    "name": "Cool NFT",
    "type": "BlindMint"
  },
  "tokens": [
    {
      "tokenId": "1",
      "quantity": 1,
      "contractAddress": "0x...",
      "explorerUrl": "https://basescan.org/..."
    }
  ],
  "totalCost": {
    "usdc": "1000000",
    "formatted": "1.0 USDC"
  }
}
```

## Testing

### Using the Test Script

1. Configure test environment variables in `.env`:

```
TEST_USER_PRIVATE_KEY=0x... # User wallet with USDC
TEST_MANIFOLD_INSTANCE_ID=4150231280
RESOURCE_SERVER_URL=http://localhost:4022
```

2. Run the test:

```bash
npm run test:purchase
```

The test script will:

1. Check wallet USDC balance
2. Make request to the endpoint
3. Automatically handle 402 payment
4. Display the minted NFT details

### Manual Testing with curl

1. Get payment requirements:

```bash
curl http://localhost:4022/manifold/base-sepolia/id/4150231280/purchase?quantity=1
```

2. Use an x402-compatible client to make payment and complete purchase

## Error Handling

The endpoint handles various error cases:

- `UNSUPPORTED_NETWORK`: Product on unsupported blockchain
- `UNSUPPORTED_CURRENCY`: Product uses unsupported payment tokens
- `PRODUCT_NOT_FOUND`: Invalid product ID
- `PRODUCT_NOT_ACTIVE`: Product is paused or completed
- `INSUFFICIENT_FUNDS`: Payment amount insufficient
- `MINT_FAILED`: Transaction execution failed
- `PAYMENT_VERIFICATION_FAILED`: Invalid payment
- `RELAY_QUOTE_FAILED`: Cost conversion failed

## Implementation Details

### Cost Calculation Flow

1. Fetch product from Manifold SDK
2. Validate network support (Base only)
3. Run `preparePurchase` to get costs
4. Convert ETH costs to USDC via Relay SDK
5. Add 5% buffer for price fluctuation
6. Generate payment requirements

### Minting Flow

1. Verify X-PAYMENT header
2. Validate payment amount and recipient
3. Execute mint with admin wallet
4. User receives NFT directly
5. Settle payment and return response

### Key Files

- `src/index.ts`: Main server setup
- `src/handlers/purchaseHandler.ts`: X402 endpoint implementation
- `src/utils/viemClients.ts`: Blockchain client utilities
- `src/types/index.ts`: TypeScript definitions
- `test/testPurchase.ts`: Test script using x402-axios

## Security Considerations

- Admin wallet private key must be securely stored
- Implement rate limiting in production
- Add idempotency keys to prevent duplicate mints
- Monitor gas costs and adjust buffers
- Track failed mints for refund handling

## Supported Networks

- **Base Mainnet** (chainId: 8453)

  - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - WETH: `0x4200000000000000000000000000000000000006`

- **Base Sepolia** (chainId: 84532)
  - USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
  - WETH: `0x4200000000000000000000000000000000000006`

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## License

ISC
