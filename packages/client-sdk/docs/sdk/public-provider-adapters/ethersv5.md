# Ethers v5

**createPublicProviderEthers5(providers, fallbackProviders?)** → IPublicProvider

Creates a public provider from Ethers v5 providers with optional fallback support.

## Parameters

| Parameter | Type                                                                                                                                                                                                               | Required | Description                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------- |
| providers | Record\<number, [JsonRPCProvider](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcProvider) \| [JsonRPCProvider](https://docs.ethers.org/v5/api/providers/jsonrpc-provider/#JsonRpcProvider)\[]> | ✅        | Map of network IDs to Ethers providers |

## Examples

### Basic usage

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

### With fallback providers

```typescript
import { createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

// Primary providers
const providers = {
  1: [new ethers.providers.JsonRpcProvider('PRIMARY_MAINNET_RPC_URL'), 
  new ethers.providers.JsonRpcProvider('SECONDARY_MAINNET_RPC_URL')
  ],
};

// Create the public provider with fallback support
const publicProvider = createPublicProviderEthers5(providers);

// Use with Manifold client
const client = createClient({ publicProvider });
```
