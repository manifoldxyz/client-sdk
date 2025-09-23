import type { Address } from '../types/common';

export function validateAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function validateInstanceId(instanceId: string): boolean {
  return /^\d+$/.test(instanceId);
}

export function parseManifoldUrl(url: string): { instanceId: string } | null {
  // Parse URLs like: https://manifold.xyz/@meta8eth/id/4150231280
  const match = url.match(/manifold\.xyz\/@[\w-]+\/id\/(\d+)/);
  if (match && match[1]) {
    return { instanceId: match[1] };
  }
  return null;
}

export function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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
