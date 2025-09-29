import { ErrorCode, ClientSDKError } from './errors';

// =============================================================================
// BLINDMINT-SPECIFIC ERROR TYPES
// =============================================================================

/**
 * Extended error codes for BlindMint functionality
 */
export enum BlindMintErrorCode {
  // Mint state errors
  MINT_NOT_ACTIVE = 'MINT_NOT_ACTIVE',
  MINT_ENDED = 'MINT_ENDED',
  MINT_NOT_STARTED = 'MINT_NOT_STARTED',
  SOLD_OUT = 'SOLD_OUT',
  EXCEEDS_WALLET_LIMIT = 'EXCEEDS_WALLET_LIMIT',
  EXCEEDS_TOTAL_SUPPLY = 'EXCEEDS_TOTAL_SUPPLY',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  INVALID_WALLET_ADDRESS = 'INVALID_WALLET_ADDRESS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // Allowlist errors
  INVALID_MERKLE_PROOF = 'INVALID_MERKLE_PROOF',
  INVALID_REDEMPTION_CODE = 'INVALID_REDEMPTION_CODE',
  NOT_ON_ALLOWLIST = 'NOT_ON_ALLOWLIST',
  
  // Payment errors
  INSUFFICIENT_ALLOWANCE = 'INSUFFICIENT_ALLOWANCE',
  INVALID_PAYMENT_TOKEN = 'INVALID_PAYMENT_TOKEN',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Contract interaction errors
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  TRANSACTION_REPLACED = 'TRANSACTION_REPLACED',
  TRANSACTION_CANCELLED = 'TRANSACTION_CANCELLED',
  
  // API errors
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  INVALID_API_RESPONSE = 'INVALID_API_RESPONSE',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  TYPE_MISMATCH = 'TYPE_MISMATCH',
  
  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_PROVIDER = 'MISSING_PROVIDER',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
}

/**
 * BlindMint-specific error class with enhanced context
 */
export class BlindMintError extends ClientSDKError {
  constructor(
    code: ErrorCode | BlindMintErrorCode,
    message: string,
    public context?: BlindMintErrorContext,
    details?: unknown,
  ) {
    super(code as ErrorCode, message, details);
    this.name = 'BlindMintError';
  }
}

