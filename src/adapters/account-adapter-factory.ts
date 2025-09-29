import type {
  IAccountAdapter,
  FactoryError,
  FactoryErrorCode,
  ProviderDetection,
} from '../types/account-adapter';
import { ClientSDKError } from '../types/errors';
import type { Signer } from 'ethers';
import { createEthers5Adapter } from './ethers5-adapter';
import { createViemAdapter, isViemCompatible } from './viem-adapter';

// =============================================================================
// ACCOUNT ADAPTER FACTORY IMPLEMENTATION
// =============================================================================

/**
 * Factory class for creating account adapters with explicit type safety.
 * Provides type-safe methods for each supported Web3 library and includes
 * backward compatibility with auto-detection.
 *
 * @example
 * ```typescript
 * // Recommended: Explicit factory methods (type-safe)
 * const ethers5Adapter = AccountAdapterFactory.fromEthers5(signer);
 *
 * // Legacy: Auto-detect (may be deprecated in future)
 * const adapter = AccountAdapterFactory.create(provider);
 * ```
 */
export class AccountAdapterFactory {
  /**
   * Create adapter from ethers v5 provider or signer
   *
   * @param provider - ethers v5 Provider or Signer instance
   * @returns IAccountAdapter instance configured for ethers v5
   * @throws {FactoryError} When provider is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { ethers } from 'ethers'; // v5
   *
   * const provider = new ethers.providers.Web3Provider(window.ethereum);
   * const signer = provider.getSigner();
   * const adapter = AccountAdapterFactory.fromEthers5(signer);
   * ```
   */
  static fromEthers5(options: { signer: Signer }): IAccountAdapter  {
    const { signer } = options;
    try {
      return createEthers5Adapter(signer);
    } catch (error) {
      if (error instanceof ClientSDKError) {
        throw this._createFactoryError(
          'INITIALIZATION_FAILED',
          `Failed to create ethers v5 adapter: ${error.message}`,
          { provider: signer, originalError: error },
        );
      }
      throw error;
    }
  }

  /**
   * Create adapter from ethers v6 provider or signer
   *
   * @param provider - ethers v6 Provider or Signer instance
   * @returns IAccountAdapter instance configured for ethers v6
   * @throws {FactoryError} When provider is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { ethers } from 'ethers'; // v6
   *
   * const provider = new ethers.BrowserProvider(window.ethereum);
   * const signer = await provider.getSigner();
   * const adapter = AccountAdapterFactory.fromEthers6(signer);
   * ```
   */
  static fromEthers6(provider: unknown): IAccountAdapter {
    throw this._createFactoryError(
      'UNSUPPORTED_PROVIDER',
      'Ethers v6 adapter not yet implemented',
      { provider, attemptedType: 'ethers6' },
    );
  }

  /**
   * Create adapter from viem wallet client
   *
   * @param client - viem WalletClient or PublicClient with account
   * @returns IAccountAdapter instance configured for viem
   * @throws {FactoryError} When client is invalid or unsupported
   *
   * @example
   * ```typescript
   * import { createWalletClient, custom } from 'viem';
   * import { mainnet } from 'viem/chains';
   *
   * const client = createWalletClient({
   *   chain: mainnet,
   *   transport: custom(window.ethereum)
   * });
   * const adapter = AccountAdapterFactory.fromViem(client);
   * ```
   */
  static fromViem(client: unknown): IAccountAdapter {
    try {
      if (!isViemCompatible(client)) {
        throw this._createFactoryError('INVALID_PROVIDER', 'Client is not compatible with viem', {
          provider: client,
          attemptedType: 'viem',
        });
      }

      return createViemAdapter(client);
    } catch (error) {
      if (error instanceof ClientSDKError) {
        throw this._createFactoryError(
          'INITIALIZATION_FAILED',
          `Failed to create viem adapter: ${error.message}`,
          { provider: client, originalError: error },
        );
      }
      throw error;
    }
  }

  /**
   * Auto-detect provider type and create appropriate adapter
   *
   * @deprecated Use explicit factory methods (fromEthers5, fromEthers6, fromViem) for better type safety
   * @param provider - Unknown provider instance to auto-detect
   * @returns IAccountAdapter instance for detected provider type
   * @throws {FactoryError} When provider type cannot be detected
   *
   * @example
   * ```typescript
   * // Legacy usage (may be deprecated)
   * const adapter = AccountAdapterFactory.create(unknownProvider);
   *
   * // Preferred: Use explicit methods
   * const adapter = AccountAdapterFactory.fromEthers5(ethersSigner);
   * ```
   */
  static create(provider: unknown): IAccountAdapter {
    const detection = this.detectProvider(provider);

    if (detection.confidence < 0.7) {
      throw this._createFactoryError(
        'DETECTION_FAILED',
        `Unable to detect provider type with sufficient confidence (${detection.confidence})`,
        {
          provider,
          detectedFeatures: detection.features,
        },
      );
    }

    if (detection.isEthers5) {
      return this.fromEthers5(provider as { signer: Signer });
    } else if (detection.isEthers6) {
      return this.fromEthers6(provider);
    } else if (detection.isViem) {
      return this.fromViem(provider);
    }

    throw this._createFactoryError(
      'UNSUPPORTED_PROVIDER',
      'Provider type could not be determined or is not supported',
      {
        provider,
        detectedFeatures: detection.features,
      },
    );
  }

