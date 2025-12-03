// No imports needed - all types defined here
export type Address = string;

export interface HttpRPCs {
  [networkId: number]: string;
}

export enum AppType {
  EDITION = 'edition',
  BURN_REDEEM = 'burn-redeem',
  BLIND_MINT = 'blind-mint',
  MANI_DECK = 'mani-deck',
}

// App IDs for different Manifold products
export enum AppId {
  BLIND_MINT_1155 = 2526777015,
  EDITION = 2522713783,
  BURN_REDEEM = 2520944311,
  MANI_DECK = 2530840247,
}

export type ProductStatus = 'active' | 'paused' | 'upcoming' | 'sold-out' | 'ended';
