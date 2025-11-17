// Test script for USDC conversion logic
import { convertCostToUSDC } from './src/utils/payment.js';

async function testConversion() {
  console.log('Testing USDC conversion for testnets...\n');
  
  // Test cases for testnet conversion (1 USDC = 0.0005 ETH)
  const testCases = [
    { ethAmount: '0.001', expectedUSDC: '2' },     // 0.001 ETH = 2 USDC
    { ethAmount: '0.0005', expectedUSDC: '1' },    // 0.0005 ETH = 1 USDC
    { ethAmount: '0.01', expectedUSDC: '20' },     // 0.01 ETH = 20 USDC
    { ethAmount: '1', expectedUSDC: '2000' },      // 1 ETH = 2000 USDC
  ];
  
  for (const testCase of testCases) {
    const ethWei = BigInt(Math.floor(parseFloat(testCase.ethAmount) * 1e18));
    
    try {
      const result = await convertCostToUSDC(
        ethWei,
        [],  // No ERC20 costs
        84532,  // Base Sepolia (product chain)
        84532,  // Base Sepolia (payment network - testnet)
        '0x1234567890123456789012345678901234567890'  // Mock admin address
      );
      
      const resultUSDC = Number(result) / 1e6;
      const expectedWithBuffer = parseFloat(testCase.expectedUSDC) * 1.05; // 5% buffer
      
      console.log(`${testCase.ethAmount} ETH -> ${resultUSDC.toFixed(2)} USDC (expected: ${expectedWithBuffer.toFixed(2)} USDC with 5% buffer)`);
      console.log(`  Raw result: ${result} (in 6 decimals)`);
      
      // Check if result is within expected range
      const tolerance = 0.01;
      if (Math.abs(resultUSDC - expectedWithBuffer) < tolerance) {
        console.log('  ✅ PASS\n');
      } else {
        console.log(`  ❌ FAIL - Expected ${expectedWithBuffer}, got ${resultUSDC}\n`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
    }
  }
}

// Run the test
testConversion().catch(console.error);