import 'dotenv/config';
import { createClient, isEditionProduct, createPublicProviderViem } from '@manifoldxyz/client-sdk';
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
  
  const publicProvider = createPublicProviderViem({ [networkId]: publicClient });
  const client = createClient({
    publicProvider,
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
  
  // Step 2: Execute transactions using custom logic
  
  const transactionResults: { step: string; hash: string; status: string }[] = [];
  
  // Loop through all prepared steps and execute them directly
  for (let i = 0; i < preparedPurchase.steps.length; i++) {
    const step = preparedPurchase.steps[i];

    console.log(`\n   📝 Processing Step ${i + 1}/${preparedPurchase.steps.length}: ${step.name}`);
    console.log(`      Type: ${step.type}`);
    console.log(`      Description: ${step.description}`);
    
    // Extract transaction data
    const { contractAddress, transactionData, value, gasEstimate } = step.transactionData;

    // Custom gas management - you can implement your own strategy here
    const customGasLimit = BigInt(gasEstimate.toString()) * 110n / 100n; // 10% buffer instead of 20%
    console.log(`      Custom gas limit: ${customGasLimit.toString()} (10% buffer)`);

    try {
      // Direct transaction execution using viem
      const txHash = await walletClient.sendTransaction({
        to: contractAddress as Address,
        data: transactionData as Hex,
        value: value ? BigInt(value.toString()) : 0n,
        gas: customGasLimit,
      });
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash,
      });
      
      
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
}

main()
  .then(() => {
    console.log('\n✨ Custom transaction execution completed!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    if (error.details) {
      console.error('Details:', error.details);
    }
    process.exit(1);
  });