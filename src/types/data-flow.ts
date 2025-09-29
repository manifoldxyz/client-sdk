import type { Address } from './common';

// =============================================================================
// ESSENTIAL API RESPONSE TYPES
// =============================================================================

/**
 * Basic API response metadata
 */
export interface ApiResponseMetadata {
  /** Response timestamp */
  timestamp: Date;
  /** Request ID for tracing */
  requestId: string;
}

// =============================================================================
// BASIC ALLOCATION TYPES (matching product.ts)
// =============================================================================

/**
 * Simplified allocation request
 */
export interface AllocationRequest {
  /** Recipient wallet address */
  recipientAddress: Address;
}

/**
 * Simplified allocation response
 */
export interface AllocationResponse {
  /** Whether recipient is eligible to mint */
  isEligible: boolean;
  /** Reason for ineligibility */
  reason?: string;
  /** Maximum quantity allowed */
  quantity: number;
}

// Note: Complex pricing, metadata, state sync, and pagination types removed.
// These were over-engineered for the current SDK needs.
// If needed in the future, implement simpler, focused versions.
