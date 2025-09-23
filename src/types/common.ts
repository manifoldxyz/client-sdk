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

export interface Money {
  value: bigint;
  formatted: string;
  currency: string;
}

export interface Cost {
  total: Money;
  fee: Money;
  price: Money;
  gas: Money;
}