export interface BlindMintErrorContext {
  /** Product instance ID */
  instanceId?: string;
  /** Wallet address involved */
  walletAddress?: string;
  /** Quantity attempted */
  quantity?: number;
  /** Current mint status */
  mintStatus?: string;
  /** Network ID */
  networkId?: number;
  /** Expected network ID */
  expectedNetworkId?: number;
  /** Actual network ID */
  actualNetworkId?: number;
  /** Transaction hash if applicable */
  txHash?: string;
  /** Block number when error occurred */
  blockNumber?: number;
  /** Transaction step that failed */
  step?: string;
  /** Original error if wrapped */
  originalError?: Error;
  /** Token address for payment issues */
  tokenAddress?: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Validation error with field-specific information
 */
export class ValidationError extends ClientSDKError {
  constructor(
    message: string,
    public validationErrors: FieldValidationError[],
    details?: unknown,
  ) {
    super(ErrorCode.VALIDATION_FAILED, message, details);
    this.name = 'ValidationError';
  }
}

export interface FieldValidationError {
  /** Field name that failed validation */
  field: string;
  /** Validation rule that failed */
  rule: string;
  /** Expected value or format */
  expected: string;
  /** Actual value provided */
  actual: unknown;
  /** Error message for this field */
  message: string;
}

/**
 * Contract interaction error with transaction context
 */
export class ContractInteractionError extends ClientSDKError {
  constructor(
    code: ErrorCode | BlindMintErrorCode,
    message: string,
    public contractContext: ContractErrorContext,
    details?: unknown,
  ) {
    super(code as ErrorCode, message, details);
    this.name = 'ContractInteractionError';
  }
}

export interface ContractErrorContext {
  /** Contract address */
  contractAddress: string;
  /** Method that failed */
  method: string;
  /** Method parameters */
  params: unknown[];
  /** Gas estimate if available */
  gasEstimate?: bigint;
  /** Gas used if transaction mined */
  gasUsed?: bigint;
  /** Provider used (wallet or bridge) */
  provider: 'wallet' | 'bridge';
  /** Network ID */
  networkId: number;
  /** Original ethers error */
  originalError?: Error;
}

/**
 * Network-related error
 */
export class NetworkError extends ClientSDKError {
  constructor(
    message: string,
    public networkContext: NetworkErrorContext,
    details?: unknown,
  ) {
    super(ErrorCode.NETWORK_ERROR, message, details);
    this.name = 'NetworkError';
  }
}

export interface NetworkErrorContext {
  /** Current network ID */
  currentNetworkId?: number;
  /** Expected network ID */
  expectedNetworkId: number;
  /** Provider availability */
  providerAvailable: boolean;
  /** RPC endpoint status */
  rpcStatus?: 'available' | 'unavailable' | 'timeout';
  /** Error type */
  type: 'wrong-network' | 'unavailable' | 'timeout' | 'rpc-error';
}

/**
 * API error with request context
 */
export class ApiError extends ClientSDKError {
  constructor(
    message: string,
    public apiContext: ApiErrorContext,
    details?: unknown,
  ) {
    super(ErrorCode.API_ERROR, message, details);
    this.name = 'ApiError';
  }
}

export interface ApiErrorContext {
  /** HTTP status code */
  status: number;
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Rate limit information if applicable */
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
  /** Response headers */
  headers?: Record<string, string>;
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for handling strategies
 */
export enum ErrorCategory {
  USER_ERROR = 'user-error',          // User input or action required
  SYSTEM_ERROR = 'system-error',      // Internal system issue
  NETWORK_ERROR = 'network-error',    // Network connectivity issue
  CONTRACT_ERROR = 'contract-error',  // Smart contract interaction issue
  VALIDATION_ERROR = 'validation-error', // Data validation issue
  CONFIGURATION_ERROR = 'configuration-error', // SDK configuration issue
}

/**
 * Enhanced error metadata for better error handling
 */
export interface ErrorMetadata {
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested user actions */
  userActions?: string[];
  /** Suggested developer actions */
  developerActions?: string[];
  /** Related documentation links */
  documentationLinks?: string[];
  /** Whether error should be reported to monitoring */
  reportable: boolean;
  /** Estimated time to resolution */
  estimatedResolutionTime?: number; // minutes
}

/**
 * Error classification mapping for BlindMint errors
 */
export const BLINDMINT_ERROR_CLASSIFICATIONS: Record<BlindMintErrorCode, ErrorMetadata> = {
  // Mint state errors
  [BlindMintErrorCode.MINT_NOT_ACTIVE]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Wait for mint to become active', 'Check mint schedule'],
    reportable: false,
  },
  [BlindMintErrorCode.MINT_ENDED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Look for secondary market options'],
    reportable: false,
  },
  [BlindMintErrorCode.MINT_NOT_STARTED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Wait for mint to start'],
    reportable: false,
  },
  [BlindMintErrorCode.SOLD_OUT]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Look for secondary market options'],
    reportable: false,
  },
  [BlindMintErrorCode.EXCEEDS_WALLET_LIMIT]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Reduce quantity to wallet limit'],
    reportable: false,
  },
  [BlindMintErrorCode.EXCEEDS_TOTAL_SUPPLY]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Reduce quantity to available supply'],
    reportable: false,
  },
  [BlindMintErrorCode.INVALID_QUANTITY]: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Enter valid quantity (positive number)'],
    reportable: false,
  },
  [BlindMintErrorCode.NOT_ELIGIBLE]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Check eligibility requirements'],
    reportable: false,
  },
  [BlindMintErrorCode.INVALID_WALLET_ADDRESS]: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION_ERROR,
    recoverable: true,
    userActions: ['Enter valid wallet address'],
    reportable: false,
  },
  [BlindMintErrorCode.TRANSACTION_FAILED]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONTRACT_ERROR,
    recoverable: true,
    userActions: ['Try again', 'Check wallet connection'],
    reportable: true,
  },
  
  // Allowlist errors
  [BlindMintErrorCode.INVALID_MERKLE_PROOF]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Check allowlist eligibility'],
    reportable: false,
  },
  [BlindMintErrorCode.INVALID_REDEMPTION_CODE]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Check redemption code'],
    reportable: false,
  },
  [BlindMintErrorCode.NOT_ON_ALLOWLIST]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: false,
    userActions: ['Check allowlist eligibility'],
    reportable: false,
  },
  
  // Payment errors
  [BlindMintErrorCode.INSUFFICIENT_ALLOWANCE]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Approve token spending'],
    reportable: false,
  },
  [BlindMintErrorCode.INVALID_PAYMENT_TOKEN]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.CONFIGURATION_ERROR,
    recoverable: false,
    reportable: true,
  },
  [BlindMintErrorCode.PAYMENT_FAILED]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONTRACT_ERROR,
    recoverable: false,
    reportable: true,
  },
  
  // Contract interaction errors
  [BlindMintErrorCode.CONTRACT_ERROR]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONTRACT_ERROR,
    recoverable: false,
    developerActions: ['Review contract interaction', 'Check contract state'],
    reportable: true,
  },
  [BlindMintErrorCode.GAS_ESTIMATION_FAILED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK_ERROR,
    recoverable: true,
    reportable: true,
  },
  [BlindMintErrorCode.WRONG_NETWORK]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Switch to correct network'],
    reportable: false,
  },
  [BlindMintErrorCode.NETWORK_MISMATCH]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    userActions: ['Switch wallet to correct network'],
    reportable: false,
  },
  [BlindMintErrorCode.PROVIDER_UNAVAILABLE]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM_ERROR,
    recoverable: true,
    userActions: ['Check wallet connection', 'Refresh page'],
    reportable: true,
  },
  [BlindMintErrorCode.TRANSACTION_REPLACED]: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.CONTRACT_ERROR,
    recoverable: false,
    reportable: false,
  },
  [BlindMintErrorCode.TRANSACTION_CANCELLED]: {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_ERROR,
    recoverable: true,
    reportable: false,
  },
  
  // API errors
  [BlindMintErrorCode.API_ERROR]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM_ERROR,
    recoverable: true,
    reportable: true,
  },
  [BlindMintErrorCode.RATE_LIMITED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM_ERROR,
    recoverable: true,
    userActions: ['Wait before retrying'],
    reportable: false,
  },
  [BlindMintErrorCode.API_UNAVAILABLE]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM_ERROR,
    recoverable: true,
    userActions: ['Try again later'],
    developerActions: ['Check API status', 'Implement fallback'],
    reportable: true,
    estimatedResolutionTime: 15,
  },
  [BlindMintErrorCode.INVALID_API_RESPONSE]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.SYSTEM_ERROR,
    recoverable: false,
    reportable: true,
  },
  
  // Validation errors
  [BlindMintErrorCode.VALIDATION_FAILED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.VALIDATION_ERROR,
    recoverable: true,
    userActions: ['Review input data', 'Check required fields'],
    reportable: false,
  },
  [BlindMintErrorCode.SCHEMA_VALIDATION_FAILED]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.VALIDATION_ERROR,
    recoverable: false,
    reportable: true,
  },
  [BlindMintErrorCode.TYPE_MISMATCH]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.VALIDATION_ERROR,
    recoverable: false,
    reportable: true,
  },
  
  // Configuration errors
  [BlindMintErrorCode.INVALID_CONFIGURATION]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONFIGURATION_ERROR,
    recoverable: false,
    developerActions: ['Review SDK configuration'],
    reportable: true,
  },
  [BlindMintErrorCode.MISSING_PROVIDER]: {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.CONFIGURATION_ERROR,
    recoverable: false,
    userActions: ['Install and connect wallet'],
    reportable: false,
  },
  [BlindMintErrorCode.UNSUPPORTED_NETWORK]: {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.CONFIGURATION_ERROR,
    recoverable: false,
    userActions: ['Switch to supported network'],
    reportable: false,
  },
};

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  if (error instanceof BlindMintError) {
    const errorCode = error.code as BlindMintErrorCode;
    return BLINDMINT_ERROR_CLASSIFICATIONS[errorCode]?.recoverable ?? false;
  }
  return false;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof BlindMintError) {
    const errorCode = error.code as BlindMintErrorCode;
    const classification = BLINDMINT_ERROR_CLASSIFICATIONS[errorCode];
    
    if (classification?.userActions?.length) {
      return `${error.message}. Try: ${classification.userActions.join(', ')}.`;
    }
  }
  
  return error.message;
}

/**
 * Get suggested actions for an error
 */
export function getSuggestedActions(error: Error): string[] {
  if (error instanceof BlindMintError) {
    const errorCode = error.code as BlindMintErrorCode;
    const classification = BLINDMINT_ERROR_CLASSIFICATIONS[errorCode];
    return classification?.userActions ?? [];
  }
  
  return [];
}

/**
 * Check if error should be reported
 */
export function shouldReportError(error: Error): boolean {
  if (error instanceof BlindMintError) {
    const errorCode = error.code as BlindMintErrorCode;
    return BLINDMINT_ERROR_CLASSIFICATIONS[errorCode]?.reportable ?? true;
  }
  
  return true; // Report unknown errors by default
}