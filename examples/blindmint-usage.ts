/**
 * BlindMint SDK Usage Examples
 * 
 * Comprehensive examples demonstrating how to use the Manifold Client SDK
 * for BlindMint product integration, covering all major use cases.
 */

import { createClient } from '../src/client';
import { AccountAdapterFactory } from '../src/adapters/account-adapter-factory';
import type { NetworkId } from '../src/types/common';
import type { IAccount } from '../src/types/account-adapter';

// Simulated wallet imports (in real usage, these would be actual wallet imports)
declare const ethers: any; // ethers v5
declare const viem: any; // viem
declare const window: any; // browser window object

// =============================================================================
// BASIC USAGE
// =============================================================================

/**
 * Example 1: Basic BlindMint Product Setup
 * 
 * This example shows the simplest way to get started with a BlindMint product.
 */
async function basicBlindMintExample() {
  console.log('=== Basic BlindMint Example ===');
  
  // Create a client with default configuration
  const client = createClient({
    debug: true,
    environment: 'development'
  });

  try {
    // Fetch BlindMint product by instance ID
    const instanceId = '4150231280';
    const product = await client.getProduct(instanceId);
    
    console.log('Product Type:', product.type);
    console.log('Product ID:', product.id);
    console.log('Title:', product.data.publicData.title);
    console.log('Description:', product.data.publicData.description);
    console.log('Mint Price:', {
      value: product.data.publicData.mintPrice.value.toString(),
      currency: product.data.publicData.mintPrice.currency
    });
    console.log('Contract:', product.data.publicData.contract);
    console.log('Network:', product.data.publicData.network);
    
  } catch (error) {
    console.error('Failed to fetch BlindMint product:', error);
  }
}

/**
 * Example 2: Using Manifold URLs
 * 
 * The SDK can parse Manifold URLs directly.
 */
async function manifestUrlExample() {
  console.log('=== Manifold URL Example ===');
  
  const client = createClient();

  try {
    // You can use Manifold URLs directly
    const manifestUrl = 'https://manifold.xyz/@creator/id/4150231280';
    const product = await client.getProduct(manifestUrl);
    
    console.log('Parsed from URL:', product.id);
    console.log('Creator:', product.data.creator.name);
    
  } catch (error) {
    console.error('Failed to parse Manifold URL:', error);
  }
}

// =============================================================================
// ADVANCED CONFIGURATION
// =============================================================================

/**
 * Example 3: Advanced Client Configuration
 * 
 * Shows how to configure the client for different environments and networks.
 */
async function advancedConfigurationExample() {
  console.log('=== Advanced Configuration Example ===');
  
  // Production configuration with custom RPC endpoints
  const productionClient = createClient({
    debug: false,
    environment: 'production',
    httpRPCs: {
      1: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      137: 'https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID',
      8453: 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY'
    }
  });

  // Development configuration with debugging enabled
  const devClient = createClient({
    debug: true,
    environment: 'development',
    enableStrictMode: false,
    aggressiveCaching: false
  });

  console.log('Clients configured for different environments');
}

// =============================================================================
// MINTING WORKFLOWS
// =============================================================================

/**
 * Example 4: Complete Minting Workflow with Account Adapters
 * 
 * Demonstrates the new account adapter pattern for wallet integration.
 */
