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
    message: "Hello World",
  });
});

app.get("/status", (_, res) => {
  res.json({
    message: "OK",
  });
});

// NEW: Manifold NFT Purchase Endpoint with x402 payments
app.get("/manifold/:chainName/id/:id/purchase", handleManifoldPurchase);

app.listen(4022, () => {
  console.log(`Server hello listening at http://localhost:4022`);
});