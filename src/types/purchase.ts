import type { Address, NetworkId } from './common';
import type { Cost, Money } from './money';
import type { IAccountAdapter } from './account-adapter';

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
  transactionData?: TransactionData; // Optional for adapter-based flows
  steps: TransactionStep[];
  gasEstimate?: Money; // Optional for adapter-based flows
  isEligible: boolean;
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
  execute: (adapter: IAccountAdapter) => Promise<TransactionReceipt>;
  description?: string;
  cost?: { native?: Money; erc20s?: Money[] };
}

export interface PurchaseParams {
  accountAdapter: IAccountAdapter;
  preparedPurchase: PreparedPurchase;
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