async function completeMintin gWorkflow() {
  console.log('=== Complete Minting Workflow with Account Adapters ===');
  
  const client = createClient({
    debug: true,
    environment: 'development'
  });

  try {
    const instanceId = '4150231280';
    const product = await client.getProduct(instanceId);
    
    // Validate this is a BlindMint product
    if (product.type !== 'blind-mint') {
      throw new Error(`Expected BlindMint product, got ${product.type}`);
    }

    // Check product status and availability
    console.log('Product Status:', await product.getStatus());
    
    // === NEW: Account Adapter Pattern ===
    // Option 1: Create adapter from ethers v5
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const ethersAdapter = AccountAdapterFactory.fromEthers5(signer);
    
    // Option 2: Create adapter from viem
    // const viemClient = viem.createWalletClient({
    //   chain: viem.chains.mainnet,
    //   transport: viem.custom(window.ethereum)
    // });
    // const viemAdapter = AccountAdapterFactory.fromViem(viemClient);
    
    // Use the adapter (ethers example)
    const accountAdapter = ethersAdapter;
    console.log('Connected wallet:', accountAdapter.address);
    console.log('Connected network:', await accountAdapter.getConnectedNetworkId());
    
    // Prepare minting parameters using account adapter
    const quantity = 1;
    const networkId: NetworkId = product.data.publicData.network;

    console.log('Preparing to mint:', {
      wallet: accountAdapter.address,
      quantity,
      networkId,
      adapterType: accountAdapter.adapterType
    });

    // Prepare purchase with account adapter
    const preparedPurchase = await product.preparePurchase({
      accountAdapter, // NEW: Use account adapter instead of address
      payload: { quantity },
      gasBuffer: { multiplier: 120 } // 20% gas buffer
    });
    
    console.log('Purchase prepared:', {
      cost: preparedPurchase.cost,
      steps: preparedPurchase.steps.map(s => ({ id: s.id, name: s.name, type: s.type })),
      isEligible: preparedPurchase.isEligible
    });

    // Execute purchase with account adapter
    const order = await product.purchase({
      accountAdapter, // NEW: Use account adapter for purchase
      preparedPurchase
    });

    console.log('Mint completed successfully:', {
      orderId: order.id,
      status: order.status,
      receipts: order.receipts.map(r => ({ txHash: r.txHash, step: r.step }))
    });
    
  } catch (error: any) {
    console.error('Minting workflow failed:', error);
    
    // Handle adapter-specific error types
    if (error.code === 'NETWORK_MISMATCH') {
      console.log('Wallet is connected to wrong network - switch networks');
    } else if (error.code === 'TRANSACTION_FAILED') {
      console.log('Transaction failed - check transaction details');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('Ensure wallet has sufficient funds');
    } else if (error.code === 'TRANSACTION_REJECTED') {
      console.log('User rejected transaction');
    }
  }
}

/**
 * Example 5: Batch Minting with Different Adapters
 * 
 * Shows how to handle multiple quantity minting and switching between adapters.
 */
async function batchMintingExample() {
  console.log('=== Batch Minting with Different Adapters ===');
  
  const client = createClient({ debug: true });

  try {
    const product = await client.getProduct('4150231280');
    
    // Example with multiple wallet types
    const walletScenarios = [
      {
        name: 'Ethers v5 Wallet',
        createAdapter: () => {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          return AccountAdapterFactory.fromEthers5(signer);
        }
      },
      {
        name: 'Viem Wallet',
        createAdapter: () => {
          // const client = viem.createWalletClient({
          //   chain: viem.chains.mainnet,
          //   transport: viem.custom(window.ethereum)
          // });
          // return AccountAdapterFactory.fromViem(client);
          return null; // Placeholder for demo
        }
      }
    ];

    for (const scenario of walletScenarios) {
      if (!scenario.createAdapter()) continue; // Skip viem for demo
      
      console.log(`\n--- ${scenario.name} ---`);
      const adapter = scenario.createAdapter()!;
      
      // Verify network compatibility
      const connectedNetwork = await adapter.getConnectedNetworkId();
      const productNetwork = product.data.publicData.network;
      
      if (connectedNetwork !== productNetwork) {
        console.log(`Network mismatch: wallet=${connectedNetwork}, product=${productNetwork}`);
        
        // Attempt to switch networks
        try {
          await adapter.switchNetwork(productNetwork);
          console.log(`Successfully switched to network ${productNetwork}`);
        } catch (switchError) {
          console.log('Failed to switch networks:', switchError);
          continue;
        }
      }
      
      // Prepare batch mint
      const quantity = 3;
      const preparedPurchase = await product.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity },
        gasBuffer: { multiplier: 130 } // 30% buffer for batch
      });
      
      console.log('Batch mint prepared:', {
        adapterType: adapter.adapterType,
        wallet: adapter.address,
        quantity,
        totalCost: preparedPurchase.cost.total,
        steps: preparedPurchase.steps.length
      });
      
      // In real implementation, would execute the purchase
      // const order = await product.purchase({ accountAdapter: adapter, preparedPurchase });
    }

  } catch (error) {
    console.error('Batch minting failed:', error);
  }
}

