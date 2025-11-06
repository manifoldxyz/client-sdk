# Public Provider Adapters

Public providers enable the SDK to perform read-only blockchain operations such as fetching balances, estimating gas, and reading smart contract data. They are required when initializing the Manifold Client.

## Available Adapters

- [Wagmi Public Provider](#wagmi-public-provider)
- [Viem Public Provider](viem.md)
- [Ethers v5 Public Provider](ethersv5.md)

## Wagmi Public Provider

**createPublicProviderWagmi(config)** → IPublicProvider

Creates a public provider from a Wagmi config with automatic network management.

#### Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| config | Config | ✅ | Wagmi config with chains and transports |

#### Returns: IPublicProvider

#### Example

```typescript
import { createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base, optimism } from '@wagmi/core/chains';

// Create Wagmi config with multiple chains
const config = createConfig({
  chains: [mainnet, base, optimism],
  transports: {
    [mainnet.id]: http('YOUR_MAINNET_RPC_URL'),
    [base.id]: http('YOUR_BASE_RPC_URL'),
    [optimism.id]: http('YOUR_OPTIMISM_RPC_URL'),
  },
});

// Create the public provider
const publicProvider = createPublicProviderWagmi({ config });

// Use with Manifold client
const client = createClient({ publicProvider });
```

#### Example with Default HTTP Transports

```typescript
import { createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';

// Use default HTTP transports (public RPCs)
const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

const publicProvider = createPublicProviderWagmi({ config });
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
