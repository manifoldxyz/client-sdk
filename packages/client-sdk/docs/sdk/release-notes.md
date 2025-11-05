# Release Notes

### November 5, 2025 (0.3.0-beta.1)

- **Breaking Change**: Removed `httpRPCs` dependency from SDK client initialization
- **New**: Added public provider abstraction for blockchain interactions
- **New**: Added `createPublicProviderViem` and `createPublicProviderEthers5` functions
- **New**: Added fallback provider support for automatic failover on provider errors or network mismatches
- **Change**: `createClient` now requires a `publicProvider` parameter
- **Change**: Account adapters no longer require the client instance
- **Improvement**: Cleaner separation between read-only and transaction operations
- **Improvement**: Better multi-network support through provider abstraction
- **Improvement**: Enhanced reliability with automatic fallback to backup providers

### October 31, 2025 (0.2.1-beta.4)

- Added support for [Edition product](product/edition-product/)

### October 21, 2025 (0.1.0-beta.1)

- Added support for [BlindMint product](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/sdk/product/product-types/blind-mint)