// =============================================================================
// ERROR HANDLING PATTERNS
// =============================================================================

/**
 * Example 6: Comprehensive Error Handling
 * 
 * Demonstrates best practices for handling different types of errors.
 */
async function errorHandlingPatterns() {
  console.log('=== Error Handling Patterns ===');
  
  const client = createClient({
    debug: false, // Production mode - no fallbacks
    environment: 'production'
  });

  const errorScenarios = [
    { id: 'invalid-id', description: 'Invalid instance ID format' },
    { id: '999999999', description: 'Non-existent instance ID' },
    { id: '', description: 'Empty instance ID' }
  ];

  for (const scenario of errorScenarios) {
    try {
      console.log(`Testing: ${scenario.description}`);
      await client.getProduct(scenario.id);
      
    } catch (error: any) {
      console.log(`Expected error for ${scenario.description}:`, {
        code: error.code,
        message: error.message,
        recoverable: ['NETWORK_ERROR', 'API_ERROR'].includes(error.code)
      });
    }
  }
}

/**
 * Example 7: Retry and Fallback Strategies
 * 
 * Shows how to implement retry logic for network failures.
 */
async function retryAndFallbackExample() {
  console.log('=== Retry and Fallback Example ===');
  
  async function fetchWithRetry(instanceId: string, maxRetries = 3) {
    const client = createClient({
      debug: true, // Enable fallback in debug mode
      environment: 'development'
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries}`);
        const product = await client.getProduct(instanceId);
        console.log('Success on attempt', attempt);
        return product;
        
      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error.code);
        
        if (attempt === maxRetries) {
          console.log('All attempts failed, using fallback strategy');
          
          // In debug mode, SDK will fallback to mock data
          if (error.code === 'NETWORK_ERROR') {
            // Could implement custom fallback logic here
            throw new Error('Service unavailable, please try again later');
          }
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  try {
    await fetchWithRetry('4150231280');
  } catch (error) {
    console.error('Retry strategy exhausted:', error);
  }
}

// =============================================================================
// NETWORK AND MULTI-CHAIN SCENARIOS
// =============================================================================

/**
 * Example 8: Multi-Network Support
 * 
 * Demonstrates handling products across different blockchain networks.
 */
async function multiNetworkExample() {
  console.log('=== Multi-Network Example ===');
  
  const client = createClient({
    httpRPCs: {
      1: 'https://mainnet.infura.io/v3/PROJECT_ID',      // Ethereum
      137: 'https://polygon-mainnet.infura.io/v3/PROJECT_ID', // Polygon
      8453: 'https://base-mainnet.g.alchemy.com/v2/API_KEY'   // Base
    }
  });

  // Example products on different networks
  const networkProducts = [
    { id: '1234567890', expectedNetwork: 1, name: 'Ethereum BlindMint' },
    { id: '2345678901', expectedNetwork: 137, name: 'Polygon BlindMint' },
    { id: '3456789012', expectedNetwork: 8453, name: 'Base BlindMint' }
  ];

  for (const productInfo of networkProducts) {
    try {
      console.log(`Fetching ${productInfo.name}...`);
      const product = await client.getProduct(productInfo.id);
      
      console.log(`Network: ${product.data.publicData.network}`);
      console.log(`Expected: ${productInfo.expectedNetwork}`);
      console.log(`Match: ${product.data.publicData.network === productInfo.expectedNetwork}`);
      
      // Network-specific handling
      switch (product.data.publicData.network) {
        case 1:
          console.log('Using Ethereum-specific gas estimation...');
          break;
        case 137:
          console.log('Using Polygon-specific gas estimation...');
          break;
        case 8453:
          console.log('Using Base-specific gas estimation...');
          break;
        default:
          console.log('Unknown network, using default settings...');
      }
      
    } catch (error) {
      console.error(`Failed to fetch ${productInfo.name}:`, error);
    }
  }
}

// =============================================================================
// PAYMENT TOKEN SCENARIOS
// =============================================================================

/**
 * Example 9: ERC20 Token Payments with Account Adapters
 * 
 * Shows how to handle ERC20 payments with automatic approval handling.
 */
async function erc20PaymentExample() {
  console.log('=== ERC20 Payment with Account Adapters ===');
  
  const client = createClient({ debug: true });

  try {
    const product = await client.getProduct('4150231280');
    
    // Create account adapter
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const adapter = AccountAdapterFactory.fromEthers5(signer);
    
    console.log('Connected wallet:', adapter.address);
    
    // Fetch onchain data to get current pricing
    const onchainData = await product.fetchOnchainData();
    console.log('Payment Details:', {
      cost: onchainData.cost.formatted,
      symbol: onchainData.cost.symbol,
      isERC20: onchainData.cost.isERC20(),
      tokenAddress: onchainData.cost.erc20
    });

    // Check wallet balance for the payment token
    const balance = await adapter.getBalance(
      onchainData.cost.isERC20() ? onchainData.cost.erc20 : undefined
    );
    console.log('Wallet balance:', balance.formatted, balance.symbol);
    
    if (balance.lt(onchainData.cost)) {
      console.log('⚠️ Insufficient balance for purchase');
      console.log(`Need: ${onchainData.cost.formatted} ${onchainData.cost.symbol}`);
      console.log(`Have: ${balance.formatted} ${balance.symbol}`);
      return;
    }

    // Prepare purchase - SDK handles ERC20 approval automatically
    const preparedPurchase = await product.preparePurchase({
      accountAdapter: adapter,
      payload: { quantity: 1 }
    });
    
    console.log('\nTransaction steps:');
    preparedPurchase.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${step.name} (${step.type})`);
      console.log(`   Description: ${step.description}`);
      if (step.cost) {
        if (step.cost.native) {
          console.log(`   Native cost: ${step.cost.native.formatted} ${step.cost.native.symbol}`);
        }
        if (step.cost.erc20s?.length) {
          step.cost.erc20s.forEach(token => {
            console.log(`   Token cost: ${token.formatted} ${token.symbol}`);
          });
        }
      }
    });
    
    console.log('\nTotal cost breakdown:');
    if (preparedPurchase.cost.total.native) {
      console.log(`Native: ${preparedPurchase.cost.total.native.formatted} ${preparedPurchase.cost.total.native.symbol}`);
    }
    if (preparedPurchase.cost.total.erc20s?.length) {
      preparedPurchase.cost.total.erc20s.forEach(token => {
        console.log(`Token: ${token.formatted} ${token.symbol}`);
      });
    }
    
    // In real implementation, would execute the purchase
    // This automatically handles:
    // 1. ERC20 approval if needed
    // 2. Mint transaction
    // const order = await product.purchase({ accountAdapter: adapter, preparedPurchase });
    // console.log('Purchase completed:', order.id);

  } catch (error: any) {
    console.error('ERC20 payment example failed:', error);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💡 Solution: Add more tokens to your wallet');
    } else if (error.code === 'TRANSACTION_REJECTED') {
      console.log('💡 User cancelled the transaction');
    }
  }
}

