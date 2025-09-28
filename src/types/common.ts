export type Address = string;

export type NetworkId = number;

export interface HttpRPCs {
  [networkId: NetworkId]: string;
}

export enum AppType {
  EDITION = 'edition',
  BURN_REDEEM = 'burn-redeem',
  BLIND_MINT = 'blind-mint',
}

// App IDs for different Manifold products
export enum AppId {
  BLIND_MINT_1155 = 2526777015,
  EDITION = 2522713783,
  BURN_REDEEM = 2520944311,
}

export type ProductStatus = 'active' | 'paused' | 'completed' | 'upcoming' | 'sold-out' | 'ended';

import type { Money } from './product';

// Cost type as per documentation (lines 1409-1416)
export interface Cost {
  total: Money;
  subtotal: Money;
  fees: Money;
}

// Note: Money is now defined in product.ts with full specification
export type { Money } from './product';
