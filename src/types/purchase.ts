import type { Address, Cost, NetworkId } from './common';
import type { Money } from './product';

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
  code?: string;
}

export interface BurnRedeemPayload {
  burnTokenIds: string[];
}

export interface BlindMintPayload {
  quantity: number;
}

export interface PreparedPurchase {
  cost: EnhancedCost;
  steps: TransactionStep[];
  isEligible: boolean;
  reason?: string;
}

export interface EnhancedCost {
  // Total tokens the user needs to have
  total: {
    native?: Money; // Native tokens needed (if any)
    erc20s: Money[]; // Array of ERC20 tokens needed (can be multiple different tokens)
  };

  // Breakdown by purpose (for transparency)
  breakdown: {
    product: Money; // Product cost (could be native or ERC20)
    platformFee: Money; // Platform fee (could be native or ERC20)
  };
}

export interface TransactionStep {
  id: string;
  name: string;
  type: 'mint' | 'approval' | 'burn' | 'transfer';

  // What tokens are consumed by this step
  cost?: {
    native?: Money; // Native tokens consumed
    erc20s?: Money[]; // Array of ERC20 tokens consumed
  };

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
  id?: string;
  status: OrderStatus;
  receipts: TransactionReceipt[];
  createdAt?: Date;
  completedAt?: Date;
  buyer?: { walletAddress: string };
  total?: any;
  items?: any[];
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'confirmed';

export interface TransactionReceipt {
  txHash: string;
  blockNumber: number;
  gasUsed: bigint;
  status: 'success' | 'failed';
}