// =============================================================================
// PERFORMANCE OPTIMIZATION
// =============================================================================

/**
 * Example 10: Performance Optimization Strategies
 * 
 * Demonstrates caching, batching, and other performance optimizations.
 */
async function performanceOptimizationExample() {
  console.log('=== Performance Optimization Example ===');
  
  const client = createClient({
    aggressiveCaching: true, // Enable aggressive caching
    environment: 'production'
  });

  // Example 1: Batch fetch multiple products
  async function batchFetchProducts(instanceIds: string[]) {
    console.log('Batch fetching products...');
    const start = Date.now();
    
    // Fetch all products concurrently
    const promises = instanceIds.map(id => 
      client.getProduct(id).catch(error => ({ error, id }))
    );
    
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    const successful = results.filter(r => !('error' in r));
    const failed = results.filter(r => 'error' in r);
    
    console.log(`Batch fetch completed in ${duration}ms:`);
    console.log(`- Successful: ${successful.length}`);
    console.log(`- Failed: ${failed.length}`);
    
    return { successful, failed, duration };
  }

  // Example 2: Cache utilization
  async function cacheUtilizationDemo(instanceId: string) {
    console.log('Testing cache utilization...');
    
    // First call - should hit API
    const start1 = Date.now();
    await client.getProduct(instanceId);
    const duration1 = Date.now() - start1;
    
    // Second call - should hit cache
    const start2 = Date.now();
    await client.getProduct(instanceId);
    const duration2 = Date.now() - start2;
    
    console.log(`First call (API): ${duration1}ms`);
    console.log(`Second call (cache): ${duration2}ms`);
    console.log(`Cache speedup: ${Math.round(duration1 / duration2)}x faster`);
  }

  // Run examples
  await batchFetchProducts(['4150231280', '1234567890', '2345678901']);
  await cacheUtilizationDemo('4150231280');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Starting Manifold BlindMint SDK Examples\n');
  
  const examples = [
    { name: 'Basic BlindMint', fn: basicBlindMintExample },
    { name: 'Manifold URL Parsing', fn: manifestUrlExample },
    { name: 'Advanced Configuration', fn: advancedConfigurationExample },
    { name: 'Complete Minting Workflow (Account Adapters)', fn: completeMintin gWorkflow },
    { name: 'Batch Minting (Multi-Adapter)', fn: batchMintingExample },
    { name: 'Error Handling', fn: errorHandlingPatterns },
    { name: 'Retry and Fallback', fn: retryAndFallbackExample },
    { name: 'Multi-Network Support', fn: multiNetworkExample },
    { name: 'ERC20 Payments (Account Adapters)', fn: erc20PaymentExample },
    { name: 'Performance Optimization', fn: performanceOptimizationExample },
    { name: 'Account Adapter Factory Patterns', fn: accountAdapterFactoryExample }
  ];

  for (const example of examples) {
    try {
      await example.fn();
      console.log(`✅ ${example.name} completed\n`);
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error);
      console.log('');
    }
  }

  console.log('🏁 All examples completed!');
}

