# Public Providers

Public providers enable the SDK to perform read-only blockchain operations such as fetching balances, estimating gas, and reading smart contract data. They are required when initializing the Manifold Client.

## Viem Public Provider

**createPublicProviderViem(publicClients, fallbackProviders?)** → IPublicProvider

Creates a public provider from Viem public clients with optional fallback support.

#### Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| publicClients | Record<number, PublicClient> | ✅ | Map of network IDs to Viem public clients |
| fallbackProviders | Record<number, PublicClient> | ❌ | Optional fallback providers when primary providers fail or are misconfigured |

#### Returns: IPublicProvider

#### Example

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

#### Example with Fallback Providers

```typescript
import { createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet, base } from 'viem/chains';

// Primary providers
const publicClients = {
  1: createPublicClient({
    chain: mainnet,
    transport: http('PRIMARY_MAINNET_RPC_URL')
  }),
  8453: createPublicClient({
    chain: base,
    transport: http('PRIMARY_BASE_RPC_URL')
  })
};

// Fallback providers (used when primary fails or is on wrong network)
const fallbackProviders = {
  1: createPublicClient({
    chain: mainnet,
    transport: http('BACKUP_MAINNET_RPC_URL')
  }),
  8453: createPublicClient({
    chain: base,
    transport: http('BACKUP_BASE_RPC_URL')
  })
};

// Create the public provider with fallback support
const publicProvider = createPublicProviderViem(publicClients, fallbackProviders);

// Use with Manifold client
const client = createClient({ publicProvider });
```

## Ethers v5 Public Provider

**createPublicProviderEthers5(providers, fallbackProviders?)** → IPublicProvider

Creates a public provider from Ethers v5 providers with optional fallback support.

#### Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| providers | Record<number, Provider> | ✅ | Map of network IDs to Ethers providers |
| fallbackProviders | Record<number, Provider> | ❌ | Optional fallback providers when primary providers fail or are misconfigured |

#### Returns: IPublicProvider

#### Example

```typescript
import { createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

// Create providers for each network
const providers = {
  1: new ethers.providers.JsonRpcProvider('YOUR_MAINNET_RPC_URL'),
  8453: new ethers.providers.JsonRpcProvider('YOUR_BASE_RPC_URL'),
  10: new ethers.providers.JsonRpcProvider('YOUR_OPTIMISM_RPC_URL')
};

// Create the public provider
const publicProvider = createPublicProviderEthers5(providers);

// Use with Manifold client
const client = createClient({ publicProvider });
```

#### Example with Fallback Providers

```typescript
import { createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

// Primary providers
const providers = {
  1: new ethers.providers.JsonRpcProvider('PRIMARY_MAINNET_RPC_URL'),
  8453: new ethers.providers.JsonRpcProvider('PRIMARY_BASE_RPC_URL')
};

// Fallback providers (used when primary fails or is on wrong network)
const fallbackProviders = {
  1: new ethers.providers.JsonRpcProvider('BACKUP_MAINNET_RPC_URL'),
  8453: new ethers.providers.JsonRpcProvider('BACKUP_BASE_RPC_URL')
};

// Create the public provider with fallback support
const publicProvider = createPublicProviderEthers5(providers, fallbackProviders);

// Use with Manifold client
const client = createClient({ publicProvider });
```

## Browser Usage

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

## Multi-Network Support

The SDK supports multiple networks simultaneously. Provide a public client/provider for each network you want to support:

```typescript
const publicProvider = createPublicProviderViem({
  1: mainnetClient,       // Ethereum Mainnet
  8453: baseClient,       // Base
  10: optimismClient,     // Optimism
  360: shapeClient,       // Shape
  11155111: sepoliaClient // Sepolia Testnet
});
```

## Network Requirements

The public provider must include a client/provider for the network where the NFT product is deployed. The SDK will automatically use the appropriate provider based on the product's network.

[**ClientSDKError**](../../reference/clientsdkerror.md)

| Code | Message |
| ---- | ------- |
| INVALID_INPUT | Public provider is required |
| NETWORK_NOT_SUPPORTED | No provider available for network |
| WRONG_NETWORK | Provider is connected to wrong network |

## Fallback Provider Behavior

The fallback providers feature provides automatic failover when:

1. **Primary provider is unavailable**: If the primary provider fails to connect or times out, the SDK automatically tries the fallback provider.

2. **Network mismatch**: If the primary provider is connected to the wrong network (e.g., configured for mainnet but actually connected to testnet), the SDK will check if the fallback provider is on the correct network.

3. **Provider errors**: Any errors during RPC calls (balance checks, gas estimation, etc.) will trigger an attempt with the fallback provider.

The fallback mechanism is transparent to your application - you don't need to handle any special error cases.