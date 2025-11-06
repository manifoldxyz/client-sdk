# Public Provider Adapters

Public providers enable the SDK to perform read-only blockchain operations such as fetching balances, estimating gas, and reading smart contract data. They are required when initializing the Manifold Client.

## Available Adapters

* [Wagmi Public Provider](wagmi.md)
* [Viem Public Provider](viem.md)
* [Ethers v5 Public Provider](ethersv5.md)



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

| Code                    | Message                                |
| ----------------------- | -------------------------------------- |
| INVALID\_INPUT          | Public provider is required            |
| NETWORK\_NOT\_SUPPORTED | No provider available for network      |
| WRONG\_NETWORK          | Provider is connected to wrong network |