/**
 * Example 11: Account Adapter Factory Patterns
 * 
 * Demonstrates different ways to create and use account adapters.
 */
async function accountAdapterFactoryExample() {
  console.log('=== Account Adapter Factory Patterns ===');
  
  try {
    // Method 1: Explicit factory methods (recommended)
    console.log('\n--- Explicit Factory Methods ---');
    
    // Ethers v5
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const ethersAdapter = AccountAdapterFactory.fromEthers5(signer);
      
      console.log('Ethers v5 adapter created:', {
        type: ethersAdapter.adapterType,
        address: ethersAdapter.address
      });
    } catch (error) {
      console.log('Ethers v5 not available:', error.message);
    }
    
    // Viem (commented out for demo)
    // try {
    //   const viemClient = viem.createWalletClient({
    //     chain: viem.chains.mainnet,
    //     transport: viem.custom(window.ethereum)
    //   });
    //   const viemAdapter = AccountAdapterFactory.fromViem(viemClient);
    //   
    //   console.log('Viem adapter created:', {
    //     type: viemAdapter.adapterType,
    //     address: viemAdapter.address
    //   });
    // } catch (error) {
    //   console.log('Viem not available:', error.message);
    // }
    
    // Method 2: Auto-detection (legacy, less reliable)
    console.log('\n--- Auto-Detection (Legacy) ---');
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const autoAdapter = AccountAdapterFactory.create(signer); // Auto-detect
      
      console.log('Auto-detected adapter:', {
        type: autoAdapter.adapterType,
        address: autoAdapter.address
      });
    } catch (error) {
      console.log('Auto-detection failed:', error.message);
    }
    
    // Method 3: Provider detection for debugging
    console.log('\n--- Provider Detection ---');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const detection = AccountAdapterFactory.detectProvider(signer);
    
    console.log('Provider detection results:', {
      isEthers5: detection.isEthers5,
      isEthers6: detection.isEthers6,
      isViem: detection.isViem,
      confidence: detection.confidence,
      features: detection.features
    });
    
  } catch (error) {
    console.error('Account adapter factory example failed:', error);
  }
}

// Export for testing and documentation
export {
  basicBlindMintExample,
  manifestUrlExample,
  advancedConfigurationExample,
  completeMintin gWorkflow,
  batchMintingExample,
  errorHandlingPatterns,
  retryAndFallbackExample,
  multiNetworkExample,
  erc20PaymentExample,
  performanceOptimizationExample,
  accountAdapterFactoryExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}