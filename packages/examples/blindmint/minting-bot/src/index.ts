import 'dotenv/config';
import { createClient, createAccountEthers5, isBlindMintProduct, createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

function getEnv(name: string, required = true): string | undefined {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const instanceId = getEnv('INSTANCE_ID', false) || '4149776624';
  const rpcUrl = getEnv('RPC_URL')!;
  const networkId = Number(getEnv('NETWORK_ID', false) || '11155111');
  if (!Number.isInteger(networkId)) {
    throw new Error('NETWORK_ID must be a valid integer chain id (e.g. 8453 for Base).');
  }

  const rawPrivateKey = getEnv('WALLET_PRIVATE_KEY')!.trim();
  const privateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;

  const quantityRaw = process.env.MINT_QUANTITY ?? '1';
  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('MINT_QUANTITY must be a positive integer.');
  }

  console.log(`🔄 Initializing client for network ${networkId}...`);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const publicProvider = createPublicProviderEthers5({ [networkId]: provider });
  const client = createClient({
    publicProvider,
  });

  console.log(`📦 Fetching product ${instanceId}...`);
  const product = await client.getProduct(instanceId);
  if (!isBlindMintProduct(product)) {
    throw new Error(`Product ${instanceId} is not a Blind Mint product.`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const account = createAccountEthers5({ wallet });
  const minterAddress = await wallet.getAddress();
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
    console.log(`USD cost: $${preparedPurchase.cost.totalUSD}`);
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
      console.log(`   Item ${index + 1}: token ${item.token.tokenId} x${item.quantity}`);
    });
  }
}

main().catch((error) => {
  console.error('❌ Minting failed:', error);
  process.exit(1);
});
