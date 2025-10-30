import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  validateInstanceId,
  parseManifoldUrl,
} from '../../src/utils/validation';

describe('validation utilities', () => {
  it('validates ethereum addresses correctly', () => {
    expect(validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7')).toBe(true);
    expect(validateAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    expect(validateAddress('0x123')).toBe(false);
    expect(validateAddress('not-an-address')).toBe(false);
  });

  it('validates instance ids as numeric strings', () => {
    expect(validateInstanceId('1234567890')).toBe(true);
    expect(validateInstanceId('001')).toBe(true);
    expect(validateInstanceId('abc')).toBe(false);
    expect(validateInstanceId('')).toBe(false);
  });

  it('parses manifold urls and extracts instance ids', () => {
    expect(
      parseManifoldUrl('https://manifold.xyz/@creator/id/4150231280'),
    ).toEqual({ instanceId: '4150231280' });

    expect(parseManifoldUrl('https://example.com/product')).toBeNull();
    expect(parseManifoldUrl('https://manifold.xyz/profile')).toBeNull();
  });
});
