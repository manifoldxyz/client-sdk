export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  INVALID_INPUT = 'INVALID_INPUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  API_ERROR = 'API_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
}

export class ClientSDKError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ClientSDKError';
  }
}
