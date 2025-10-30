import 'dotenv/config';
import { createClient, createAccountEthers5, isBlindMintProduct } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const instanceId = getEnv('INSTANCE_ID');
  const rpcUrl = getEnv('RPC_URL');
  const networkId = Number(getEnv('NETWORK_ID'));
  if (!Number.isInteger(networkId)) {
    throw new Error('NETWORK_ID must be a valid integer chain id (e.g. 8453 for Base).');
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
  if (!isBlindMintProduct(product)) {
    throw new Error(`Product ${instanceId} is not a Blind Mint product.`);
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const account = createAccountEthers5(client, { wallet });
  const minterAddress = await wallet.getAddress();
  console.log(`👤 Using wallet ${minterAddress}`);

  console.log('🧪 Preparing purchase...');
  const preparedPurchase = await product.preparePurchase({
    address: minterAddress,
    payload: { quantity },
  });

  console.log(`✅ Prepared. Total cost: ${preparedPurchase.cost.total.formatted}`);

  console.log('🚀 Executing purchase...');
  const order = await product.purchase({
    account,
    preparedPurchase,
  });

  console.log(`🎉 Purchase status: ${order.status}`);
  order.receipts.forEach((receipt, index) => {
    console.log(`   Step ${index + 1} txHash: ${receipt.txHash} (network ${receipt.networkId})`);
  });
}

main().catch((error) => {
  console.error('❌ Minting failed:', error);
  process.exit(1);
});
