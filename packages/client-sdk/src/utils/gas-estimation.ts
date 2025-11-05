import { ClientSDKError, ErrorCode } from '../types/errors';
import type { IPublicProvider } from '../types';

export interface GasEstimationParams {
  publicProvider: IPublicProvider;
  contractAddress: string;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  from: string;
  networkId: number;
  value?: bigint;
  fallbackGas?: bigint;
}

/**
 * Generic gas estimation function with fallback
 * Can be reused across all product types
 */
export async function estimateGas(params: GasEstimationParams): Promise<bigint> {
  const {
    publicProvider,
    contractAddress,
    abi,
    functionName,
    args = [],
    from,
    networkId,
    value,
    fallbackGas,
  } = params;

  try {
    // Convert ethers BigNumber to bigint for the publicProvider interface
    const valueBigInt = value ? BigInt(value.toString()) : undefined;

    // Use the publicProvider's estimateContractGas method
    const gasEstimate = await publicProvider.estimateContractGas({
      contractAddress,
      abi,
      functionName,
      args,
      from,
      value: valueBigInt,
      networkId,
    });

    return gasEstimate;
  } catch (error) {
    if (fallbackGas) {
      console.warn(`Gas estimation failed for ${functionName}, using fallback:`, error);
      return fallbackGas;
    }

    // Wrap the error with more context
    throw new ClientSDKError(
      ErrorCode.GAS_ESTIMATION_FAILED,
      `Failed to estimate gas for ${functionName}`,
      {
        contractAddress,
        functionName,
        from,
        networkId,
        originalError: error instanceof Error ? error : undefined,
      },
    );
  }
}

/**
 * Apply gas buffer to an estimate
 * @param gasEstimate The base gas estimate
 * @param bufferPercentage Buffer percentage (e.g., 30 for 30%)
 */
export function applyGasBuffer(gasEstimate: bigint, bufferPercentage: number = 30): bigint {
  const buffer = 100n + BigInt(bufferPercentage);
  return (gasEstimate * buffer) / 100n;
}
