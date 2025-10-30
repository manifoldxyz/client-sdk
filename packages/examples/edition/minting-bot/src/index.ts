import 'dotenv/config';
import { createClient, createAccountViem, isEditionProduct } from '@manifoldxyz/client-sdk';
import { createWalletClient, custom, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
 

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const instanceId = getEnv('INSTANCE_ID') || '4133757168';
  const rpcUrl = getEnv('RPC_URL');
  const networkId = Number(getEnv('NETWORK_ID'));
  if (!Number.isInteger(networkId)) {
    throw new Error('NETWORK_ID must be a valid integer chain id (e.g. 1 for mainnet).');
  }

  const rawPrivateKey = getEnv('WALLET_PRIVATE_KEY').trim();
  const privateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;

  const quantityRaw = process.env.MINT_QUANTITY ?? '1';
  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('MINT_QUANTITY must be a positive integer.');
  }

  console.log(`🔄 Initializing client for network ${networkId}...`);
  const client = createClient({
    httpRPCs: {
      [networkId]: rpcUrl,
    },
  });

  console.log(`📦 Fetching product ${instanceId}...`);
  const product = await client.getProduct(instanceId);
  if (!isEditionProduct(product)) {
    throw new Error(`Product ${instanceId} is not an Edition product.`);
  }

  const wallet = privateKeyToAccount(privateKey as `0x${string}`); 
  const walletClient = createWalletClient({
    account: wallet, 
    chain: sepolia,
    transport: http(rpcUrl),
  })
  const account = createAccountViem({walletClient});

  const minterAddress = await account.getAddress();
  console.log(`👤 Using wallet ${minterAddress}`);

  console.log('🧪 Preparing purchase...');
  const preparedPurchase = await product.preparePurchase({
    userAddress: minterAddress,
    payload: { quantity },  
    account,
  });

  const nativeCost = preparedPurchase.cost.total.native;
  const erc20Costs = preparedPurchase.cost.total.erc20s;

  if (nativeCost.isPositive()) {
    console.log(`✅ Prepared. Native cost: ${nativeCost.formatted}`);
  } else {
    console.log('✅ Prepared. No native token cost.');
  }
  if (erc20Costs.length > 0) {
    erc20Costs.forEach((cost) => {
      console.log(`   ERC20 cost: ${cost.formatted} ${cost.symbol}`);
    });
  }

  console.log('🚀 Executing purchase...');
  const purchaseReceipt = await product.purchase({
    account,
    preparedPurchase,
  });

  console.log(`🎉 Mint transaction hash: ${purchaseReceipt.transactionReceipt.txHash}`);
  if (purchaseReceipt.order) {
    purchaseReceipt.order.items.forEach((item, index) => {
      console.log(`   Item ${index + 1}: token ${item.token.tokenId} x${item.quantity} imageMedia URL: ${item.token.media.imagePreview}`);
    });
  }
}

main().catch((error) => {
  console.error('❌ Minting failed:', error);
  process.exit(1);
});
