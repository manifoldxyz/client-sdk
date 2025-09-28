#!/usr/bin/env node

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function generateWallet() {
  log('\n🔐 Generating New Wallet...', colors.bright);
  
  // Generate a random wallet
  const wallet = ethers.Wallet.createRandom();
  
  // Generate mnemonic phrase
  const mnemonic = wallet.mnemonic;
  
  log('\n✅ Wallet Generated Successfully!\n', colors.green);
  
  // Display wallet information
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  log('WALLET INFORMATION', colors.bright + colors.cyan);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  
  log(`\n📍 Address:`, colors.blue);
  log(`   ${wallet.address}`, colors.bright);
  
  log(`\n🔑 Private Key:`, colors.blue);
  log(`   ${wallet.privateKey}`, colors.bright);
  
  if (mnemonic) {
    log(`\n📝 Mnemonic Phrase (12 words):`, colors.blue);
    log(`   ${mnemonic.phrase}`, colors.bright);
    
    log(`\n🔢 Derivation Path:`, colors.blue);
    log(`   ${mnemonic.path}`, colors.bright);
  }
  
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.cyan);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: mnemonic?.phrase
  };
}

function saveToEnv(walletInfo: { address: string; privateKey: string; mnemonic?: string }) {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  // Create .env content
  const envContent = `# Generated Wallet Information
# Generated at: ${new Date().toISOString()}

# Wallet Address
WALLET_ADDRESS=${walletInfo.address}

# Private Key (Keep this secret!)
WALLET_PRIVATE_KEY=${walletInfo.privateKey}

# Mnemonic Phrase (Keep this secret!)
${walletInfo.mnemonic ? `WALLET_MNEMONIC="${walletInfo.mnemonic}"` : '# No mnemonic generated'}

# RPC Endpoints (Add your own)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
`;

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    log('\n⚠️  .env file already exists!', colors.yellow);
    
    // Read existing content
    const existingContent = fs.readFileSync(envPath, 'utf-8');
    
    // Create backup
    const backupPath = path.join(__dirname, `.env.backup.${Date.now()}`);
    fs.writeFileSync(backupPath, existingContent);
    log(`   Backup created: ${path.basename(backupPath)}`, colors.green);
    
    // Ask user if they want to override (in a script, we'll append instead)
    log('\n   Appending new wallet info to existing .env...', colors.blue);
    
    const appendContent = `

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# New Wallet Generated at: ${new Date().toISOString()}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# New Wallet Address
NEW_WALLET_ADDRESS=${walletInfo.address}

# New Private Key (Keep this secret!)
NEW_WALLET_PRIVATE_KEY=${walletInfo.privateKey}

# New Mnemonic Phrase (Keep this secret!)
${walletInfo.mnemonic ? `NEW_WALLET_MNEMONIC="${walletInfo.mnemonic}"` : '# No mnemonic generated'}
`;
    
    fs.appendFileSync(envPath, appendContent);
    log('   ✅ Wallet info appended to .env', colors.green);
  } else {
    // Create new .env file
    fs.writeFileSync(envPath, envContent);
    log('\n✅ Created .env file with wallet information', colors.green);
  }
  
  // Create or update .env.example if it doesn't exist
  if (!fs.existsSync(envExamplePath)) {
    const exampleContent = `# Example environment variables for Manifold Client SDK Playground

# Wallet Configuration
WALLET_ADDRESS=0x... # Your wallet address
WALLET_PRIVATE_KEY=0x... # Your private key (never commit this!)
WALLET_MNEMONIC="word1 word2 ..." # Optional: mnemonic phrase

# RPC Endpoints
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY  
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Optional: Manifold API Configuration
MANIFOLD_API_URL=https://api.manifold.xyz
STUDIO_APPS_URL=https://apps.api.manifoldxyz.dev
`;
    
    fs.writeFileSync(envExamplePath, exampleContent);
    log('   Created .env.example template', colors.green);
  }
}

function showUsageInstructions() {
  log('\n📚 HOW TO USE THIS WALLET:', colors.bright + colors.yellow);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow);
  
  log('\n1. Import in TypeScript/JavaScript:', colors.cyan);
  log(`   import { ethers } from 'ethers';
   const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY);`, colors.reset);
  
  log('\n2. Connect to a provider:', colors.cyan);
  log(`   const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_RPC_URL);
   const connectedWallet = wallet.connect(provider);`, colors.reset);
  
  log('\n3. Restore from mnemonic:', colors.cyan);
  log(`   const restoredWallet = ethers.Wallet.fromMnemonic(process.env.WALLET_MNEMONIC);`, colors.reset);
  
  log('\n4. Fund your wallet:', colors.cyan);
  log('   • For testnet (Sepolia): Use a faucet like https://sepoliafaucet.com', colors.reset);
  log('   • For mainnet: Transfer ETH from another wallet or exchange', colors.reset);
  
  log('\n⚠️  SECURITY WARNINGS:', colors.bright + colors.red);
  log('   • NEVER commit .env files to version control', colors.red);
  log('   • NEVER share your private key or mnemonic phrase', colors.red);
  log('   • Always use environment variables for sensitive data', colors.red);
  log('   • Consider using hardware wallets for production', colors.red);
  
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow);
}

// Main execution
function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);
  log('   MANIFOLD CLIENT SDK - WALLET GENERATOR', colors.bright + colors.cyan);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);
  
  try {
    // Generate wallet
    const walletInfo = generateWallet();
    
    // Save to .env file
    saveToEnv(walletInfo);
    
    // Show usage instructions
    showUsageInstructions();
    
    log('\n✨ Wallet generation complete!\n', colors.bright + colors.green);
    
  } catch (error) {
    log(`\n❌ Error generating wallet: ${error}`, colors.red);
    process.exit(1);
  }
}

// Run the script
main();