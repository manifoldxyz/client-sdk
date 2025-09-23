import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  validateInstanceId,
  parseManifoldUrl,
  formatMoney,
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true);
      expect(validateAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      expect(validateAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(validateAddress('invalid')).toBe(false);
      expect(validateAddress('0x742d35Cc')).toBe(false);
      expect(validateAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(false);
      expect(validateAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
    });
  });

  describe('validateInstanceId', () => {
    it('should validate numeric instance IDs', () => {
      expect(validateInstanceId('4150231280')).toBe(true);
      expect(validateInstanceId('123')).toBe(true);
      expect(validateInstanceId('0')).toBe(true);
    });

    it('should reject non-numeric instance IDs', () => {
      expect(validateInstanceId('abc123')).toBe(false);
      expect(validateInstanceId('123abc')).toBe(false);
      expect(validateInstanceId('')).toBe(false);
      expect(validateInstanceId('12.34')).toBe(false);
    });
  });

  describe('parseManifoldUrl', () => {
    it('should parse valid Manifold URLs', () => {
      const result = parseManifoldUrl('https://manifold.xyz/@meta8eth/id/4150231280');
      expect(result).toEqual({ instanceId: '4150231280' });
    });

    it('should handle different username formats', () => {
      const result = parseManifoldUrl('https://manifold.xyz/@test-user_123/id/999');
      expect(result).toEqual({ instanceId: '999' });
    });

    it('should return null for invalid URLs', () => {
      expect(parseManifoldUrl('https://example.com')).toBeNull();
      expect(parseManifoldUrl('https://manifold.xyz/invalid')).toBeNull();
      expect(parseManifoldUrl('invalid-url')).toBeNull();
    });
  });

  describe('formatMoney', () => {
    it('should format ETH values correctly', () => {
      expect(formatMoney(BigInt('1000000000000000000'))).toBe('1');
      expect(formatMoney(BigInt('500000000000000000'))).toBe('0.5');
      expect(formatMoney(BigInt('50000000000000000'))).toBe('0.05');
      expect(formatMoney(BigInt('0'))).toBe('0');
    });

    it('should handle small values', () => {
      expect(formatMoney(BigInt('1000000000000000'))).toBe('0.001');
      expect(formatMoney(BigInt('1000000000000'))).toBe('0.000001');
    });

    it('should handle custom decimals', () => {
      expect(formatMoney(BigInt('1000000'), 6)).toBe('1');
      expect(formatMoney(BigInt('500000'), 6)).toBe('0.5');
    });
  });
});
