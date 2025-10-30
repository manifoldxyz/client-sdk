import 'dotenv/config';
import { createClient, isEditionProduct } from '@manifoldxyz/client-sdk';
import { 
  createWalletClient, 
  createPublicClient,
  http, 
  type Hex,
  type Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

/**
 * Custom Transaction Execution Example
 * 
 * This example demonstrates how to use the transactionData field from
 * the Manifold SDK to execute transactions directly using viem's sendTransaction,
 * bypassing the SDK's built-in execution logic.
 * 
 * Use Cases:
 * - EIP-7702
 * - Custom gas management strategies
 * - Integration with existing transaction infrastructure
 * - Batch transaction systems
 * - Custom wallet implementations
 * - Transaction queuing systems
 * 
 * Flow:
 * 1. Prepare the purchase using Manifold SDK
 * 2. Extract raw transaction data from each step
 * 3. Execute transactions directly using viem
 * 4. Handle receipts and confirmations manually
 */

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  // Configuration
  const instanceId = getEnv('INSTANCE_ID') || '4133757168';
  const rpcUrl = getEnv('RPC_URL');
  const networkId = Number(getEnv('NETWORK_ID'));
  
  // Wallet private key (the account that will mint and pay)
  const walletPrivateKey = getEnv('WALLET_PRIVATE_KEY').trim();
  const privateKey = (walletPrivateKey.startsWith('0x') ? walletPrivateKey : `0x${walletPrivateKey}`) as `0x${string}`;
  
  const quantity = Number(process.env.MINT_QUANTITY ?? '1');

  console.log('🔧 Setting up custom transaction execution...');
  
  // Create account and clients
  const account = privateKeyToAccount(privateKey);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  console.log(`👤 Wallet address: ${account.address}`);

  // Step 1: Prepare mint using Manifold SDK
  console.log('\n📦 Step 1: Preparing mint transaction with Manifold SDK...');
  
  const client = createClient({
    httpRPCs: {
      [networkId]: rpcUrl,
    },
  });

  const product = await client.getProduct(instanceId);
  if (!isEditionProduct(product)) {
    throw new Error(`Product ${instanceId} is not an Edition product.`);
  }

  // Prepare the purchase for our wallet address
  const preparedPurchase = await product.preparePurchase({
    userAddress: account.address,
    payload: { quantity },
  });

  console.log(`   Mint cost: ${preparedPurchase.cost.total.native.formatted} ETH`);
  
  // Display ERC20 costs if any
  if (preparedPurchase.cost.total.erc20s.length > 0) {
    preparedPurchase.cost.total.erc20s.forEach((erc20Cost) => {
      console.log(`   ERC20 cost: ${erc20Cost.formatted} ${erc20Cost.symbol}`);
    });
  }

  // Step 2: Execute transactions using custom logic
  console.log('\n🚀 Step 2: Executing transactions with custom viem sendTransaction...');
  
  // Inspect all steps before execution
  console.log(`   Total steps to execute: ${preparedPurchase.steps.length}`);
  preparedPurchase.steps.forEach((step, idx) => {
    console.log(`   Step ${idx + 1}: ${step.name} (${step.type})`);
    if (step.transactionData) {
      console.log(`     - Contract: ${step.transactionData.contractAddress}`);
      console.log(`     - Value: ${step.transactionData.value || '0'} wei`);
      console.log(`     - Gas estimate: ${step.transactionData.gasEstimate}`);
    }
  });
  
  const transactionResults: { step: string; hash: string; status: string }[] = [];
  
  // Loop through all prepared steps and execute them directly
  for (let i = 0; i < preparedPurchase.steps.length; i++) {
    const step = preparedPurchase.steps[i];

    console.log(`\n   📝 Processing Step ${i + 1}/${preparedPurchase.steps.length}: ${step.name}`);
    console.log(`      Type: ${step.type}`);
    console.log(`      Description: ${step.description}`);
    
    // Extract transaction data
    const { contractAddress, transactionData, value, gasEstimate } = step.transactionData;
    
    console.log(`      Contract: ${contractAddress}`);
    console.log(`      Value: ${value ? BigInt(value).toString() : '0'} wei`);
    console.log(`      Gas estimate: ${gasEstimate.toString()}`);
    console.log(`      Data: ${transactionData.slice(0, 10)}...`);

    // Custom gas management - you can implement your own strategy here
    const customGasLimit = BigInt(gasEstimate.toString()) * 110n / 100n; // 10% buffer instead of 20%
    console.log(`      Custom gas limit: ${customGasLimit.toString()} (10% buffer)`);

    try {
      console.log(`      Sending transaction...`);
      
      // Direct transaction execution using viem
      const txHash = await walletClient.sendTransaction({
        to: contractAddress as Address,
        data: transactionData as Hex,
        value: value ? BigInt(value.toString()) : 0n,
        gas: customGasLimit,
        // You can add custom parameters here:
        // maxFeePerGas: ...,
        // maxPriorityFeePerGas: ...,
        // nonce: ...,
      });

      console.log(`      Transaction hash: ${txHash}`);
      console.log(`      Waiting for confirmation...`);
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
        // Optional: add custom confirmation blocks
        // confirmations: 2,
      });
      
      // Analyze receipt
      console.log(`      Status: ${receipt.status}`);
      console.log(`      Gas used: ${receipt.gasUsed.toString()} (${(receipt.gasUsed * 100n / customGasLimit).toString()}% of limit)`);
      console.log(`      Block: ${receipt.blockNumber}`);
      console.log(`      Transaction index: ${receipt.transactionIndex}`);
      
      // Check for events/logs
      if (receipt.logs.length > 0) {
        console.log(`      Events emitted: ${receipt.logs.length}`);
        
        // You can decode logs here if needed
        receipt.logs.forEach((log, idx) => {
          console.log(`        Event ${idx + 1}: ${log.address}`);
          if (log.topics.length > 0) {
            console.log(`          Topic: ${log.topics[0]?.slice(0, 10)}...`);
          }
        });
      }
      
      if (receipt.status === 'success') {
        console.log(`      ✅ Step completed successfully!`);
        transactionResults.push({
          step: step.name,
          hash: txHash,
          status: 'success'
        });
      } else {
        console.log(`      ❌ Transaction reverted`);
        transactionResults.push({
          step: step.name,
          hash: txHash,
          status: 'reverted'
        });
        throw new Error(`Transaction reverted for step: ${step.name}`);
      }
      
    } catch (error: any) {
      console.error(`      ❌ Error executing step "${step.name}":`, error.message);
      
      // Custom error handling
      if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error(`         Insufficient funds for transaction`);
      } else if (error.code === 'NONCE_TOO_LOW') {
        console.error(`         Nonce too low - transaction may already be pending`);
      } else if (error.cause) {
        console.error(`         Cause:`, error.cause);
      }
      
      if (error.details) {
        console.error(`         Details:`, error.details);
      }
      
      throw error;
    }
  }

  // Step 3: Summary
  console.log('\n📊 Step 3: Transaction Summary...');

  if (transactionResults.length > 0) {
    console.log('\n🎉 Success! All transactions completed using custom execution');
    console.log(`   Wallet: ${account.address}`);
    console.log(`   Total transactions: ${transactionResults.length}`);
    console.log(`   Product: ${product.previewData.title}`);
    console.log(`   Quantity minted: ${quantity}`);
    
    // Display all transaction details
    console.log('\n📜 Transaction Log:');
    transactionResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.step}`);
      console.log(`      Hash: ${result.hash}`);
      console.log(`      Status: ${result.status}`);
    });
    
    // Get final NFT details if available
    if (transactionResults.some(r => r.step.toLowerCase().includes('mint'))) {
      console.log('\n🖼️  NFT Details:');
      console.log(`   Collection: ${(await product.getProvenance()).contract?.contractAddress}`);
      console.log(`   Network: Chain ID ${networkId}`);
      console.log(`   View on Explorer: https://sepolia.etherscan.io/address/${account.address}#tokentxnsErc1155`);
    }
    
    console.log('\n💡 Benefits of Custom Execution:');
    console.log('   - Full control over gas parameters');
    console.log('   - Custom error handling and retry logic');
    console.log('   - Integration with existing transaction systems');
    console.log('   - Ability to batch or queue transactions');
    console.log('   - Custom logging and monitoring');
  } else {
    throw new Error('No transactions were executed');
  }
}

main()
  .then(() => {
    console.log('\n✨ Custom transaction execution completed!');
    console.log('📚 Key takeaways:');
    console.log('   1. Extracted raw transaction data from SDK');
    console.log('   2. Executed transactions directly with viem');
    console.log('   3. Implemented custom gas and error handling');
    console.log('   4. Full control over transaction lifecycle');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  });