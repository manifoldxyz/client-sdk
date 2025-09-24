import type { NetworkConfig, CurrencyConfig, RpcConfig, ExplorerConfig, GasConfig, ContractAddresses, NetworkFeatures } from '../types/config';
import type { NetworkId } from '../types/common';
import { DEFAULT_GAS_CONFIG } from '../types/config';

/**
 * Network configuration for BlindMint operations
 * Based on CONTRACT_PATTERNS.md analysis and gachapon-widgets patterns
 */

// =============================================================================
// CURRENCY CONFIGURATIONS
// =============================================================================

const ETHEREUM_CURRENCY: CurrencyConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://assets.manifold.xyz/currencies/eth.svg'
};

const POLYGON_CURRENCY: CurrencyConfig = {
  symbol: 'MATIC',
  name: 'Polygon',
  decimals: 18,
  iconUrl: 'https://assets.manifold.xyz/currencies/matic.svg'
};

const BASE_CURRENCY: CurrencyConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://assets.manifold.xyz/currencies/eth.svg'
};

const ARBITRUM_CURRENCY: CurrencyConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://assets.manifold.xyz/currencies/eth.svg'
};

const OPTIMISM_CURRENCY: CurrencyConfig = {
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://assets.manifold.xyz/currencies/eth.svg'
};

// =============================================================================
// RPC CONFIGURATIONS
// =============================================================================

const createRpcConfig = (primary: string, fallbacks: string[] = []): RpcConfig => ({
  primary,
  fallbacks,
  timeout: 5000,
  maxRetries: 3,
  rateLimit: {
    requestsPerSecond: 10,
    burstLimit: 20,
    backoffStrategy: 'exponential'
  }
});

// =============================================================================
// EXPLORER CONFIGURATIONS
// =============================================================================

const ETHEREUM_EXPLORER: ExplorerConfig = {
  baseUrl: 'https://etherscan.io',
  txUrlTemplate: 'https://etherscan.io/tx/{hash}',
  addressUrlTemplate: 'https://etherscan.io/address/{address}',
  blockUrlTemplate: 'https://etherscan.io/block/{block}',
  apiEndpoint: 'https://api.etherscan.io/api'
};

const POLYGON_EXPLORER: ExplorerConfig = {
  baseUrl: 'https://polygonscan.com',
  txUrlTemplate: 'https://polygonscan.com/tx/{hash}',
  addressUrlTemplate: 'https://polygonscan.com/address/{address}',
  blockUrlTemplate: 'https://polygonscan.com/block/{block}',
  apiEndpoint: 'https://api.polygonscan.com/api'
};

const BASE_EXPLORER: ExplorerConfig = {
  baseUrl: 'https://basescan.org',
  txUrlTemplate: 'https://basescan.org/tx/{hash}',
  addressUrlTemplate: 'https://basescan.org/address/{address}',
  blockUrlTemplate: 'https://basescan.org/block/{block}',
  apiEndpoint: 'https://api.basescan.org/api'
};

const ARBITRUM_EXPLORER: ExplorerConfig = {
  baseUrl: 'https://arbiscan.io',
  txUrlTemplate: 'https://arbiscan.io/tx/{hash}',
  addressUrlTemplate: 'https://arbiscan.io/address/{address}',
  blockUrlTemplate: 'https://arbiscan.io/block/{block}',
  apiEndpoint: 'https://api.arbiscan.io/api'
};

const OPTIMISM_EXPLORER: ExplorerConfig = {
  baseUrl: 'https://optimistic.etherscan.io',
  txUrlTemplate: 'https://optimistic.etherscan.io/tx/{hash}',
  addressUrlTemplate: 'https://optimistic.etherscan.io/address/{address}',
  blockUrlTemplate: 'https://optimistic.etherscan.io/block/{block}',
  apiEndpoint: 'https://api-optimistic.etherscan.io/api'
};

// =============================================================================
// GAS CONFIGURATIONS BY NETWORK
// =============================================================================

