import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  createClient,
  AppType,
  createAccountEthers5,
  isBlindMintProduct,
  type IAccount,
  type Product,
} from '../src/index';

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

interface ProductTestOptions {
  address: string;
  account?: IAccount;
  executePurchase: boolean;
}

async function testBlindMintProduct(
  product: Product,
  { address, account, executePurchase }: ProductTestOptions,
) {
  console.log(`\n📦 Testing ${product.type} Product`);
  console.log(`   Name: ${product.data.appName || 'Unknown'}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Network: ${product.data.publicData.network}`);

  try {
    // Get product status
    const status = await product.getStatus();
    console.log(`   Status: ${status}`);

    // Test allocation check
    const allocation = await product.getAllocations({
      recipientAddress: address as `0x${string}`,
    });
    console.log(`\n   🎫 Allocation for ${address.slice(0, 10)}...`);
    console.log(`      Eligible: ${allocation.isEligible}`);
    console.log(`      Available: ${allocation.quantity}`);
    if (allocation.reason) {
      console.log(`      Reason: ${allocation.reason}`);
    }

    // Prepare purchase if eligible
    if (allocation.isEligible && allocation.quantity > 0) {
      console.log(`\n   💰 Preparing purchase for 1 NFT...`);

      const quantity = 1;
      if (!isBlindMintProduct(product)) {
        throw new Error('Is not a blind mint instance')
      }
      const payload = { quantity }

      const prepared = await product.preparePurchase({
        address,
        payload,
      });

      const nativeTotal = prepared.cost.total.native?.formatted ?? 'n/a';
      const erc20Totals = prepared.cost.total.erc20s
        ?.map((money) => `${money.formatted} ${money.symbol}`)
        .join(', ');

      console.log(`      Total Cost (native): ${nativeTotal}`);
      if (erc20Totals) {
        console.log(`      Total Cost (tokens): ${erc20Totals}`);
      }

      console.log(`      Product Cost: ${prepared.cost.breakdown.product.formatted}`);
      console.log(`      Platform Fee: ${prepared.cost.breakdown.platformFee.formatted}`);
      console.log(`      Steps: ${prepared.steps.length}`);

      prepared.steps.forEach((step, i) => {
        console.log(`      Step ${i + 1}: ${step.name} (${step.type})`);
      });

      // Execute purchase if adapter provided and execution enabled
      if (account) {
        if (executePurchase) {
          console.log(`\n   🛒 Executing purchase via ${account.adapterType} adapter...`);
          const order = await product.purchase({
            account,
            preparedPurchase: prepared,
          });
          const receiptHash = order.receipts[0]?.txHash ?? 'pending';
          console.log(`   ✅ Order submitted: ${receiptHash}`);
        } else {
          console.log(`\n   🛒 Adapter ready (set EXECUTE_PURCHASE=true to send the transaction)`);
        }
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
  const testInstanceId = getEnvVar('TEST_INSTANCE_ID', '4149776624');
  const privateKey = process.env.TEST_PRIVATE_KEY;
  const executePurchase = process.env.EXECUTE_PURCHASE === 'true';

  console.log('📋 Configuration:');
  console.log(`   Debug: ${debug}`);
  console.log(`   Test Network: ${testNetworkId}`);
  console.log(`   Test Instance: ${testInstanceId}`);
  console.log(`   RPC Networks: ${Object.keys(httpRPCs).join(', ')}`);

  // Create wallet if private key provided
  let wallet: ethers.Wallet | undefined;

  if (
    privateKey &&
    privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    const networkRpc = httpRPCs[testNetworkId];
    if (networkRpc) {
      wallet = new ethers.Wallet(privateKey);
      console.log(`   Wallet: ${wallet.address.slice(0, 10)}...`);
    }
  } else {
    console.log('   Wallet: Not configured (using read-only mode)');
  }

  const testAddress = wallet?.address ?? '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

  // Create client
  const client = createClient({
    httpRPCs,
  });

  let account: IAccount | undefined;
  try {
    account = createAccountEthers5(client,  {
      wallet
    })
    // Prime adapter with balance lookup so address becomes available
   const balance=  await account.getBalance(11155111).catch(() => undefined);
   console.log('current balance', balance)
  } catch (adapterError) {
    console.warn('   ⚠️  Unable to initialise ethers5 adapter:', adapterError);
  }

  console.log('\n✅ Client created successfully');

  // Test 1: Get product by instance ID
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test 1: Get Product by Instance ID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const product = await client.getProduct(testInstanceId);
    await testBlindMintProduct(product, {
      address: testAddress,
      account,
      executePurchase,
    });
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
        await testBlindMintProduct(product, {
          address: testAddress,
          account,
          executePurchase,
        });
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
    console.log(
      `✅ Successfully parsed URL and got product: ${product.data.appName || product.id}`,
    );
  } catch (error) {
    console.error('❌ Error parsing URL:', error);
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