  /**
   * Detect provider type for debugging and validation
   *
   * @param provider - Unknown provider instance
   * @returns ProviderDetection with detailed analysis
   *
   * @example
   * ```typescript
   * const detection = AccountAdapterFactory.detectProvider(provider);
   * console.log(`Ethers v5: ${detection.isEthers5}, Confidence: ${detection.confidence}`);
   * console.log(`Features: ${detection.features.join(', ')}`);
   * ```
   */
  static detectProvider(provider: unknown): ProviderDetection {
    const features: string[] = [];
    let ethers5Score = 0;
    let ethers6Score = 0;
    let viemScore = 0;

    if (!provider || typeof provider !== 'object') {
      return {
        isEthers5: false,
        isEthers6: false,
        isViem: false,
        features,
        confidence: 0,
      };
    }

    const obj = provider as Record<string, unknown>;

    // Check for ethers common methods
    if (typeof obj.getNetwork === 'function') {
      features.push('getNetwork');
      ethers5Score += 0.3;
      ethers6Score += 0.3;
    }

    if (typeof obj.getBalance === 'function') {
      features.push('getBalance');
      ethers5Score += 0.3;
      ethers6Score += 0.3;
    }

    if (typeof obj.signTransaction === 'function') {
      features.push('signTransaction');
      ethers5Score += 0.2;
      ethers6Score += 0.2;
    }

    if (typeof obj.getAddress === 'function') {
      features.push('getAddress');
      ethers5Score += 0.2;
      ethers6Score += 0.2;
    }

    // Check for ethers v5 specific patterns
    if (obj._isProvider === true) {
      features.push('_isProvider');
      ethers5Score += 0.4;
      ethers6Score -= 0.2; // v6 doesn't have this
    }

    const providerObj = obj.provider as Record<string, unknown> | undefined;
    if (providerObj && providerObj._isProvider === true) {
      features.push('provider._isProvider');
      ethers5Score += 0.3;
      ethers6Score -= 0.1;
    }

    // Check for potential ethers v6 patterns
    const constructorObj = obj.constructor as unknown as Record<string, unknown> | undefined;
    if (
      typeof constructorObj?.name === 'string' &&
      constructorObj.name.includes('Provider') &&
      !obj._isProvider
    ) {
      features.push('v6Provider');
      ethers6Score += 0.3;
      ethers5Score -= 0.1;
    }

    // Check for viem patterns
    if (obj.mode === 'walletClient' || obj.mode === 'publicClient') {
      features.push('viemMode');
      viemScore += 0.5;
    }

    if (obj.transport && typeof obj.transport === 'object') {
      features.push('viemTransport');
      viemScore += 0.3;
    }

    const chainObj = obj.chain as Record<string, unknown> | undefined;
    if (chainObj && typeof chainObj === 'object' && chainObj.id) {
      features.push('viemChain');
      viemScore += 0.3;
    }

    // Check for viem WalletClient specific methods
    if (
      typeof obj.sendTransaction === 'function' &&
      typeof obj.signMessage === 'function' &&
      (obj.account || typeof obj.getAddresses === 'function')
    ) {
      features.push('viemWalletClient');
      viemScore += 0.4;
    }

    // Check for viem PublicClient specific methods
    if (
      typeof obj.readContract === 'function' &&
      typeof obj.getChainId === 'function' &&
      !obj.sendTransaction
    ) {
      features.push('viemPublicClient');
      viemScore += 0.4;
    }

    // Reduce ethers scores if viem patterns detected
    if (viemScore > 0.3) {
      ethers5Score *= 0.5;
      ethers6Score *= 0.5;
    }

    // Determine best match
    const maxScore = Math.max(ethers5Score, ethers6Score, viemScore);
    const isEthers5 = ethers5Score === maxScore && ethers5Score > 0.5;
    const isEthers6 = ethers6Score === maxScore && ethers6Score > 0.5;
    const isViem = viemScore === maxScore && viemScore > 0.5;

    return {
      isEthers5,
      isEthers6,
      isViem,
      features,
      confidence: maxScore,
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Create a FactoryError with consistent formatting
   */
  private static _createFactoryError(
    code: FactoryErrorCode,
    message: string,
    context?: {
      provider?: unknown;
      attemptedType?: string;
      detectedFeatures?: string[];
      originalError?: Error;
    },
  ): FactoryError {
    const error: FactoryError = Object.assign(new Error(message), {
      code,
      attemptedType: context?.attemptedType,
      context: {
        provider: context?.provider,
        detectedFeatures: context?.detectedFeatures,
      },
    });

    return error;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Static instance for convenience access
 *
 * @example
 * ```typescript
 * import { AccountAdapterFactory } from './adapters/account-adapter-factory';
 *
 * const adapter = AccountAdapterFactory.fromEthers5(signer);
 * ```
 */
export const accountAdapterFactory = AccountAdapterFactory;

/**
 * Re-export the factory as default for convenience
 */
export default AccountAdapterFactory;
