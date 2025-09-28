import type { BigNumber } from 'ethers';

/**
 * Money interface representing a token amount with metadata
 * This is the data structure for Money - the actual class implementation is in libs/money.ts
 */
export interface MoneyData {
  value: BigNumber;
  decimals: number;
  erc20: string;
  symbol: string;
  formatted: string;
  formattedUSD?: string;
  networkId: number;
}

// Re-export the Money class from libs for convenience
export { Money, isMoney } from '../libs/money';