import type { Address, Cost, NetworkId } from './common';

export interface PreparePurchaseParams {
  address: Address;
  recipientAddress?: Address;
  networkId?: NetworkId;
  payload?: EditionPayload | BurnRedeemPayload | BlindMintPayload;
  gasBuffer?: GasBuffer;
}

export interface GasBuffer {
  fixed?: bigint;
  multiplier?: number;
}

export interface EditionPayload {
  quantity: number;
  code?: string;
}

export interface BurnRedeemPayload {
  burnTokenIds: string[];
}

export interface BlindMintPayload {
  quantity: number;
}

export interface PreparedPurchase {
  cost: Cost;
  steps: TransactionStep[];
  isEligible: boolean;
  reason?: string;
}

export interface TransactionStep {
  type: 'approve' | 'mint' | 'burn' | 'bridge';
  description: string;
  estimatedGas: bigint;
  execute(): Promise<TransactionReceipt>;
}

export interface PurchaseParams {
  account: WalletAccount;
  preparedPurchase: PreparedPurchase;
}

export interface WalletAccount {
  address: Address;
  // Add other account properties as needed
}

export interface Order {
  id: string;
  status: OrderStatus;
  receipts: TransactionReceipt[];
  createdAt: Date;
  completedAt?: Date;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TransactionReceipt {
  txHash: string;
  blockNumber: number;
  gasUsed: bigint;
  status: 'success' | 'failed';
}
