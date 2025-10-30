import type { Address } from '../types/common';

/**
 * Validates an Ethereum address format.
 *
 * @param address - The address string to validate
 * @returns True if the address is a valid Ethereum address (0x + 40 hex chars)
 *
 * @example
 * ```typescript
 * validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7') // true
 * validateAddress('invalid') // false
 * validateAddress('0x123') // false (too short)
 * ```
 *
 * @public
 */
export function validateAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates a Manifold instance ID format.
 *
 * @param instanceId - The instance ID to validate
 * @returns True if the instance ID is valid (numeric string)
 *
 * @example
 * ```typescript
 * validateInstanceId('4150231280') // true
 * validateInstanceId('abc123') // false
 * validateInstanceId('') // false
 * ```
 *
 * @public
 */
export function validateInstanceId(instanceId: string): boolean {
  return /^\d+$/.test(instanceId);
}

/**
 * Parses a Manifold product URL to extract the instance ID.
 *
 * @param url - The Manifold URL to parse
 * @returns Object with instanceId or null if invalid
 *
 * @example
 * ```typescript
 * parseManifoldUrl('https://manifold.xyz/@creator/id/4150231280')
 * // Returns: { instanceId: '4150231280' }
 *
 * parseManifoldUrl('https://example.com/product')
 * // Returns: null
 * ```
 *
 * @public
 */
export function parseManifoldUrl(url: string): { instanceId: string } | null {
  // Parse URLs like: https://manifold.xyz/@meta8eth/id/4150231280
  const match = url.match(/manifold\.xyz\/@[\w-]+\/id\/(\d+)/);
  if (match && match[1]) {
    return { instanceId: match[1] };
  }
  return null;
}
