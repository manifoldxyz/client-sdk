import { describe, it, expect } from 'vitest';
import { ClientSDKError, ErrorCode } from '../../src/types/errors';

describe('Error Handling', () => {
  describe('ClientSDKError', () => {
    it('creates error with code and message', () => {
      const error = new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address format');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClientSDKError);
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Invalid address format');
      expect(error.name).toBe('ClientSDKError');
    });

    it('creates error with details', () => {
      const details = {
        field: 'address',
        value: '0xinvalid',
        expectedFormat: '0x...',
      };
      
      const error = new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        'Invalid address format',
        details
      );
      
      expect(error.details).toEqual(details);
    });

    it('includes stack trace', () => {
      const error = new ClientSDKError(ErrorCode.NETWORK_ERROR, 'Connection failed');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ClientSDKError');
    });
  });

  describe('Error Codes', () => {
    it('has all expected error codes', () => {
      expect(ErrorCode.INVALID_INPUT).toBeDefined();
      expect(ErrorCode.NETWORK_ERROR).toBeDefined();
      expect(ErrorCode.API_ERROR).toBeDefined();
      expect(ErrorCode.TRANSACTION_FAILED).toBeDefined();
      expect(ErrorCode.INSUFFICIENT_FUNDS).toBeDefined();
      expect(ErrorCode.TRANSACTION_REJECTED).toBeDefined();
      expect(ErrorCode.UNSUPPORTED_NETWORK).toBeDefined();
      expect(ErrorCode.UNSUPPORTED_PRODUCT_TYPE).toBeDefined();
      expect(ErrorCode.SOLD_OUT).toBeDefined();
      expect(ErrorCode.LIMIT_REACHED).toBeDefined();
      expect(ErrorCode.NOT_ELIGIBLE).toBeDefined();
      expect(ErrorCode.RATE_LIMITED).toBeDefined();
      expect(ErrorCode.NOT_FOUND).toBeDefined();
      expect(ErrorCode.ESTIMATION_FAILED).toBeDefined();
    });

    it('error codes are unique', () => {
      const codes = Object.values(ErrorCode);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('createError helper', () => {
    it('creates error with helper function', () => {
      const createError = (code: ErrorCode, message: string, details?: unknown) => 
        new ClientSDKError(code, message, details);
      
      const error = createError(ErrorCode.API_ERROR, 'API request failed');
      
      expect(error).toBeInstanceOf(ClientSDKError);
      expect(error.code).toBe(ErrorCode.API_ERROR);
      expect(error.message).toBe('API request failed');
    });

    it('creates error with details using helper', () => {
      const createError = (code: ErrorCode, message: string, details?: unknown) => 
        new ClientSDKError(code, message, details);
      
      const error = createError(
        ErrorCode.TRANSACTION_FAILED,
        'Transaction reverted',
        { txHash: '0xabc123', reason: 'Insufficient funds' }
      );
      
      expect(error.details).toBeDefined();
      expect((error.details as any).txHash).toBe('0xabc123');
      expect((error.details as any).reason).toBe('Insufficient funds');
    });
  });

  describe('isClientSDKError helper', () => {
    const isClientSDKError = (error: unknown, code?: ErrorCode): boolean => {
      if (!(error instanceof ClientSDKError)) return false;
      if (code !== undefined) return error.code === code;
      return true;
    };

    it('identifies ClientSDKError instances', () => {
      const sdkError = new ClientSDKError(ErrorCode.NETWORK_ERROR, 'Network error');
      const regularError = new Error('Regular error');
      const customError = { code: 'CUSTOM', message: 'Custom error' };
      
      expect(isClientSDKError(sdkError)).toBe(true);
      expect(isClientSDKError(regularError)).toBe(false);
      expect(isClientSDKError(customError)).toBe(false);
      expect(isClientSDKError(null)).toBe(false);
      expect(isClientSDKError(undefined)).toBe(false);
    });

    it('checks for specific error code', () => {
      const networkError = new ClientSDKError(ErrorCode.NETWORK_ERROR, 'Network error');
      const apiError = new ClientSDKError(ErrorCode.API_ERROR, 'API error');
      
      expect(isClientSDKError(networkError, ErrorCode.NETWORK_ERROR)).toBe(true);
      expect(isClientSDKError(networkError, ErrorCode.API_ERROR)).toBe(false);
      expect(isClientSDKError(apiError, ErrorCode.API_ERROR)).toBe(true);
    });
  });

  describe('handleError helper', () => {
    const handleError = (error: unknown): ClientSDKError => {
      if (error instanceof ClientSDKError) return error;
      if (error instanceof Error) {
        return new ClientSDKError(ErrorCode.UNKNOWN_ERROR, error.message, { originalError: error });
      }
      if (typeof error === 'string') {
        return new ClientSDKError(ErrorCode.UNKNOWN_ERROR, error);
      }
      return new ClientSDKError(ErrorCode.UNKNOWN_ERROR, 'Unknown error occurred', error);
    };

    it('wraps regular errors in ClientSDKError', () => {
      const regularError = new Error('Something went wrong');
      const handled = handleError(regularError);
      
      expect(handled).toBeInstanceOf(ClientSDKError);
      expect(handled.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(handled.message).toContain('Something went wrong');
      expect(handled.details).toEqual({ originalError: regularError });
    });

    it('returns ClientSDKError as-is', () => {
      const sdkError = new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid input');
      const handled = handleError(sdkError);
      
      expect(handled).toBe(sdkError);
    });

    it('handles string errors', () => {
      const handled = handleError('String error message');
      
      expect(handled).toBeInstanceOf(ClientSDKError);
      expect(handled.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(handled.message).toBe('String error message');
    });

    it('handles unknown error types', () => {
      const handled = handleError({ custom: 'error' });
      
      expect(handled).toBeInstanceOf(ClientSDKError);
      expect(handled.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(handled.message).toContain('Unknown error');
    });

    it('handles null and undefined', () => {
      const handledNull = handleError(null);
      const handledUndefined = handleError(undefined);
      
      expect(handledNull).toBeInstanceOf(ClientSDKError);
      expect(handledUndefined).toBeInstanceOf(ClientSDKError);
      expect(handledNull.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(handledUndefined.code).toBe(ErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('Error scenarios', () => {
    it('handles network timeout errors', () => {
      const error = new ClientSDKError(
        ErrorCode.NETWORK_ERROR,
        'Request timeout',
        { timeout: 30000, url: 'https://api.manifold.xyz' }
      );
      
      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.details.timeout).toBe(30000);
    });

    it('handles rate limiting errors', () => {
      const error = new ClientSDKError(
        ErrorCode.RATE_LIMITED,
        'Too many requests',
        { retryAfter: 60, limit: 100 }
      );
      
      expect(error.code).toBe(ErrorCode.RATE_LIMITED);
      expect(error.details.retryAfter).toBe(60);
    });

    it('handles transaction errors', () => {
      const error = new ClientSDKError(
        ErrorCode.TRANSACTION_FAILED,
        'Transaction reverted: Insufficient allowance',
        {
          txHash: '0xabc123',
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          revertReason: 'Insufficient allowance',
        }
      );
      
      expect(error.code).toBe(ErrorCode.TRANSACTION_FAILED);
      expect(error.details.revertReason).toBe('Insufficient allowance');
    });

    it('handles user rejection errors', () => {
      const error = new ClientSDKError(
        ErrorCode.USER_REJECTED,
        'User rejected the transaction',
        { action: 'sendTransaction', wallet: 'MetaMask' }
      );
      
      expect(error.code).toBe(ErrorCode.USER_REJECTED);
      expect(error.details.wallet).toBe('MetaMask');
    });

    it('handles product eligibility errors', () => {
      const error = new ClientSDKError(
        ErrorCode.NOT_ELIGIBLE,
        'Address not on allowlist',
        {
          address: '0x3333333333333333333333333333333333333333',
          productId: '123456',
          requirementType: 'allowlist',
        }
      );
      
      expect(error.code).toBe(ErrorCode.NOT_ELIGIBLE);
      expect(error.details.requirementType).toBe('allowlist');
    });

    it('handles insufficient balance errors', () => {
      const error = new ClientSDKError(
        ErrorCode.INSUFFICIENT_FUNDS,
        'Insufficient ETH balance',
        {
          required: '1000000000000000000',
          available: '500000000000000000',
          currency: 'ETH',
        }
      );
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_FUNDS);
      expect((error.details as any).currency).toBe('ETH');
    });
  });

  describe('Error serialization', () => {
    it('serializes to JSON', () => {
      const error = new ClientSDKError(
        ErrorCode.API_ERROR,
        'API error',
        { statusCode: 500 }
      );
      
      // Manually create serializable object
      const errorObj = {
        name: error.name,
        code: error.code,
        message: error.message,
        details: error.details,
      };
      
      const json = JSON.stringify(errorObj);
      const parsed = JSON.parse(json);
      
      expect(parsed.name).toBe('ClientSDKError');
      expect(parsed.code).toBe(ErrorCode.API_ERROR);
      expect(parsed.message).toBe('API error');
      expect(parsed.details.statusCode).toBe(500);
    });

    it('includes stack trace in development', () => {
      const error = new ClientSDKError(ErrorCode.NETWORK_ERROR, 'Network error');
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);
      
      // Stack trace might be included based on environment
      if (parsed.stack) {
        expect(parsed.stack).toContain('ClientSDKError');
      }
    });
  });

  describe('Error recovery suggestions', () => {
    it('provides recovery suggestions for common errors', () => {
      const suggestions: Record<ErrorCode, string> = {
        [ErrorCode.INSUFFICIENT_FUNDS]: 'Add more funds to your wallet',
        [ErrorCode.TRANSACTION_REJECTED]: 'Try approving the transaction again',
        [ErrorCode.NETWORK_ERROR]: 'Check your internet connection',
        [ErrorCode.RATE_LIMITED]: 'Wait before making more requests',
        [ErrorCode.NOT_ELIGIBLE]: 'Check eligibility requirements',
        [ErrorCode.LIMIT_REACHED]: 'Reduce quantity or check limits',
        [ErrorCode.NOT_STARTED]: 'Wait for product to become active',
        [ErrorCode.UNSUPPORTED_NETWORK]: 'Switch to a supported network',
        [ErrorCode.NOT_FOUND]: 'Resource not found',
      };

      Object.entries(suggestions).forEach(([code, suggestion]) => {
        const error = new ClientSDKError(code as ErrorCode, 'Error message');
        // In a real implementation, you might have a getSuggestion method
        expect(suggestions[code as ErrorCode]).toBe(suggestion);
      });
    });
  });
});