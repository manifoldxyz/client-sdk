# Dependency Setup Guide

This document outlines the complete dependency and configuration setup for the Manifold Client SDK BlindMint implementation (CON-2729).

## Dependencies Added

### Core Dependencies

#### ethers@5.7.0
- **Purpose**: Ethereum blockchain interaction library
- **Version**: Fixed at 5.7.0 (required for compatibility with existing Manifold infrastructure)
- **Usage**: Provider management, contract interactions, transaction handling
- **Why v5.7.0**: Latest stable v5 release with better stability than v6 for production use

#### @manifoldxyz/manifold-provider-client@^1.0.0
- **Purpose**: Manifold's RPC fallback provider client
- **Usage**: Bridge provider for dual-provider architecture
- **Features**: Automatic failover, rate limiting, network optimization

#### @manifoldxyz/studio-apps-client@^1.0.0
- **Purpose**: Studio Apps API client for preview data
- **Usage**: Fetching BlindMint preview data and configuration
- **Features**: Authentication, caching, error handling

## Configuration Structure

The configuration system is organized into modular components:

```
src/config/
├── index.ts          # Unified configuration exports
├── networks.ts       # Network-specific configurations
├── providers.ts      # Dual-provider setup
├── cache.ts         # On-chain data caching
└── api.ts           # API endpoint configurations
```

### Network Configuration (`src/config/networks.ts`)

Supports these networks:
- **Ethereum Mainnet** (1)
- **Polygon** (137) 
- **Base** (8453)
- **Arbitrum One** (42161)
- **Optimism** (10)

Each network includes:
- Native currency configuration
- RPC endpoints (primary + fallbacks)
- Block explorer integration
- Gas configuration
- Contract addresses
- Network-specific features

### Provider Configuration (`src/config/providers.ts`)

Implements dual-provider architecture:

#### Primary Provider
- User's wallet (MetaMask, WalletConnect, etc.)
- Required for write operations
- Configurable timeouts and retries
- Wallet type detection

#### Bridge Provider  
- Manifold's fallback RPC provider
- Used for read operations and fallback
- Automatic failover strategies
- Rate limiting and health monitoring

#### Provider Selection Strategy
- **Write operations**: Always use primary provider
- **Read operations**: Prefer bridge for speed
- **Gas estimation**: Use fastest available
- **Queries**: Prefer bridge for reliability

### Cache Configuration (`src/config/cache.ts`)

Two-tier caching system:

#### Memory Cache
- Fast in-memory storage
- Configurable TTL by data type
- LRU eviction strategy
- Network-specific timing adjustments

#### Persistent Cache
- Browser localStorage/indexedDB
- Long-term storage for metadata
- Automatic cleanup
- Environment-specific behavior

#### Cache Data Types
- `onchain-data`: Contract state (60s TTL)
- `metadata`: Token metadata (1hr TTL)  
- `pricing`: Gas and token prices (30s TTL)
- `allocation`: User allocations (5min TTL)
- `gas-estimates`: Gas estimates (60s TTL)

### API Configuration (`src/config/api.ts`)

External service integration:

#### Manifold Services
- Main API endpoints
- Studio Apps client
- Authentication handling
- Request/response transformation

#### External Services
- IPFS/Arweave gateways
- Price feeds (CoinGecko)
- Gas estimation services
- Block explorers

## Utility Factories

### Provider Factory (`src/utils/provider-factory.ts`)

Creates dual-provider instances with:
- Automatic provider detection
- Health monitoring
- Optimal provider selection
- Failover handling
- Performance testing

```typescript
import { createDualProvider } from './utils/provider-factory';

const provider = createDualProvider({
  config: providerConfig,
  networkId: 1,
  apiKey: 'your-api-key',
  enableDebug: true
});
```

### Contract Factory (`src/utils/contract-factory.ts`)

Provides contract instances for:
- BlindMint claim extensions
- Creator (ERC721) contracts  
- ERC20 token contracts
- Well-known contract addresses

```typescript
import { ContractFactory } from './utils/contract-factory';

const factory = new ContractFactory({
  provider: dualProvider,
  networkId: 1,
  signer: userSigner
});

const blindMintContract = factory.createBlindMintContract(contractAddress);
```

## Build Configuration

Updated `vite.config.ts` with:

### External Dependencies
- `ethers` marked as external (not bundled)
- Manifold packages marked as external
- Proper tree-shaking support

### Build Optimizations
- ES2020 target for modern features
- Source maps enabled
- Type declarations generated
- Global constants for development

### Bundle Structure
- ESM and CJS formats supported
- External dependency resolution
- Optimized for library consumption

## Environment Configurations

### Development
- Local API endpoints
- Shorter timeouts
- Debug logging enabled
- Mock provider support
- Relaxed validation

### Production  
- Production API endpoints
- Longer timeouts for stability
- Aggressive caching
- Strict validation
- Error reporting

