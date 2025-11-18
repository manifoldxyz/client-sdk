export enum ErrorCodes {
  INVALID_INPUT = 'INVALID_INPUT',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  UNSUPPORTED_CURRENCY = 'UNSUPPORTED_CURRENCY',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  MINT_FAILED = 'MINT_FAILED',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
  RELAY_QUOTE_FAILED = 'RELAY_QUOTE_FAILED',
  UNSUPPORTED_PRODUCT_TYPE = 'UNSUPPORTED_PRODUCT_TYPE',
  PRODUCT_NOT_ACTIVE = 'PRODUCT_NOT_ACTIVE',
}

export interface ErrorResponse {
  x402Version: number;
  error: string;
  errorCode?: ErrorCodes;
  accepts?: any[];
  details?: any;
}

export interface MintResponse {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  recipient?: string;
  product?: {
    id: string;
    name?: string;
    type?: string;
  };
  tokens?: Array<{
    tokenId: string;
    quantity: number;
    contractAddress: string;
    imageUrl?: string;
    explorerUrl?: string;
  }>;
  totalCost?: {
    usdc: string;
    formatted: string;
  };
  error?: string;
}
