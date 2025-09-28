import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import { createClient, AppType, type BlindMintProduct, type EditionProduct, type Product } from '../src/index';

// Load environment variables
dotenv.config();

// Environment variable helpers
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const getNetworkRPCs = (): Record<number, string> => {
  const rpcs: Record<number, string> = {};
  
  if (process.env.ETH_MAINNET_RPC) rpcs[1] = process.env.ETH_MAINNET_RPC;
  if (process.env.BASE_RPC) rpcs[8453] = process.env.BASE_RPC;
  if (process.env.OPTIMISM_RPC) rpcs[10] = process.env.OPTIMISM_RPC;
  if (process.env.SHAPE_RPC) rpcs[360] = process.env.SHAPE_RPC;
  if (process.env.SEPOLIA_RPC) rpcs[11155111] = process.env.SEPOLIA_RPC;
  
  return rpcs;
};

async function testProduct(product: Product, wallet?: ethers.Wallet) {
  console.log(`\n📦 Testing ${product.type} Product`);
  console.log(`   Name: ${product.data.publicData.title || 'Unknown'}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Network: ${product.data.publicData.network}`);

  try {
    // Get product status
    const status = await product.getStatus();
    console.log(`   Status: ${status}`);

    // Test allocation check
    const testAddress = wallet ? wallet.address : '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const allocation = await product.getAllocations({
      recipientAddress: testAddress,
    });
    console.log(`\n   🎫 Allocation for ${testAddress.slice(0, 10)}...`);
    console.log(`      Eligible: ${allocation.isEligible}`);
    console.log(`      Available: ${allocation.quantity}`);
    if (allocation.reason) {
      console.log(`      Reason: ${allocation.reason}`);
    }

    // Prepare purchase if eligible
    if (allocation.isEligible && allocation.quantity > 0) {
      console.log(`\n   💰 Preparing purchase for 1 NFT...`);
      
      const quantity = 1;
      const payload = product.type === AppType.BLIND_MINT 
        ? { quantity }
        : product.type === AppType.EDITION
        ? { quantity }
        : undefined;

      const prepared = await product.preparePurchase({
        address: testAddress,
        payload,
      });

      console.log(`      Total Cost: ${prepared.cost.total.formatted}`);
      console.log(`      Subtotal: ${prepared.cost.subtotal.formatted}`);
      console.log(`      Fees: ${prepared.cost.fees.formatted}`);
      console.log(`      Steps: ${prepared.steps.length}`);
      
      prepared.steps.forEach((step, i) => {
        console.log(`      Step ${i + 1}: ${step.name} (${step.type})`);
        if (step.gasEstimate) {
          console.log(`         Gas: ${step.gasEstimate.toString()}`);
        }
      });

      // Execute purchase if wallet provided
      if (wallet) {
        console.log(`\n   🛒 Would execute purchase with wallet ${wallet.address.slice(0, 10)}...`);
        console.log(`      (Skipping actual transaction in playground)`);
        
        // Uncomment to actually execute:
        // const order = await product.purchase({
        //   account: wallet,
        //   preparedPurchase: prepared,
        // });
        // console.log(`   ✅ Order completed: ${order.receipts[0]?.txHash}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error testing product:`, error);
  }
}

async function main() {
  console.log('🎭 Manifold Client SDK Playground');
  console.log('==================================\n');

  // Load configuration from environment
  const debug = process.env.DEBUG === 'true';
  const httpRPCs = getNetworkRPCs();
  const testNetworkId = parseInt(getEnvVar('TEST_NETWORK_ID', '11155111'));
  const testInstanceId = getEnvVar('TEST_INSTANCE_ID', '4150231280');
  const privateKey = process.env.TEST_PRIVATE_KEY;

  console.log('📋 Configuration:');
  console.log(`   Debug: ${debug}`);
  console.log(`   Test Network: ${testNetworkId}`);
  console.log(`   Test Instance: ${testInstanceId}`);
  console.log(`   RPC Networks: ${Object.keys(httpRPCs).join(', ')}`);

  // Create wallet if private key provided
  let wallet: ethers.Wallet | undefined;
  if (privateKey && privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    const networkRpc = httpRPCs[testNetworkId];
    if (networkRpc) {
      const provider = new ethers.providers.JsonRpcProvider(networkRpc);
      wallet = new ethers.Wallet(privateKey, provider);
      console.log(`   Wallet: ${wallet.address.slice(0, 10)}...`);
      
      // Check balance
      const balance = await wallet.getBalance();
      console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
    }
  } else {
    console.log('   Wallet: Not configured (using read-only mode)');
  }

  // Create client
  const client = createClient({
    debug,
    httpRPCs,
  });

  console.log('\n✅ Client created successfully');

  // Test 1: Get product by instance ID
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Get Product by Instance ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const product = await client.getProduct(testInstanceId);
    await testProduct(product, wallet);
  } catch (error) {
    console.error('❌ Error getting product:', error);
  }

  // Test 2: Test specific product types if configured
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 2: Product Type Specific Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const productTypeTests = [
    { id: process.env.TEST_EDITION_INSTANCE_ID, type: 'Edition' },
    { id: process.env.TEST_BURN_REDEEM_INSTANCE_ID, type: 'BurnRedeem' },
    { id: process.env.TEST_BLIND_MINT_INSTANCE_ID, type: 'BlindMint' },
  ];

  for (const test of productTypeTests) {
    if (test.id) {
      console.log(`\nTesting ${test.type} (Instance: ${test.id})...`);
      try {
        const product = await client.getProduct(test.id);
        await testProduct(product, wallet);
      } catch (error) {
        console.error(`❌ Error testing ${test.type}:`, error);
      }
    }
  }

  // Test 3: URL parsing
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 3: URL Parsing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const testUrl = `https://manifold.xyz/@creator/id/${testInstanceId}`;
  console.log(`\nTesting URL: ${testUrl}`);
  
  try {
    const product = await client.getProduct(testUrl);
    console.log(`✅ Successfully parsed URL and got product: ${product.data.publicData.title || product.id}`);
  } catch (error) {
    console.error('❌ Error parsing URL:', error);
  }

  // Test 4: Workspace products
  if (process.env.TEST_WORKSPACE) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test 4: Workspace Products');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const products = await client.getProductsByWorkspace(process.env.TEST_WORKSPACE, {
        limit: 5,
        networkId: testNetworkId,
      });
      
      console.log(`\nFound ${products.length} products in workspace:`);
      for (const product of products) {
        console.log(`   - ${product.data.publicData.title || 'Untitled'} (${product.type})`);
      }
    } catch (error) {
      console.error('❌ Error getting workspace products:', error);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Playground completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run the playground
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});