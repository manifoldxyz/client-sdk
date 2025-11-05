import { ClientSDKError, ErrorCode } from '../../types/errors';

/**
 * Generic provider interface for fallback functionality
 */
interface ProviderLike {
  getNetwork?: () => Promise<{ chainId: number }>;
  getChainId?: () => Promise<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow any additional properties
}

/**
 * Options for executing operations with fallback
 */
interface FallbackOptions<TProvider, TResult> {
  /** The target network ID */
  networkId: number;
  /** List of providers to try */
  providers: TProvider[];
  /** Function to get the chain ID from a provider */
  getChainId: (provider: TProvider) => Promise<number>;
  /** Optional function to attempt network switching (ethers only) */
  switchNetwork?: (provider: TProvider, networkId: number) => Promise<boolean>;
  /** The operation to execute */
  operation: (provider: TProvider) => Promise<TResult>;
}

/**
 * Execute an operation with automatic fallback to alternative providers
 *
 * This utility tries each provider in sequence until one succeeds:
 * 1. Validates the provider is on the correct network
 * 2. Attempts to switch network if possible (ethers only)
 * 3. Executes the operation
 * 4. Falls back to next provider on any failure
 *
 * @param options - The fallback execution options
 * @returns The result of the operation
 * @throws ClientSDKError if all providers fail
 */
export async function executeWithProviderFallback<TProvider extends ProviderLike, TResult>(
  options: FallbackOptions<TProvider, TResult>,
): Promise<TResult> {
  const { networkId, providers, getChainId, switchNetwork, operation } = options;

  if (!providers || providers.length === 0) {
    throw new ClientSDKError(
      ErrorCode.UNSUPPORTED_NETWORK,
      `No provider configured for network ${networkId}`,
    );
  }

  let lastError: Error | undefined;

  // Try each provider in the list
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];

    if (!provider) continue;

    try {
      // First ensure provider is on correct network
      const chainId = await getChainId(provider);

      if (chainId !== networkId) {
        // Try to switch the network if supported (ethers only)
        if (switchNetwork) {
          try {
            const switched = await switchNetwork(provider, networkId);
            if (!switched) {
              continue; // Skip to next provider if switch failed
            }
          } catch {
            continue; // Network switch failed, try next provider
          }
        } else {
          // Can't switch networks (viem), continue to next provider
          continue;
        }
      }

      // Execute the operation
      return await operation(provider);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next provider
    }
  }

  // All providers failed
  throw (
    lastError ||
    new ClientSDKError(ErrorCode.UNKNOWN_ERROR, `All providers failed for network ${networkId}`)
  );
}
