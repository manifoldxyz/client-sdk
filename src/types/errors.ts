/**
 * Error codes used throughout the Manifold SDK.
 *
 * Organized by category for easier troubleshooting:
 * - Network: Issues with blockchain network connectivity
 * - Resource: Problems finding or accessing resources
 * - Input: Validation failures for user input
 * - Transaction: Blockchain transaction issues
 * - Sale Status: Product availability problems
 * - API: External API communication errors
 *
 * @public
 */
export enum ErrorCode {
  // Network errors
  /** Network not supported by the SDK */
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  /** Connected to wrong network for this operation */
  WRONG_NETWORK = 'WRONG_NETWORK',
  /** General network connectivity issue */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** RPC URL not configured for required network */
  MISSING_RPC_URL = 'MISSING_RPC_URL',

  // Resource errors
  /** Product or resource not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Specific resource not found */
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Input errors
  /** Invalid input parameters */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Required tokens not provided for burn/redeem */
  MISSING_TOKENS = 'MISSING_TOKENS',
  /** Input validation failed */
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // Type errors
  /** Product type not supported */
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',

  // Transaction errors
  /** Gas estimation failed */
  ESTIMATION_FAILED = 'ESTIMATION_FAILED',
  /** Transaction failed to execute */
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  /** Transaction reverted on-chain */
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED',
  /** User rejected transaction */
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  /** Transaction replaced by another */
  TRANSACTION_REPLACED = 'TRANSACTION_REPLACED',
  /** Transaction still pending */
  TRANSACTION_PENDING = 'TRANSACTION_PENDING',
  /** Insufficient balance for transaction */
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  /** Gas estimation failed */
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  /** Gas price too low for network */
  GAS_PRICE_TOO_LOW = 'GAS_PRICE_TOO_LOW',
  /** Nonce mismatch error */
  NONCE_ERROR = 'NONCE_ERROR',
  /** Smart contract execution error */
  CONTRACT_ERROR = 'CONTRACT_ERROR',

  // Hardware wallet errors
  /** Ledger wallet specific error (often blind signing disabled) */
  LEDGER_ERROR = 'LEDGER_ERROR',
  /** General hardware wallet error */
  HARDWARE_WALLET_ERROR = 'HARDWARE_WALLET_ERROR',

  // Sale status errors
  /** Wallet not eligible to purchase */
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  /** Product sold out */
  SOLD_OUT = 'SOLD_OUT',
  /** Wallet purchase limit reached */
  LIMIT_REACHED = 'LIMIT_REACHED',
  /** Sale has ended */
  ENDED = 'ENDED',
  /** Sale hasn't started yet */
  NOT_STARTED = 'NOT_STARTED',

  // API errors
  /** External API error */
  API_ERROR = 'API_ERROR',
  /** API rate limit exceeded */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Invalid API response format */
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  /** Request timeout */
  TIMEOUT = 'TIMEOUT',

  // Implementation status
  /** Product type not yet implemented */
  UNSUPPORTED_PRODUCT_TYPE = 'PRODUCT_TYPE_NOT_SUPPORTED',

  // Generic
  /** Unknown error occurred */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Main error class for the Manifold SDK.
 *
 * Extends the standard Error class with typed error codes and
 * additional details for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   const product = await client.getProduct('invalid-id');
 * } catch (error) {
 *   if (error instanceof ClientSDKError) {
 *     console.log('Error code:', error.code);
 *     console.log('Message:', error.message);
 *     console.log('Details:', error.details);
 *
 *     // Handle specific error types
 *     switch (error.code) {
 *       case ErrorCode.NOT_FOUND:
 *         console.log('Product not found');
 *         break;
 *       case ErrorCode.INSUFFICIENT_FUNDS:
 *         console.log('Not enough balance');
 *         break;
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export class ClientSDKError extends Error {
  /**
   * Creates a new ClientSDKError.
   *
   * @param code - Error code from the ErrorCode enum
   * @param message - Human-readable error message
   * @param details - Optional additional error details (metadata, original error, etc.)
   */
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ClientSDKError';
  }
}
