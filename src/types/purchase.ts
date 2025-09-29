import type { Address, Cost, NetworkId, Money } from './common';

export interface PreparePurchaseParams<T> {
  address: Address;
  recipientAddress?: Address;
  networkId?: NetworkId;
  payload?: T;
  gasBuffer?: GasBuffer;
}

export interface GasBuffer {
  fixed?: bigint;
  multiplier?: number;
}

export interface EditionPayload {
  quantity: number;
  redemptionCode?: string;
}

export interface BurnRedeemPayload {
  tokens?: Array<{
    contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
    tokenId: string;
  }>;
}

export interface BlindMintPayload {
  quantity: number;
}

export interface PreparedPurchase {
  cost: Cost;
  transactionData: TransactionData;
  steps: TransactionStep[];
  gasEstimate: Money;
}

export interface TransactionData {
  contractAddress: string;
  transactionData: string;
  gasEstimate: bigint;
  networkId: number;
}



export interface TransactionStep {
  id: string;
  name: string;
  type: 'mint' | 'approve';
  execute?: (account: any) => Promise<TransactionReceipt>;
  description?: string;
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
  receipts: TransactionReceipt[];
  status: OrderStatus;
  buyer: { walletAddress: string };
  total: Cost;
  items?: OrderItem[];
}

export interface OrderItem {
  status: OrderStatus;
  total: Cost;
  token?: {
    contract: { networkId: number; address: string; spec: 'erc721' | 'erc1155' };
    tokenId: string;
    explorer: { etherscanUrl: string; manifoldUrl?: string; openseaUrl?: string };
  };
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed' | 'completed';

export interface TransactionReceipt {
  networkId: number;
  step: string;
  txHash: string;
  blockNumber?: number;
  gasUsed?: bigint;
  status?: string;
}
