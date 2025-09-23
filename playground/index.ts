import { createClient, AppType, type EditionProduct } from '../src/index';

async function main() {
  console.log('🎭 Manifold Client SDK Playground\n');

  // Create client with debug enabled
  const client = createClient({
    debug: true,
    httpRPCs: {
      1: 'https://mainnet.infura.io/v3/YOUR_KEY',
      8453: 'https://base-mainnet.infura.io/v3/YOUR_KEY',
    },
  });

  console.log('1. Testing getProduct with instance ID...');
  try {
    const product = await client.getProduct('4150231280');
    console.log(`✅ Product: ${product.name} (${product.type})`);
    console.log(`   Contract: ${product.contractAddress}`);
    console.log(`   Network: ${product.networkId}\n`);

    // Test product status
    const status = await product.getStatus();
    console.log(`📊 Product Status: ${status}\n`);

    // Test allocation check
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const allocation = await product.getAllocations({
      recipientAddress: testAddress,
    });
    console.log(`🎫 Allocation for ${testAddress}:`);
    console.log(`   Eligible: ${allocation.isEligible}`);
    console.log(`   Quantity: ${allocation.quantity}\n`);

    // Test purchase preparation (only for Edition products)
    if (product.type === AppType.Edition) {
      const editionProduct = product as EditionProduct;
      console.log(`💰 Edition Price: ${Number(editionProduct.price) / 1e18} ETH`);

      console.log('⚡ Preparing purchase for 2 NFTs...');
      const prepared = await product.preparePurchase({
        address: testAddress,
        payload: { quantity: 2 },
      });

      console.log(`   Total Cost: ${prepared.cost.total.formatted}`);
      console.log(`   Price: ${prepared.cost.price.formatted}`);
      console.log(`   Fee: ${prepared.cost.fee.formatted}`);
      console.log(`   Gas: ${prepared.cost.gas.formatted}`);
      console.log(`   Steps: ${prepared.steps.length}\n`);

      // Simulate purchase (mock execution)
      console.log('🛒 Executing mock purchase...');
      const order = await product.purchase({
        account: { address: testAddress },
        preparedPurchase: prepared,
      });

      console.log(`✅ Order completed: ${order.id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Receipts: ${order.receipts.length}`);
      order.receipts.forEach((receipt, i) => {
        console.log(`   Receipt ${i + 1}: ${receipt.txHash.slice(0, 10)}...`);
      });
      console.log();
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('2. Testing getProduct with Manifold URL...');
  try {
    const url = 'https://manifold.xyz/@meta8eth/id/4150231280';
    const product = await client.getProduct(url);
    console.log(`✅ Product from URL: ${product.name}\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('3. Testing getProductsByWorkspace...');
  try {
    const products = await client.getProductsByWorkspace('test-workspace', {
      limit: 3,
    });
    console.log(`✅ Found ${products.length} products in workspace:`);
    products.forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.name} (${product.type})`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('4. Testing different product types...');
  const productIds = ['1000', '1001', '1002']; // Edition, BurnRedeem, BlindMint
  for (const id of productIds) {
    try {
      const product = await client.getProduct(id);
      console.log(`✅ ${product.type.toUpperCase()}: ${product.name}`);
      
      if (product.type === AppType.Edition) {
        const edition = product as EditionProduct;
        console.log(`   Supply: ${edition.totalSupply}, Max per wallet: ${edition.maxPerWallet}`);
      }
    } catch (error) {
      console.error(`❌ Error with product ${id}:`, error);
    }
  }

  console.log('\n🎉 Playground completed!');
}

main().catch(console.error);