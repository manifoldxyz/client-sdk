import { ethers } from 'ethers';
import { ClientSDKError, ErrorCode } from '../types/errors';

export interface GasEstimationParams {
  contract: ethers.Contract;
  method: string;
  args: unknown[];
  from: string;
  value?: ethers.BigNumber;
  fallbackGas?: ethers.BigNumber;
}

/**
 * Generic gas estimation function with fallback
 * Can be reused across all product types
 */
export async function estimateGas(params: GasEstimationParams): Promise<ethers.BigNumber> {
  const {
    contract,
    method,
    args,
    from,
    value,
    fallbackGas = ethers.BigNumber.from(200000),
  } = params;

  try {
    // Check if the method exists on the contract
    if (!contract.estimateGas[method]) {
      throw new ClientSDKError(
        ErrorCode.ESTIMATION_FAILED,
        `Method ${method} not found on contract`,
      );
    }

    // Prepare overrides
    const overrides: ethers.Overrides & { from?: string; value?: ethers.BigNumber } = { from };
    if (value) {
      overrides.value = value;
    }

    // Estimate gas
    const estimateMethod = contract.estimateGas[method] as (
      ...args: unknown[]
    ) => Promise<ethers.BigNumber>;
    const gasEstimate = await estimateMethod(...args, overrides);

    return gasEstimate;
  } catch (error) {
    console.warn(`Gas estimation failed for ${method}, using fallback:`, error);
    return fallbackGas;
  }
}

/**
 * Apply gas buffer to an estimate
 * @param gasEstimate The base gas estimate
 * @param bufferPercentage Buffer percentage (e.g., 30 for 30%)
 */
export function applyGasBuffer(
  gasEstimate: ethers.BigNumber,
  bufferPercentage: number = 30,
): ethers.BigNumber {
  const buffer = 100 + bufferPercentage;
  return gasEstimate.mul(buffer).div(100);
}
