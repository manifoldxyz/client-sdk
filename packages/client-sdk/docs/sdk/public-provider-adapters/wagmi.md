# Wagmi Public Provider

**createPublicProviderWagmi(params)** → IPublicProvider

Creates a public provider from a Wagmi `Config`. This adapter lets the SDK reuse the public clients that Wagmi configures for read-only blockchain operations such as fetching balances, estimating gas, and reading contracts.

## Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| config | [Config](https://wagmi.sh/core/api/createConfig) | ✅ | Wagmi config with chains and transports |

## Examples

### Basic usage

```typescript
import { createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';

// Configure Wagmi with the networks you intend to support
const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http('YOUR_MAINNET_RPC_URL'),
    [base.id]: http('YOUR_BASE_RPC_URL'),
  },
});

// Create the Manifold public provider
const publicProvider = createPublicProviderWagmi({ config });

// Pass into the Manifold client
const client = createClient({ publicProvider });
```

### Multi-network with fallback transports

```typescript
import { createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig } from '@wagmi/core';
import { fallback, http } from 'viem';
import { mainnet, optimism } from '@wagmi/core/chains';

const config = createConfig({
  chains: [mainnet, optimism],
  transports: {
    [mainnet.id]: fallback([
      http('PRIMARY_MAINNET_RPC_URL'),
      http('BACKUP_MAINNET_RPC_URL'),
    ]),
    [optimism.id]: http('YOUR_OPTIMISM_RPC_URL'),
  },
});

const publicProvider = createPublicProviderWagmi({ config });
```

### Browser usage with Wagmi React

```typescript
import { useMemo } from 'react';
import { WagmiProvider, useConfig } from 'wagmi';
import { createConfig, http } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';
import { createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';

const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(), // Uses the default public RPC
  },
});

export function App() {
  return (
    <WagmiProvider config={config}>
      <SdkInitializer />
    </WagmiProvider>
  );
}

function SdkInitializer() {
  const config = useConfig();
  const publicProvider = createPublicProviderWagmi({ config });
  const client = useMemo(() => createClient({ publicProvider }), [publicProvider]);

  return /* your UI */;
}
```

## Notes

- The Wagmi config **must** include a transport for every chain you expect to access. If a chain is missing, calls will throw `ClientSDKError` with `UNSUPPORTED_NETWORK`.
- The adapter uses Wagmi’s `getPublicClient` under the hood, so the config should expose a public client transport (e.g., `http`, `fallback`).
- Wagmi handles provider caching; reuse the same config instance when possible to avoid creating redundant clients.
