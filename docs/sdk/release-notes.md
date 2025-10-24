# Release Notes

### October 24, 2025 (0.1.0-beta.3)

* **NEW: Complete Edition Product support** - Full implementation of Edition NFT product type
* Added `EditionProduct` class with comprehensive purchase flow support
* Implemented Edition contract integration for both ERC721 and ERC1155 standards
* Added Edition-specific ABI contracts (`EditionClaimABI`) for onchain data fetching
* Enhanced `ContractFactory` with Edition contract creation methods
* Implemented MerkleProofService for allowlist validation infrastructure
* Added Edition product type guard for AppId detection and TypeScript type narrowing
* Comprehensive test coverage (85.65% statement coverage, 55 test cases)
* Support for native currency and ERC20 token payments
* Real-time onchain data fetching including supply, pricing, and allowlist status
* Purchase eligibility validation with proper error handling
* Multi-step transaction support (approval + mint) with progress tracking

### October 21, 2025 (0.1.0-beta.1)

* Added support for [BlindMint product](https://app.gitbook.com/o/FkM3zqPi1O0VypWXgiUZ/s/wX9Yl8DLygpenDBVWGPF/~/changes/1/sdk/product/product-types/blind-mint)
