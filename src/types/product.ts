import type { Address, AppType, NetworkId, ProductStatus } from './common';
import type { PreparedPurchase, PurchaseParams, PreparePurchaseParams, Order } from './purchase';

export interface BaseProduct {
  id: string;
  type: AppType;
  name: string;
  description?: string;
  networkId: NetworkId;
  contractAddress: Address;
  creatorAddress: Address;

  getStatus(): Promise<ProductStatus>;
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
}

export interface EditionProduct extends BaseProduct {
  type: AppType.Edition;
  totalSupply?: number;
  maxPerWallet?: number;
  price: bigint;
  startTime?: Date;
  endTime?: Date;
}

export interface BurnRedeemProduct extends BaseProduct {
  type: AppType.BurnRedeem;
  burnTokens: BurnToken[];
  redeemTokens: RedeemToken[];
}

export interface BlindMintProduct extends BaseProduct {
  type: AppType.BlindMint;
  revealTime?: Date;
  maxSupply?: number;
}

export type Product = EditionProduct | BurnRedeemProduct | BlindMintProduct;

export interface AllocationParams {
  recipientAddress: Address;
}

export interface AllocationResponse {
  isEligible: boolean;
  reason?: string;
  quantity: number;
}

export interface BurnToken {
  contractAddress: Address;
  tokenId: string;
  quantity: number;
}

export interface RedeemToken {
  contractAddress: Address;
  tokenId: string;
  quantity: number;
}