### Testing
- Mock endpoints
- Immediate timeouts
- No persistent cache
- Deterministic behavior
- No external API calls

## Usage Examples

### Basic Setup

```typescript
import { createSDKConfig } from './config';
import { createDualProvider } from './utils/provider-factory';
import { ContractFactory } from './utils/contract-factory';

// Create environment-appropriate configuration
const config = createSDKConfig({
  environment: 'production',
  networkId: 1,
  apiKey: process.env.MANIFOLD_API_KEY,
  enableDebug: false
});

// Create provider
const provider = createDualProvider({
  config: config.provider,
  networkId: 1,
  apiKey: config.api.auth.apiKey
});

// Create contract factory
const contractFactory = new ContractFactory({
  provider,
  networkId: 1,
  enableDebug: config.debug
});
```

### Network-Specific Configuration

```typescript
import { getNetworkConfig, getNetworkProviderConfig } from './config';

// Get configuration for specific network
const networkConfig = getNetworkConfig(137); // Polygon
const providerConfig = getNetworkProviderConfig(137, baseProviderConfig);

console.log(`Network: ${networkConfig.name}`);
console.log(`Native Currency: ${networkConfig.nativeCurrency.symbol}`);
console.log(`Block Explorer: ${networkConfig.explorer.baseUrl}`);
```

### Cache Management

```typescript
import { 
  createCacheConfig, 
  generateCacheKey,
  shouldCacheData 
} from './config';

const cacheConfig = createCacheConfig({
  environment: 'production',
  aggressiveCaching: true,
  maxMemoryMB: 100
});

const cacheKey = generateCacheKey(
  cacheConfig.keyGeneration,
  'onchain-data',
  'blindmint-config-123',
  1 // networkId
);

const shouldCache = shouldCacheData(
  'metadata',
  1,
  1024 * 1024, // 1MB data
  cacheConfig.memory.maxSizeMB
);
```

## Integration Points

### Backend Engineer Agent
- Provider and contract factories ready
- Network configurations available
- Gas estimation utilities
- Transaction handling patterns

### Blockchain Agent  
- Network-specific gas configurations
- Contract address mappings
- Provider health monitoring
- Block explorer integration

### API Integration Agent
- API client configurations
- Authentication patterns
- Error handling strategies
- Request/response transformation

### Testing Agents
- Mock provider factory
- Test configurations
- Deterministic behavior
- Isolated test environments

## Development Guidelines

### Adding New Networks

1. Update `NETWORK_CONFIGS` in `networks.ts`
2. Add RPC endpoints and explorer URLs
3. Configure gas settings for the network
4. Add contract addresses if available
5. Test provider connectivity

### Modifying Cache Behavior

1. Update TTL values in `cache.ts`
2. Adjust memory limits if needed
3. Consider network-specific timing
4. Test cache invalidation
5. Monitor memory usage

### Adding External Services

1. Add endpoint to `api.ts`
2. Configure authentication if needed
3. Set appropriate timeouts
4. Add error handling patterns
5. Document API limits

## Security Considerations

### API Keys
- Store securely (environment variables)
- Rotate regularly
- Use different keys per environment
- Monitor usage and limits

### Provider Security
- Validate all contract addresses
- Check transaction parameters
- Implement gas limits
- Monitor for MEV protection

### Data Validation
- Validate all external API responses
- Sanitize user inputs
- Check smart contract return values
- Implement proper error boundaries

## Monitoring and Debugging

### Debug Mode
- Enable with `enableDebug: true`
- Logs provider switches
- Shows cache operations
- Traces API requests
- Reports performance metrics

### Health Monitoring
- Provider connectivity checks
- Cache hit rates
- API response times
- Error frequencies
- Network-specific metrics

## Troubleshooting

### Common Issues

#### Provider Connection Failures
- Check network connectivity
- Verify RPC endpoints
- Test provider health
- Check rate limits

#### Cache Issues
- Clear persistent cache
- Check memory limits
- Verify TTL settings
- Monitor invalidation rules

#### API Failures
- Verify API keys
- Check endpoint URLs
- Review request limits
- Test authentication

#### Build Issues
- Verify external dependencies
- Check TypeScript config
- Review bundle size
- Test tree shaking

## Next Steps

This dependency setup enables:

1. **Backend Implementation**: Full provider and contract support
2. **Blockchain Integration**: Network-specific optimizations
3. **API Integration**: Complete service configurations  
4. **Testing Setup**: Isolated test environments
5. **Performance Optimization**: Caching and provider strategies

The configuration system is designed to be:
- **Modular**: Easy to extend and modify
- **Environment-aware**: Adapts to dev/prod/test
- **Network-agnostic**: Supports multiple chains
- **Performance-focused**: Optimized for speed and reliability

All subsequent agents can now build upon this foundation with complete dependency and configuration support.