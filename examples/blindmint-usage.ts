/**
 * BlindMint SDK Usage Examples
 * 
 * Comprehensive examples demonstrating how to use the Manifold Client SDK
 * for BlindMint product integration, covering all major use cases.
 */

import { createClient } from '../src/client';
import type { NetworkId } from '../src/types/common';

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
 * Example 4: Complete Minting Workflow
 * 
 * Demonstrates a complete minting process including validation and error handling.
 */
async function completeMintin gWorkflow() {
  console.log('=== Complete Minting Workflow ===');
  
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
    console.log('Product Status:', product.data.publicData);
    
    // Prepare minting parameters
    const userAddress = '0x742d35Cc6634C0532925a3b8D66320d7c2fbd768'; // Example address
    const networkId: NetworkId = product.data.publicData.network;
    const quantity = 1;

    console.log('Preparing to mint:', {
      to: userAddress,
      quantity,
      networkId,
      contract: product.data.publicData.contract,
      mintPrice: product.data.publicData.mintPrice
    });

    // Execute the mint (this would interact with blockchain)
    const mintResult = await product.mint({
      to: userAddress,
      quantity,
      networkId
    });

    console.log('Mint prepared successfully:', mintResult);
    
  } catch (error) {
    console.error('Minting workflow failed:', error);
    
    // Handle specific error types
    if (error.code === 'INVALID_INPUT') {
      console.log('Fix input validation errors and try again');
    } else if (error.code === 'NETWORK_ERROR') {
      console.log('Check network connection and try again');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('Ensure wallet has sufficient funds');
    }
  }
}

/**
 * Example 5: Batch Minting
 * 
 * Shows how to handle multiple quantity minting.
 */
async function batchMintingExample() {
  console.log('=== Batch Minting Example ===');
  
  const client = createClient({ debug: true });

  try {
    const product = await client.getProduct('4150231280');
    
    // Mint multiple tokens at once
    const batchMintResult = await product.mint({
      to: '0x742d35Cc6634C0532925a3b8D66320d7c2fbd768',
      quantity: 5, // Mint 5 tokens
      networkId: 1
    });

    console.log('Batch mint prepared:', {
      quantity: 5,
      estimatedGas: 'TBD', // Would be calculated
      totalCost: 'TBD'     // Would be calculated
    });

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
 * Example 9: ERC20 Token Payments
 * 
 * Shows how to handle BlindMints that use ERC20 tokens for payment.
 */
async function erc20PaymentExample() {
  console.log('=== ERC20 Payment Example ===');
  
  const client = createClient({ debug: true });

  try {
    const product = await client.getProduct('4150231280');
    const mintPrice = product.data.publicData.mintPrice;
    
    console.log('Payment Details:', {
      currency: mintPrice.currency,
      amount: mintPrice.value.toString(),
      isERC20: mintPrice.erc20 !== '0x0000000000000000000000000000000000000000'
    });

    if (mintPrice.erc20 !== '0x0000000000000000000000000000000000000000') {
      console.log('ERC20 Token Payment Required:');
      console.log('Token Contract:', mintPrice.erc20);
      console.log('Amount:', mintPrice.value.toString());
      
      // For ERC20 payments, you would need to:
      // 1. Check token allowance
      // 2. Approve token spending if necessary
      // 3. Execute the mint transaction
      
      console.log('Steps for ERC20 minting:');
      console.log('1. Check token balance and allowance');
      console.log('2. Approve token spending if needed');
      console.log('3. Execute mint transaction');
      
    } else {
      console.log('ETH Payment - Direct transaction');
    }

  } catch (error) {
    console.error('Payment example failed:', error);
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
    { name: 'Complete Minting Workflow', fn: completeMintin gWorkflow },
    { name: 'Batch Minting', fn: batchMintingExample },
    { name: 'Error Handling', fn: errorHandlingPatterns },
    { name: 'Retry and Fallback', fn: retryAndFallbackExample },
    { name: 'Multi-Network Support', fn: multiNetworkExample },
    { name: 'ERC20 Payments', fn: erc20PaymentExample },
    { name: 'Performance Optimization', fn: performanceOptimizationExample }
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
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}