const ETHEREUM_GAS_CONFIG: GasConfig = {
  ...DEFAULT_GAS_CONFIG,
  limits: {
    ...DEFAULT_GAS_CONFIG.limits,
    mint: 250000, // Higher for Ethereum due to complex operations
  },
  pricing: {
    ...DEFAULT_GAS_CONFIG.pricing,
    bounds: {
      min: 15,
      max: 200,
      default: 30,
    }
  },
  fees: {
    ...DEFAULT_GAS_CONFIG.fees,
    platformFeePerMint: BigInt('690000000000000'), // 0.00069 ETH
    networkAdjustments: { 1: 1.0 }
  }
};

const POLYGON_GAS_CONFIG: GasConfig = {
  ...DEFAULT_GAS_CONFIG,
  limits: {
    ...DEFAULT_GAS_CONFIG.limits,
    mint: 200000,
  },
  pricing: {
    ...DEFAULT_GAS_CONFIG.pricing,
    bounds: {
      min: 30,
      max: 1000,
      default: 50,
    }
  },
  fees: {
    ...DEFAULT_GAS_CONFIG.fees,
    platformFeePerMint: BigInt('1000000000000000000'), // 1 MATIC
    networkAdjustments: { 137: 0.1 }
  }
};

const L2_GAS_CONFIG: GasConfig = {
  ...DEFAULT_GAS_CONFIG,
  limits: {
    ...DEFAULT_GAS_CONFIG.limits,
    mint: 150000, // Lower for L2s
  },
  pricing: {
    ...DEFAULT_GAS_CONFIG.pricing,
    bounds: {
      min: 0.001,
      max: 10,
      default: 0.001,
    }
  },
  fees: {
    ...DEFAULT_GAS_CONFIG.fees,
    platformFeePerMint: BigInt('100000000000000'), // 0.0001 ETH
    networkAdjustments: {} // Will be set per L2
  }
};

// =============================================================================
// CONTRACT ADDRESSES BY NETWORK
// =============================================================================

const ETHEREUM_CONTRACTS: ContractAddresses = {
  creatorFactory: '0x...',
  claimExtensions: {
    blindMint: '0x...',
    gacha: '0x...'
  },
  erc20Tokens: {
    usdc: '0xa0b86a33e6441ecc6db8db11a83a4a157a2c9c95',
    usdt: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
  },
  marketplaces: {
    opensea: '0x00000000006c3852cbef3e08e8df289169ede581',
    manifold: '0x...'
  }
};

const POLYGON_CONTRACTS: ContractAddresses = {
  creatorFactory: '0x...',
  claimExtensions: {
    blindMint: '0x...',
    gacha: '0x...'
  },
  erc20Tokens: {
    usdc: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    usdt: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    wmatic: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
  },
  marketplaces: {
    opensea: '0x00000000006c3852cbef3e08e8df289169ede581',
    manifold: '0x...'
  }
};

// =============================================================================
// NETWORK FEATURES
// =============================================================================

const ETHEREUM_FEATURES: NetworkFeatures = {
  supportsEIP1559: true,
  useFlashbots: true,
  isLayer2: false,
  supportedTokens: ['ERC20', 'ERC721', 'ERC1155'],
  bridges: []
};

const POLYGON_FEATURES: NetworkFeatures = {
  supportsEIP1559: true,
  useFlashbots: false,
  isLayer2: true,
  supportedTokens: ['ERC20', 'ERC721', 'ERC1155'],
  bridges: [
    {
      name: 'Polygon Bridge',
      address: '0x...',
      supportedNetworks: [1, 137],
      feePercentage: 0.001
    }
  ]
};

const L2_FEATURES: NetworkFeatures = {
  supportsEIP1559: true,
  useFlashbots: false,
  isLayer2: true,
  supportedTokens: ['ERC20', 'ERC721', 'ERC1155'],
  bridges: []
};

