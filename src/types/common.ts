export type Address = `0x${string}`;

export type NetworkId = number;

export interface HttpRPCs {
  [networkId: NetworkId]: string;
}

export enum AppType {
  Edition = 'edition',
  BurnRedeem = 'burn-redeem',
  BlindMint = 'blind-mint',
}

export type ProductStatus = 'active' | 'paused' | 'completed' | 'upcoming';

import type { Money } from './product';

// Cost type as per documentation (lines 1409-1416)
export interface Cost {
  total: Money;
  subtotal: Money;
  fees: Money;
}

// Note: Money is now defined in product.ts with full specification
export type { Money } from './product';
