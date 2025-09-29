import type { BigNumber } from 'ethers';
import type { Money } from '../libs/money';

/**
 * Internal Money data structure used by the Money class implementation
 * This interface is used by the Money class in libs/money.ts for backward compatibility
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

export interface Cost {
  total: {
    native: Money;
    erc20s: Money[];
  };
  breakdown: {
    product: Money;
    platformFee: Money;
  };
}
