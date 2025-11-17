import 'dotenv/config';
import express from "express";
import cors from "cors";
import {
  Resource,
} from "x402/types";
import { handleManifoldPurchase } from "./handlers/purchaseHandler";



const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as string;

if (!facilitatorUrl || !payTo) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());


app.get("/", (_, res) => {
  res.json({
    message: "X402 Manifold Purchase Serice",
    description: "This server implements x402 payment-enabled endpoints for purchasing digital assets through the Manifold Client SDK",
    version: "1.0.0",
    endpoints: {
      "/": {
        method: "GET",
        description: "Server information and usage guide"
      },
      "/status": {
        method: "GET",
        description: "Health check endpoint"
      },
      "/manifold/:chainName/id/:id/purchase": {
        method: "GET",
        description: "Purchase NFT with x402 payment",
        params: {
          chainName: "Network for payment: 'base','base-sepolia'",
          id: "Manifold product instance ID"
        },
        query: {
          quantity: "Number of NFTs to mint (optional, defaults to 1)",
          userAddress: "Recipient wallet address for initial cost calculation"
        },
        headers: {
          "X-PAYMENT": "Base64 encoded payment for actual purchase"
        }
      }
    },
    supportedNetworks: {
      "base-mainnet": {
        chainId: 8453,
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      },
      "base-sepolia": {
        chainId: 84532,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      }
    },
  });
});

app.get("/status", (_, res) => {
  res.json({
    message: "OK",
  });
});

app.get("/manifold/:chainName/id/:id/purchase", handleManifoldPurchase);

app.listen(4022, () => {
  console.log(`Server hello listening at http://localhost:4022`);
});