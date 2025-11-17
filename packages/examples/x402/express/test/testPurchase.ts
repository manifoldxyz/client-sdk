import { config } from "dotenv";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { withPaymentInterceptor } from "x402-axios";
import axios from "axios";
import { baseSepolia } from "viem/chains";

config();

// Environment variables
const RESOURCE_SERVER_URL = process.env.RESOURCE_SERVER_URL || "http://localhost:4022";
const PRIVATE_KEY = process.env.TEST_USER_PRIVATE_KEY;
const MANIFOLD_INSTANCE_ID = process.env.TEST_MANIFOLD_INSTANCE_ID || "4150231280"; // Example ID

if (!PRIVATE_KEY) {
  console.error("❌ TEST_USER_PRIVATE_KEY is required in .env");
  process.exit(1);
}

async function testManifoldPurchase() {
  try {
    console.log("🔧 Setting up wallet client...");
    
    // Create wallet client with public actions
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const client = createWalletClient({
      account,
      transport: http(),
      chain: baseSepolia,
    }).extend(publicActions);

    // Get wallet address and balance
    const address = account.address;
    console.log(`📍 Wallet address: ${address}`);
    
    // Check USDC balance
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
    const balance = await client.readContract({
      address: usdcAddress as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });
    
    console.log(`💰 USDC Balance: ${balance.toString()} (raw units)`);
    
    // Create Axios instance with payment handling
    console.log("\n🔐 Setting up x402-axios client...");
    const api = withPaymentInterceptor(
      axios.create({
        baseURL: RESOURCE_SERVER_URL,
      }),
      client
    );

    // Test endpoint path - using base-sepolia as the payment network
    const ENDPOINT_PATH = `/manifold/base-sepolia/id/${MANIFOLD_INSTANCE_ID}/purchase`;
    const quantity = 1;
    const fullUrl = `${ENDPOINT_PATH}?quantity=${quantity}&userAddress=${address}`;
    
    console.log(`\n🎯 Testing endpoint: ${RESOURCE_SERVER_URL}${fullUrl}`);
    console.log(`📦 Product ID: ${MANIFOLD_INSTANCE_ID}`);
    console.log(`🔢 Quantity: ${quantity}`);
    
    // Make request to paid endpoint
    console.log("\n📤 Making request (will handle 402 payment automatically)...");
    const response = await api.get(fullUrl);
    
    // Check for payment response header
    const paymentResponseHeader = response.headers['x-payment-response'];
    if (paymentResponseHeader) {
      console.log("\n✅ Payment processed successfully!");
      console.log("📝 Payment Response Header:", paymentResponseHeader);
      
      // Decode the payment response if it's base64
      try {
        const decoded = Buffer.from(paymentResponseHeader, 'base64').toString();
        console.log("📜 Decoded Payment Response:", JSON.parse(decoded));
      } catch {
        console.log("📜 Payment Response:", paymentResponseHeader);
      }
    }
    
    // Display the response data
    console.log("\n🎉 Purchase Response:");
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if it's a successful mint response
    if (response.data.success) {
      console.log("\n🏆 NFT Minted Successfully!");
      console.log(`🔗 Transaction Hash: ${response.data.transactionHash}`);
      console.log(`📍 Recipient: ${response.data.recipient}`);
      console.log(`💵 Total Cost: ${response.data.totalCost?.formatted}`);
      
      if (response.data.tokens && response.data.tokens.length > 0) {
        console.log("🎨 Minted Tokens:");
        response.data.tokens.forEach((token: any) => {
          console.log(`  - Token ID: ${token.tokenId}`);
          console.log(`    Contract: ${token.contractAddress}`);
          console.log(`    Explorer: ${token.explorerUrl}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error("\n❌ Test failed!");
    
    if (error.response) {
      console.error("📊 Response Status:", error.response.status);
      console.error("📋 Response Data:", JSON.stringify(error.response.data, null, 2));
      
      // If it's a 402 response, show the payment requirements
      if (error.response.status === 402 && error.response.data.accepts) {
        console.log("\n💳 Payment Requirements:");
        error.response.data.accepts.forEach((req: any) => {
          console.log(`  - Network: ${req.network}`);
          console.log(`    Amount: ${req.maxAmountRequired} (atomic units)`);
          console.log(`    Asset: ${req.asset}`);
          console.log(`    Pay To: ${req.payTo}`);
        });
      }
    } else if (error.request) {
      console.error("📡 No response received. Is the server running?");
    } else {
      console.error("🐛 Error:", error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
console.log("🚀 Starting Manifold x402 Purchase Test");
console.log("=====================================\n");

testManifoldPurchase().then(() => {
  console.log("\n✨ Test completed successfully!");
  process.exit(0);
}).catch(error => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});