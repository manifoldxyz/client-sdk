import type { Address } from './common';
import type { Cost, Money } from './money';
import type { IAccount } from './account-adapter';

export interface PreparePurchaseParams<T> {
  address: Address;
  account?: IAccount;
  recipientAddress?: Address;
  networkId?: number;
  payload: T;
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

/**
 * Prepared purchase data returned from preparePurchase().
 *
 * Contains all information needed to execute a purchase, including
 * transaction steps that can be executed individually for better UX.
 *
 * @public
 */
export interface PreparedPurchase {
  /** Total cost breakdown including fees */
  cost: Cost;

  /** Raw transaction data (optional for adapter-based flows) */
  transactionData?: TransactionData;

  /**
   * Individual transaction steps that need to be executed.
   *
   * @remarks
   * Steps allow for granular control over multi-transaction purchases.
   * Common patterns include:
   * - ERC20 approval followed by mint
   * - Multiple burn transactions followed by redeem
   *
   * Each step can be executed individually, allowing users to:
   * - See explicit approval requests
   * - Understand what each transaction does
   * - Cancel between steps if needed
   * - Retry failed steps
   *
   * @example
   * ```typescript
   * // Execute steps manually for better UX
   * for (const step of preparedPurchase.steps) {
   *   console.log(`Executing: ${step.name}`);
   *   const receipt = await step.execute(adapter);
   *   console.log(`✓ ${step.name} complete: ${receipt.txHash}`);
   * }
   * ```
   */
  steps: TransactionStep[];

  /** Estimated gas cost (optional) */
  gasEstimate?: Money;

  /** Whether the wallet is eligible to purchase */
  isEligible: boolean;
}

export interface TransactionData {
  contractAddress: string;
  transactionData: string;
  gasEstimate: bigint;
  networkId: number;
}

export type TransactionStepType = 'mint' | 'approve';

export type TransactionStepExecuteOptions = {
  confirmations?: number;
  callbacks?: TransactionOnProgress;
};

/**
 * Individual transaction step within a purchase flow.
 *
 * Represents a single blockchain transaction that needs to be executed.
 * Steps enable explicit user control over multi-transaction operations,
 * following Web3 best practices for transparency and user consent.
 *
 * @remarks
 * Common step types:
 * - `approve`: ERC20 token approval for payment
 * - `mint`: Actual NFT minting transaction
 *
 * Steps should be executed in order, as later steps may depend on earlier ones.
 *
 * @example
 * ```typescript
 * // Manual step execution with user confirmation
 * const step = preparedPurchase.steps[0];
 *
 * if (step.type === 'approve') {
 *   const confirmed = await showApprovalModal({
 *     token: step.cost?.erc20s?.[0],
 *     spender: contractAddress
 *   });
 *
 *   if (confirmed) {
 *     const receipt = await step.execute(adapter);
 *     console.log('Approval TX:', receipt.txHash);
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TransactionStep {
  /** Unique identifier for this step */
  id: string;

  /** Human-readable step name (e.g., "Approve USDC", "Mint NFT") */
  name: string;

  /** Type of transaction */
  type: TransactionStepType;

  /**
   * Executes this transaction step.
   *
   * @param adapter - Wallet adapter for signing
   * @param options - Execution options (confirmations, callbacks)
   * @returns Transaction receipt upon completion
   *
   * @throws {ClientSDKError} On transaction failure or rejection
   */
  execute: (
    adapter: IAccount,
    options?: TransactionStepExecuteOptions,
  ) => Promise<TransactionReceipt>;

  /** Optional detailed description of what this step does */
  description?: string;

  /** Cost breakdown for this specific step */
  cost?: {
    /** Native token cost (ETH, etc.) */
    native?: Money;
    /** ERC20 token costs */
    erc20s?: Money[];
  };
}

export interface TransactionOnProgress {
  status: 'pending' | 'confirmed' | 'failed';
  steps: TransactionStep[];
  currentStep?: TransactionStep;
  receipt?: TransactionReceipt[];
}

export interface PurchaseParams {
  account: IAccount;
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
