# X402 Manifold NFT Purchase Endpoint

This is an Express server that implements an x402 payment-enabled endpoint for purchasing Manifold products through the Manifold Client SDK. The endpoint handles payment verification, cost calculation in USDC, and NFT minting on behalf of users.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/JkC-Dc?referralCode=0RS2bU&utm_medium=integration&utm_source=template&utm_campaign=generic)

## Features

- **X402 Payment Protocol**: Implements HTTP 402 Payment Required for micropayments
- **Manifold Integration**: Uses Manifold Client SDK to interact with NFT products
- **USDC Cost Conversion**: Converts ETH and other costs to USDC using Relay SDK
- **Multi-Network Support**: Supports Base mainnet (8453) and Base Sepolia (84532)
- **Admin Wallet Minting**: Admin wallet pays for gas while user receives the NFT

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
pnpm install
```

2. Copy and configure environment variables:

```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:

- `ADMIN_WALLET_PRIVATE_KEY`: Admin wallet private key for minting
- `ADMIN_WALLET_ADDRESS`: Admin wallet address
- `RPC_URL_BASE`: Base mainnet RPC URL
- `RPC_URL_BASE_SEPOLIA`: Base Sepolia RPC URL
- `RPC_URL_SEPOLIA`: Sepolia RPC URl

## Usage

### Starting the Server

```bash
pnpm run start
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
pnpm build
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

### Type Checking

```bash
pnpm typecheck
```

## License

ISC
