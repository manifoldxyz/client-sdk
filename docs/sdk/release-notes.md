# Release Notes

### October 27, 2025 (0.1.0-beta.5)

* **NEW: Enhanced Playground Testing** - Added comprehensive Edition product testing to playground
* Added `testEditionProduct` function for testing Edition NFT products specifically
* Enhanced playground to automatically detect and test different product types (Edition, BlindMint)
* Exported `isEditionProduct` type guard from main package exports for better product type detection
* Created comprehensive .env.example file for easier playground configuration
* Updated playground documentation with Edition product examples and output
* Fixed TypeScript error in BlindMintProduct allocation quantity check
* Improved playground test output with proper product-specific icons and formatting
* Updated Edition and BlindMint purchase flows to return structured receipts with parsed token order details and transaction metadata

### October 27, 2025 (0.1.0-beta.4)

* **NEW: Comprehensive Examples Library** - Complete reorganization and expansion of SDK examples
* Added separate example directories for BlindMint and Edition product types
* Created server-side minting bot examples for both BlindMint and Edition products
* Implemented automated minting with retry logic and error handling
* Added monitoring capabilities for auto-minting when products become active
* Included batch minting functionality for airdrops and bulk operations
* Enhanced Edition examples with promo code support and allowlist handling
* Updated all frontend examples to use proper type guards (isEditionProduct, isBlindMintProduct)
* Improved documentation for server-side minting patterns and best practices
* Added environment configuration templates for all examples
* Included TypeScript configurations and package.json for each example type

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