// =============================================================================
// NETWORK CONFIGURATIONS
// =============================================================================

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  // Ethereum Mainnet
  1: {
    networkId: 1,
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: ETHEREUM_CURRENCY,
    rpc: createRpcConfig(
      'https://rpc.manifold.xyz/ethereum',
      [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com'
      ]
    ),
    explorer: ETHEREUM_EXPLORER,
    gas: ETHEREUM_GAS_CONFIG,
    contracts: ETHEREUM_CONTRACTS,
    features: ETHEREUM_FEATURES
  },

  // Polygon
  137: {
    networkId: 137,
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: POLYGON_CURRENCY,
    rpc: createRpcConfig(
      'https://rpc.manifold.xyz/polygon',
      [
        'https://polygon.llamarpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon-rpc.com'
      ]
    ),
    explorer: POLYGON_EXPLORER,
    gas: POLYGON_GAS_CONFIG,
    contracts: POLYGON_CONTRACTS,
    features: POLYGON_FEATURES
  },

  // Base
  8453: {
    networkId: 8453,
    chainId: 8453,
    name: 'Base',
    nativeCurrency: BASE_CURRENCY,
    rpc: createRpcConfig(
      'https://rpc.manifold.xyz/base',
      [
        'https://base.llamarpc.com',
        'https://mainnet.base.org',
        'https://base.publicnode.com'
      ]
    ),
    explorer: BASE_EXPLORER,
    gas: {
      ...L2_GAS_CONFIG,
      fees: {
        ...L2_GAS_CONFIG.fees,
        networkAdjustments: { 8453: 0.01 }
      }
    },
    contracts: {
      ...POLYGON_CONTRACTS, // Base uses similar contract setup
    },
    features: L2_FEATURES
  },

  // Arbitrum One
  42161: {
    networkId: 42161,
    chainId: 42161,
    name: 'Arbitrum One',
    nativeCurrency: ARBITRUM_CURRENCY,
    rpc: createRpcConfig(
      'https://rpc.manifold.xyz/arbitrum',
      [
        'https://arbitrum.llamarpc.com',
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-one.publicnode.com'
      ]
    ),
    explorer: ARBITRUM_EXPLORER,
    gas: {
      ...L2_GAS_CONFIG,
      fees: {
        ...L2_GAS_CONFIG.fees,
        networkAdjustments: { 42161: 0.01 }
      }
    },
    contracts: {
      ...POLYGON_CONTRACTS, // Arbitrum uses similar contract setup
    },
    features: L2_FEATURES
  },

  // Optimism
  10: {
    networkId: 10,
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: OPTIMISM_CURRENCY,
    rpc: createRpcConfig(
      'https://rpc.manifold.xyz/optimism',
      [
        'https://optimism.llamarpc.com',
        'https://mainnet.optimism.io',
        'https://optimism.publicnode.com'
      ]
    ),
    explorer: OPTIMISM_EXPLORER,
    gas: {
      ...L2_GAS_CONFIG,
      fees: {
        ...L2_GAS_CONFIG.fees,
        networkAdjustments: { 10: 0.01 }
      }
    },
    contracts: {
      ...POLYGON_CONTRACTS, // Optimism uses similar contract setup
    },
    features: L2_FEATURES
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get network configuration by network ID
 */
export function getNetworkConfig(networkId: NetworkId): NetworkConfig {
  const config = NETWORK_CONFIGS[networkId];
  if (!config) {
    throw new Error(`Network configuration not found for network ID: ${networkId}`);
  }
  return config;
}

/**
 * Get all supported network IDs
 */
export function getSupportedNetworks(): NetworkId[] {
  return Object.keys(NETWORK_CONFIGS).map(Number) as NetworkId[];
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(networkId: NetworkId): boolean {
  return networkId in NETWORK_CONFIGS;
}

/**
 * Get network name by ID
 */
export function getNetworkName(networkId: NetworkId): string {
  const config = NETWORK_CONFIGS[networkId];
  return config?.name ?? `Unknown Network (${networkId})`;
}

/**
 * Get mainnet equivalent for testnet (for development)
 */
export function getMainnetEquivalent(networkId: NetworkId): NetworkId {
  // Mapping testnet IDs to mainnet equivalents
  const testnetToMainnet: Record<number, NetworkId> = {
    5: 1,    // Goerli -> Ethereum
    80001: 137, // Mumbai -> Polygon
    84531: 8453, // Base Goerli -> Base
    421613: 42161, // Arbitrum Goerli -> Arbitrum
    420: 10  // Optimism Goerli -> Optimism
  };
  
  return testnetToMainnet[networkId] ?? networkId;
}