# Manifold Client

### Client Creation

**createClient(config)** → ManifoldClient&#x20;

Creates a new SDK client instance.

#### Parameters

| Parameter | Type   | Required | Description                                          |
| --------- | ------ | -------- | ---------------------------------------------------- |
| config    | object | ✅        | Configuration object                                 |
| └─ publicProvider | IPublicProvider | ✅ | Provider for blockchain interactions |
| └─ debug  | boolean| ❌        | Enable debug logging (default: false)               |

#### Returns: ManifoldClient

| Property                    | Type     | Description   |
| --------------------------- | -------- | ------------- |
| [getProduct](getproduct.md) | function | Get a product |

#### Example with Wagmi

```typescript
import { createClient, createPublicProviderWagmi } from '@manifoldxyz/client-sdk';
import { createConfig, http } from '@wagmi/core';
import { mainnet, base } from '@wagmi/core/chains';

// Create Wagmi config with multiple chains
const config = createConfig({
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http('YOUR_MAINNET_RPC_URL'),
    [base.id]: http('YOUR_BASE_RPC_URL'),
  },
});

// Create the public provider
const publicProvider = createPublicProviderWagmi({ config });

// Initialize the Manifold client
const client = createClient({ publicProvider });
```

#### Example with Viem

```typescript
import { createClient, createPublicProviderViem } from '@manifoldxyz/client-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create public clients for each network you want to support
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('YOUR_RPC_URL')
});

// Create the public provider
const publicProvider = createPublicProviderViem({ 
  1: publicClient // mainnet
});

// Initialize the Manifold client
const client = createClient({ publicProvider });
```

#### Example with Ethers v5

```typescript
import { createClient, createPublicProviderEthers5 } from '@manifoldxyz/client-sdk';
import { ethers } from 'ethers';

// Create ethers providers for each network
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');

// Create the public provider
const publicProvider = createPublicProviderEthers5({ 
  1: provider // mainnet
});

// Initialize the Manifold client
const client = createClient({ publicProvider });
```
