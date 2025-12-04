import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  createClient,
  AppType,
  createAccountEthers5,
  isBlindMintProduct,
  isEditionProduct,
  isManiDeckProduct,
  type IAccount,
  type Product,
  createPublicProviderEthers5,
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


interface ProductTestOptions {
  address: string;
  recipientAddress?: string;
  account?: IAccount;
  executePurchase: boolean;
}

async function testEditionProduct(
  product: Product,
  { address, recipientAddress, account, executePurchase }: ProductTestOptions,
) {
  console.log(`\n📦 Testing ${product.type} Product`);
  console.log(`   Name: ${product.data.appName || 'Unknown'}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Network: ${product.data.publicData.network}`);
  const recipient = recipientAddress || address;
  try {
    // Get product status
    const status = await product.getStatus();
    console.log(`   Status: ${status}`);

    // Test allocation check
    const allocation = await product.getAllocations({
      recipientAddress: recipient as `0x${string}`,
    });
    console.log(`\n   🎫 Allocation for ${recipient.slice(0, 10)}...`);
    console.log(`      Eligible: ${allocation.isEligible}`);
    console.log(`      Available: ${allocation.quantity}`);
    if (allocation.reason) {
      console.log(`      Reason: ${allocation.reason}`);
    }

    // Prepare purchase if eligible
    if (allocation.isEligible) {
      console.log(`\n   💰 Preparing purchase for 1 NFT...`);

      const quantity = 1;
      if (!isEditionProduct(product)) {
        throw new Error('Is not an edition product instance')
      }
      const payload = { quantity }

      const prepared = await product.preparePurchase({
        userAddress: address,
        recipientAddress: recipient,
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
          const receiptHash = order.transactionReceipt.txHash ?? 'pending';
          console.log(`   ✅ Order submitted: ${receiptHash}`);
          const token = order.order.items[0];
          console.log(` Token:`, token)
        } else {
          console.log(`\n   🛒 Adapter ready (set EXECUTE_PURCHASE=true to send the transaction)`);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ Error testing product:`, error);
  }
}

async function testBlindMintProduct(
  product: Product,
  { address, account, executePurchase }: ProductTestOptions,
) {
  console.log(`\n📦 Testing ${product.type} Product`);
  console.log(`   Name: ${product.data.appName || 'Unknown'}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Network: ${product.data.publicData.network}`);
  console.log(`   Account Adapter: ${account ? account.adapterType : 'None'}`);
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
    if (allocation.isEligible) {
      console.log(`\n   💰 Preparing purchase for 1 NFT...`);

      const quantity = 1;
      if (!isBlindMintProduct(product)) {
        throw new Error('Is not a blind mint instance')
      }
      const payload = { quantity }

      const prepared = await product.preparePurchase({
        userAddress: address,
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
          const receiptHash = order.transactionReceipt.txHash ?? 'pending';
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

async function testManiDeckProduct(
  product: Product,
  { address, account, executePurchase }: ProductTestOptions,
) {
  console.log(`\n📦 Testing ${product.type} Product`);
  console.log(`   Name: ${product.data.appName || 'Unknown'}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Network: ${product.data.publicData.network}`);
  console.log(`   Account Adapter: ${account ? account.adapterType : 'None'}`);
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
    if (allocation.isEligible) {
      console.log(`\n   💰 Preparing purchase for 1 NFT...`);

      const quantity = 1;
      if (!isManiDeckProduct(product)) {
        throw new Error('Is not a ManiDeck instance')
      }
      const payload = { quantity }

      const prepared = await product.preparePurchase({
        userAddress: address,
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
          const receiptHash = order.transactionReceipt.txHash ?? 'pending';
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
  const testNetworkId = parseInt(getEnvVar('TEST_NETWORK_ID', '11155111'));
  const testInstanceId = getEnvVar('TEST_INSTANCE_ID', '4149776624');
  const testRPCURL = getEnvVar('RPC_URL')
  const privateKey = process.env.TEST_PRIVATE_KEY;
  const executePurchase = process.env.EXECUTE_PURCHASE === 'true';

  console.log('📋 Configuration:');
  console.log(`   Debug: ${debug}`);
  console.log(`   Test Network: ${testNetworkId}`);
  console.log(`   Test Instance: ${testInstanceId}`);

  // Create wallet if private key provided
  let wallet: ethers.Wallet | undefined;
  const testAddress = wallet?.address || '0x000000000000000000000000000000000000dead';
  const provider = new ethers.providers.JsonRpcProvider(testRPCURL)

  if (
    privateKey &&
    privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  ) {
    wallet = new ethers.Wallet(privateKey, provider);
    console.log(`   Wallet: ${wallet.address.slice(0, 10)}...`);
  } else {
    console.log('   Wallet: Not configured (using read-only mode)');
  }

  const publicProvider = createPublicProviderEthers5({
    [testNetworkId]: provider
  })
  // Create client
  const client = createClient({publicProvider});

  let account: IAccount | undefined;
  try {
    account = createAccountEthers5({
      wallet
    })
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
    
    // Determine product type and call appropriate test function
    if (isEditionProduct(product)) {
      await testEditionProduct(product, {
        address: testAddress,
        account,
        executePurchase,
      });
    } else if (isBlindMintProduct(product)) {
      await testBlindMintProduct(product, {
        address: testAddress,
        account,
        executePurchase,
      });
    } else if (isManiDeckProduct(product)) {
      await testManiDeckProduct(product, {
        address: testAddress,
        account,
        executePurchase,
      });
    }
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
    { id: process.env.TEST_MANI_DECK_INSTANCE_ID, type: 'ManiDeck' },
  ];

  for (const test of productTypeTests) {
    if (test.id) {
      console.log(`\nTesting ${test.type} (Instance: ${test.id})...`);
      try {
        const product = await client.getProduct(test.id);
        
        // Determine product type and call appropriate test function
        if (test.type === 'Edition' && isEditionProduct(product)) {
          await testEditionProduct(product, {
            address: testAddress,
            account,
            executePurchase,
          });
        } else if (test.type === 'BlindMint' && isBlindMintProduct(product)) {
          await testBlindMintProduct(product, {
            address: testAddress,
            account,
            executePurchase,
          });
        } else if (test.type === 'ManiDeck' && isManiDeckProduct(product)) {
          await testManiDeckProduct(product, {
            address: testAddress,
            account,
            executePurchase,
          });
        } else if (test.type === 'BurnRedeem') {
          // BurnRedeem not yet implemented
          console.log(`   ⚠️  BurnRedeem product type not yet implemented`);
        } else {
          console.log(`   ⚠️  Product type mismatch or unsupported: ${product.type}`);
        }
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
