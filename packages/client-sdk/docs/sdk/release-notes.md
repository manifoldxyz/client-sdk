# Release Notes

### November 18, 2025 (TBD)

- **New**: Added `subscribeToContractEvents` method to `IPublicProvider` for subscribing to contract events
- **New**: Implemented `subscribeToContractEvents` in all provider adapters (Viem, Ethers5, Wagmi)
- **Feature**: Support for real-time event monitoring with topic filtering and callback handlers

### November 5, 2025 (0.3.1-beta.0)

- **Breaking Change**: Removed `httpRPCs` dependency from SDK client initialization
- **New**: Added public provider abstraction for blockchain interactions
- **New**: Added `createPublicProviderViem` and `createPublicProviderEthers5` functions
- **New**: Added `createPublicProviderWagmi` function for Wagmi integration
- **New**: Added fallback provider support for automatic failover on provider errors or network mismatches
- **Change**: `createClient` now requires a `publicProvider` parameter
- **Change**: Account adapters no longer require the client instance
- **Improvement**: Cleaner separation between read-only and transaction operations
- **Improvement**: Better multi-network support through provider abstraction
- **Improvement**: Enhanced reliability with automatic fallback to backup providers
- **Improvement**: Native Wagmi support for seamless React integration

### October 31, 2025 (0.2.1-beta.4)

- Added support for [Edition product](product/edition-product/)

### October 21, 2025 (0.1.0-beta.1)

- Added support for [BlindMint product](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/sdk/product/product-types/blind-mint)
