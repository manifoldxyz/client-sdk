/**
 * Utility exports for BlindMint implementation
 * Centralized utility functions for the Manifold Client SDK
 */

// Re-export existing utilities
export {
  logger
} from './logger';

export {
  validateInstanceId,
  parseManifoldUrl,
  validateAddress,
  validateNetworkId
} from './validation';

// Provider utilities
export {
  createDualProvider
} from './provider-factory';

export type {
  ProviderFactoryOptions,
  DualProvider
} from './provider-factory';

// Contract utilities
export {
  ContractFactory,
  estimateGasWithFallback,
  callWithRetry,
  batchContractCalls,
  validateContract,
  parseContractEvents,
  createMockContract,
  createTestContractFactory,
  BLINDMINT_CLAIM_ABI,
  CREATOR_CONTRACT_ABI,
  ERC20_ABI
} from './contract-factory';

export type {
  ContractFactoryOptions,
  BlindMintClaimContract,
  CreatorContract,
  ERC20Contract
} from './contract-factory';

// =============================================================================
// ADDITIONAL UTILITY FUNCTIONS
// =============================================================================

/**
 * Format BigNumber to human-readable string
 */
import * as ethers from 'ethers';

export function formatBigNumber(
  value: ethers.BigNumber,
  decimals: number = 18,
  precision: number = 4
): string {
  return parseFloat(ethers.utils.formatUnits(value, decimals)).toFixed(precision);
}

/**
 * Parse human-readable string to BigNumber
 */
export function parseBigNumber(
  value: string,
  decimals: number = 18
): ethers.BigNumber {
  return ethers.utils.parseUnits(value, decimals);
}

/**
 * Format Ethereum address for display
 */
export function formatAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address || address.length < startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Check if string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Normalize Ethereum address to checksum format
 */
export function normalizeAddress(address: string): string {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
}

/**
 * Generate random bytes for testing
 */
export function randomBytes(length: number): string {
  return ethers.utils.hexlify(ethers.utils.randomBytes(length));
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delayMs = baseDelay * Math.pow(backoffMultiplier, i);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError!;
}

/**
 * Create a timeout promise that rejects after specified time
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Chunk array into smaller arrays of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Remove duplicate items from array based on key function
 */
export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(
  json: string,
  defaultValue: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Generate a simple hash from string
 */
export function simpleHash(str: string): string {
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Create a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Create a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export default {
  formatBigNumber,
  parseBigNumber,
  formatAddress,
  isValidAddress,
  normalizeAddress,
  randomBytes,
  delay,
  retryWithBackoff,
  withTimeout,
  chunkArray,
  uniqueBy,
  deepClone,
  isEmpty,
  safeJsonParse,
  simpleHash,
  debounce,
  throttle
};