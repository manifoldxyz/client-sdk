# Viem

**createPublicProviderViem(publicClients, fallbackProviders?)** → IPublicProvider

Creates a public provider from Viem public clients with optional fallback support.

## Parameters

| Parameter     | Type                                             | Required | Description                               |
| ------------- | ------------------------------------------------ | -------- | ----------------------------------------- |
| publicClients | Record\<number, PublicClient \| PublicClient\[]> | ✅        | Map of network IDs to Viem public clients |

## Examples

### Basic usage

```typescript
import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, base, optimism } from 'viem/chains';

// Create public clients for each network
const publicClients = {
  1: createPublicClient({
    chain: mainnet,
    transport: http('YOUR_MAINNET_RPC_URL')
  }),
  8453: createPublicClient({
    chain: base,
    transport: http('YOUR_BASE_RPC_URL')
  }),
  10: createPublicClient({
    chain: optimism,
    transport: http('YOUR_OPTIMISM_RPC_URL')
  })
};

// Create the public provider
const publicProvider = createPublicProviderViem(publicClients);

// Use with Manifold client
const client = createClient({ publicProvider });
```

### With fallback providers

```typescript
import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, base } from 'viem/chains';

// Providers with fallback (used when primary fails or is on wrong network)
const publicClients = {
  1: [
  createPublicClient({
    chain: mainnet,
    transport: http('PRIMARY_MAINNET_RPC_URL')
  }),
  createPublicClient({
    chain: mainnet,
    transport: http('FALLBACK_MAINNET_RPC_URL')
  })
  ]
};

// Create the public provider with fallback support
const publicProvider = createPublicProviderViem(publicClients);

// Use with Manifold client
const client = createClient({ publicProvider });
```

## Browser usage

For browser applications using MetaMask or other injected wallets:

```typescript
import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

// Use the browser's injected provider
const publicClient = createPublicClient({
  chain: mainnet,
  transport: custom(window.ethereum)
});

const publicProvider = createPublicProviderViem({
  1: publicClient
});

const client = createClient({ publicProvider });
```
