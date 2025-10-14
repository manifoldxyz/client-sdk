# Manifold Client SDK Test Suite

## Overview

This comprehensive test suite covers all major components of the Manifold Client SDK, ensuring reliability and correctness across the entire codebase.

## Test Coverage

### 1. **Client Tests** (`client.test.ts`)
- Client initialization and configuration
- Product fetching and parsing
- Instance ID validation
- Product type detection
- Workspace product retrieval

### 2. **Adapter Tests**

#### Ethers5 Adapter (`adapters/ethers5-adapter.test.ts`)
- Address retrieval from signer
- Chain ID detection
- Transaction sending and confirmation
- Transaction receipt waiting
- Error handling for network operations

#### Viem Adapter (`adapters/viem-adapter.test.ts`)
- Wallet client integration
- Public client transaction monitoring
- Network switching capabilities
- Transaction status tracking
- Error handling for disconnected accounts

### 3. **API Client Tests**

#### Manifold API (`api/manifold-api.test.ts`)
- Complete instance data fetching
- Product workspace queries
- Allocation checking
- Purchase simulation
- On-chain data retrieval
- Error handling (404s, rate limiting, network errors)

#### Coinbase API (`api/coinbase.test.ts`)
- Price fetching for multiple currencies
- Currency pair handling
- Error recovery
- Response caching behavior
- Decimal precision handling

### 4. **Product Type Tests**

#### Edition Product (`products/edition.test.ts`)
- Allocation eligibility checking
- Purchase preparation and simulation
- Transaction execution
- Product status tracking
- Metadata retrieval
- Inventory management
- Rules and restrictions
- On-chain data fetching

#### Burn/Redeem Product (`products/burn-redeem.test.ts`)
- Burn requirements validation
- Token eligibility checking
- Burn-redeem transaction preparation
- Multiple token burning
- Redeemable token queries
- Transaction execution
- On-chain data synchronization

#### Blind Mint Product (`products/blindmint.test.ts`)
- Random minting preparation
- Reveal time handling
- Purchase flow
- Status tracking

### 5. **Utility Tests**

#### Network Utilities (`utils/network.test.ts`)
- Network configuration retrieval
- Supported network validation
- Network name resolution
- L1/L2 identification
- Bridge information
- RPC URL management
- Block explorer URLs

#### Contract Factory (`utils/contract-factory.test.ts`)
- Contract instance creation
- ABI parsing and validation
- Address format validation
- View function calls
- Gas estimation
- ERC20/721/1155 interfaces
- Error handling

#### Gas Estimation (`utils/gas-estimation.test.ts`)
- Dynamic gas estimation
- Fallback gas values
- Method-specific gas limits
- Error recovery

#### Provider Factory (`utils/provider-factory.test.ts`)
- Provider creation for different networks
- Bridge provider usage
- RPC URL configuration

#### Validation (`utils/validation.test.ts`)
- Instance ID validation
- Input sanitization
- Parameter validation

### 6. **Type Tests**

#### Error Handling (`types/errors.test.ts`)
- Custom error creation
- Error codes and categorization
- Error details and metadata
- Stack trace preservation
- Error serialization
- Recovery suggestions
- Helper functions for error management

#### Money Library (`libs/money.test.ts`)
- Currency arithmetic operations
- Native vs ERC20 token handling
- Value comparisons
- Display formatting
- Object serialization
- Type guards

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test tests/products/edition.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with verbose output
npm test -- --reporter=verbose
```

## Test Organization

Tests are organized to mirror the source code structure:
- `/tests/adapters/` - Wallet adapter tests
- `/tests/api/` - External API client tests
- `/tests/products/` - Product implementation tests
- `/tests/types/` - Type system and error tests
- `/tests/utils/` - Utility function tests
- `/tests/libs/` - Library tests

## Mocking Strategy

The test suite uses Vitest's mocking capabilities to:
- Mock external dependencies (network calls, blockchain interactions)
- Isolate components for unit testing
- Simulate error conditions
- Control async behavior

## Coverage Goals

The test suite aims for:
- ✅ 100% coverage of public API methods
- ✅ All error paths tested
- ✅ Edge cases and boundary conditions
- ✅ Integration scenarios between components
- ✅ Type safety verification

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all edge cases are covered
3. Mock external dependencies
4. Follow existing test patterns
5. Run full test suite before committing

## Test Utilities

Common test utilities and mocks are available:
- Mock providers for blockchain interaction
- Mock API responses
- Test data factories
- Error simulation helpers