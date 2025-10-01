import type { Address, NetworkId } from '../types/common';

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
 * Validates a network ID against supported networks.
 *
 * @param networkId - The network ID to validate
 * @returns True if the network is supported
 *
 * Supported networks:
 * - 1: Ethereum Mainnet
 * - 5: Goerli (deprecated)
 * - 10: Optimism
 * - 56: BSC
 * - 137: Polygon
 * - 8453: Base
 * - 42161: Arbitrum
 * - 11155111: Sepolia
 *
 * @public
 */
export function validateNetworkId(networkId: number): networkId is NetworkId {
  // Validate common Ethereum network IDs
  const validNetworks = [1, 5, 10, 56, 137, 8453, 42161, 11155111];
  return validNetworks.includes(networkId);
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

/**
 * Formats an Ethereum address for display (shortened version).
 *
 * @param address - The address to format
 * @returns Shortened address (e.g., "0x742d...bEb7")
 *
 * @example
 * ```typescript
 * formatAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7')
 * // Returns: "0x742d...bEb7"
 * ```
 *
 * @public
 */
export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a BigInt value with decimals for human-readable display.
 *
 * @param value - The BigInt value to format (in smallest unit, e.g., wei)
 * @param decimals - Number of decimal places (default: 18 for ETH)
 * @returns Formatted string with decimal notation
 *
 * @example
 * ```typescript
 * formatMoney(BigInt('1000000000000000000'), 18) // "1"
 * formatMoney(BigInt('1500000000000000000'), 18) // "1.5"
 * formatMoney(BigInt('123456789000000000'), 18) // "0.123456789"
 * ```
 *
 * @public
 */
export function formatMoney(value: bigint, decimals = 18): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');

  if (trimmedFractional.length === 0) {
    return wholePart.toString();
  }

  return `${wholePart}.${trimmedFractional}`;
}
