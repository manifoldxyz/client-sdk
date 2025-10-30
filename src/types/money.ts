import type { BigNumber } from 'ethers';
import type { Money } from '../libs/money';

// Re-export Money class and utilities for type system
export { Money, isMoney } from '../libs/money';

/**
 * Internal Money data structure used by the Money class implementation
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

/**
 * Aggregated price information for a purchase, including native currency and ERC20 totals.
 * @params totalUSD - Total converted price in USD as a string
 * @params total - Total price broken down by native currency and ERC20 tokens
 * @params breakdown - Detailed breakdown of costs (product price, platform fees, etc.)
 */
export type Cost = {
  totalUSD: string;
  total: {
    native: Money;
    erc20s: Money[];
  };
  breakdown: {
    product: Money;
    platformFee: Money;
  };
};
