import type { IAccountAdapter } from '../types/account-adapter';
import type { NetworkId } from '../types/common';
import { NETWORK_CONFIGS } from '../config/networks';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { ethers } from 'ethers';
import { Network } from '@manifoldxyz/js-ts-utils';

export interface PollOptions<T> {
  fetch: () => Promise<T>;
  validate: (value: T) => boolean;
  intervalMs?: number;
  maxAttempts?: number;
  errorMessage?: string;
}

export async function poll<T>(options: PollOptions<T>): Promise<T> {
  const {
    fetch,
    validate,
    intervalMs = 500,
    maxAttempts = 20,
    errorMessage = 'Polling condition not satisfied within timeout',
  } = options;

  let attempts = 0;
  while (attempts < maxAttempts) {
    const value = await fetch();
    if (validate(value)) {
      return value;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new ClientSDKError(ErrorCode.TIMEOUT, errorMessage);
}

function getNetworkDisplayName(networkId: NetworkId): string {
  const config = NETWORK_CONFIGS[networkId];
  return config?.name ?? `Chain ${networkId}`;
}

export interface EnsureConnectedNetworkOptions {
  provider: ethers.providers.JsonRpcProvider;
  accountAdapter: IAccountAdapter;
  targetNetworkId: NetworkId;
  pollIntervalMs?: number;
  maxAttempts?: number;
}

export async function ensureConnectedNetwork(
  options: EnsureConnectedNetworkOptions,
): Promise<void> {
  const { accountAdapter, targetNetworkId, pollIntervalMs = 500, maxAttempts = 20 } = options;

  const initialNetworkId = await accountAdapter.getConnectedNetworkId();
  if (initialNetworkId === targetNetworkId) {
    return;
  }

  const networkName = getNetworkDisplayName(targetNetworkId);

  const throwEnsureError = async (message: string, originalError?: unknown): Promise<never> => {
    const actualNetworkId = await accountAdapter
      .getConnectedNetworkId()
      .catch(() => initialNetworkId);

    throw new ClientSDKError(ErrorCode.WRONG_NETWORK, message, {
      expectedNetworkId: targetNetworkId,
      actualNetworkId,
      originalError: originalError instanceof Error ? originalError : undefined,
    });
  };

  try {
    await accountAdapter.switchNetwork(targetNetworkId);
  } catch (switchError) {
    const code = (switchError as { code?: unknown })?.code;

    if (code === 4902) {
      try {
        const networkConfigs = Network.NETWORK_CONFIGS[targetNetworkId as Network.NetworkId];
        if (networkConfigs) {
          const params = {
            chainId: `0x${targetNetworkId.toString(16)}`,
            chainName: networkConfigs.chainName,
            nativeCurrency: networkConfigs.nativeCurrency,
            rpcUrls: networkConfigs.rpcUrls,
            blockExplorerUrls: networkConfigs.blockExplorerUrls,
          };
          await accountAdapter.sendCalls?.('wallet_addEthereumChain', [params]);
        }
        // try switching network again
        await accountAdapter.switchNetwork(targetNetworkId);
      } catch (addNetworkError) {
        const message =
          addNetworkError instanceof Error && addNetworkError.message
            ? addNetworkError.message
            : `Failed to switch to the ${networkName} network`;
        await throwEnsureError(message, addNetworkError);
      }
    } else {
      const message =
        switchError instanceof Error && switchError.message
          ? switchError.message
          : `Failed to switch to the ${networkName} network`;
      await throwEnsureError(message, switchError);
    }
  }

  try {
    await poll<number>({
      fetch: () => accountAdapter.getConnectedNetworkId(),
      validate: (value) => value === targetNetworkId,
      intervalMs: pollIntervalMs,
      maxAttempts,
      errorMessage: `Failed to confirm network switch to ${networkName}`,
    });
  } catch (confirmationError) {
    const message =
      confirmationError instanceof Error && confirmationError.message
        ? confirmationError.message
        : `Failed to confirm network switch to ${networkName}`;
    await throwEnsureError(message, confirmationError);
  }
}
