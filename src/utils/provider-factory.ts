import { ethers } from 'ethers';
import type { ProviderConfig, BridgeProviderConfig, PrimaryProviderConfig } from '../types/config';
import type { NetworkId } from '../types/common';
import { getNetworkConfig } from '../config/networks';
import { getNetworkProviderConfig, selectProvider, PROVIDER_FALLBACK_STRATEGIES } from '../config/providers';

/**
 * Provider factory for dual-provider architecture
 * Based on CONTRACT_PATTERNS.md dual-provider implementation
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

export interface ProviderFactoryOptions {
  config: ProviderConfig;
  networkId: NetworkId;
  apiKey?: string;
  customRpcUrls?: Record<NetworkId, string>;
  enableDebug?: boolean;
}

export interface DualProvider {
  primary: ethers.providers.Provider | null;
  bridge: ethers.providers.Provider;
  current: ethers.providers.Provider;
  networkId: NetworkId;
  switchToPrimary(): Promise<boolean>;
  switchToBridge(): void;
  switchToOptimal(operationType: keyof typeof PROVIDER_FALLBACK_STRATEGIES): void;
  isHealthy(provider?: 'primary' | 'bridge'): Promise<boolean>;
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<ethers.BigNumber>;
  estimateGas(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber>;
  call(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string>;
  sendTransaction(signedTransaction: string): Promise<ethers.providers.TransactionResponse>;
  waitForTransaction(hash: string, confirmations?: number): Promise<ethers.providers.TransactionReceipt>;
}

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Create dual provider instance with primary and bridge providers
 */
export function createDualProvider(options: ProviderFactoryOptions): DualProvider {
  const { config, networkId, apiKey, customRpcUrls, enableDebug = false } = options;
  
  const networkConfig = getNetworkConfig(networkId);
  const providerConfig = getNetworkProviderConfig(networkId, config);
  
  // Create bridge provider (always available)
  const bridge = createBridgeProvider(networkId, providerConfig.bridge, apiKey, customRpcUrls);
  
  // Try to create primary provider (may be null if not available)
  const primary = createPrimaryProvider(networkId, providerConfig.primary, customRpcUrls);
  
  // Start with primary if available, otherwise bridge
  let current = primary || bridge;
  
  const dualProvider: DualProvider = {
    primary,
    bridge,
    current,
    networkId,

    async switchToPrimary(): Promise<boolean> {
      if (!this.primary) {
        if (enableDebug) {
          console.log('Cannot switch to primary provider: not available');
        }
        return false;
      }
      
      const isHealthy = await this.isHealthy('primary');
      if (isHealthy) {
        this.current = this.primary;
        if (enableDebug) {
          console.log('Switched to primary provider');
        }
        return true;
      }
      
      if (enableDebug) {
        console.log('Cannot switch to primary provider: unhealthy');
      }
      return false;
    },

    switchToBridge(): void {
      this.current = this.bridge;
      if (enableDebug) {
        console.log('Switched to bridge provider');
      }
    },

    switchToOptimal(operationType: keyof typeof PROVIDER_FALLBACK_STRATEGIES): void {
      const optimalProvider = selectProvider(
        operationType,
        this.networkId,
        this.primary !== null
      );
      
      if (optimalProvider === 'primary' && this.primary) {
        this.current = this.primary;
      } else {
        this.current = this.bridge;
      }
      
      if (enableDebug) {
        console.log(`Switched to ${optimalProvider} provider for ${operationType}`);
      }
    },

    async isHealthy(provider: 'primary' | 'bridge' = 'current'): Promise<boolean> {
      const targetProvider = provider === 'current' ? this.current : 
                           provider === 'primary' ? this.primary : this.bridge;
      
      if (!targetProvider) return false;
      
      try {
        const blockNumber = await Promise.race([
          targetProvider.getBlockNumber(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 2000)
          )
        ]) as number;
        
        return blockNumber > 0;
      } catch (error) {
        if (enableDebug) {
          console.warn(`Provider health check failed:`, error);
        }
        return false;
      }
    },

    async getBlockNumber(): Promise<number> {
      return this.current.getBlockNumber();
    },

    async getBalance(address: string): Promise<ethers.BigNumber> {
      return this.current.getBalance(address);
    },

    async estimateGas(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.BigNumber> {
      // Use optimal provider for gas estimation
      this.switchToOptimal('gasEstimation');
      return this.current.estimateGas(transaction);
    },

    async call(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
      // Use optimal provider for read operations
      this.switchToOptimal('read');
      return this.current.call(transaction);
    },

    async sendTransaction(signedTransaction: string): Promise<ethers.providers.TransactionResponse> {
      // Always use primary for sending transactions
      if (!this.primary) {
        throw new Error('Primary provider required for sending transactions');
      }
      
      this.current = this.primary;
      return this.current.sendTransaction(signedTransaction);
    },

    async waitForTransaction(hash: string, confirmations?: number): Promise<ethers.providers.TransactionReceipt> {
      // Use optimal provider for querying
      this.switchToOptimal('query');
      return this.current.waitForTransaction(hash, confirmations);
    }
  };

  return dualProvider;
}

// =============================================================================
// PROVIDER CREATION FUNCTIONS
// =============================================================================

/**
 * Create primary provider from user's wallet
 */
function createPrimaryProvider(
  networkId: NetworkId,
  config: PrimaryProviderConfig,
  customRpcUrls?: Record<NetworkId, string>
): ethers.providers.Provider | null {
  try {
    // Check for injected provider (MetaMask, etc.)
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    }
    
    // If no injected provider and we have custom RPC, create JSON-RPC provider
    if (customRpcUrls?.[networkId] && !config.required) {
      const networkConfig = getNetworkConfig(networkId);
      return new ethers.providers.JsonRpcProvider(
        customRpcUrls[networkId],
        {
          name: networkConfig.name,
          chainId: networkConfig.chainId
        }
      );
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to create primary provider:', error);
    return null;
  }
}

/**
 * Create bridge provider using Manifold's provider client
 */
function createBridgeProvider(
  networkId: NetworkId,
  config: BridgeProviderConfig,
  apiKey?: string,
  customRpcUrls?: Record<NetworkId, string>
): ethers.providers.Provider {
  const networkConfig = getNetworkConfig(networkId);
  
  // Use custom RPC URL if provided, otherwise use network's primary RPC
  const rpcUrl = customRpcUrls?.[networkId] || networkConfig.rpc.primary;
  
  // Create JSON-RPC provider with network configuration
  const provider = new ethers.providers.JsonRpcProvider(
    rpcUrl,
    {
      name: networkConfig.name,
      chainId: networkConfig.chainId
    }
  );
  
  // Configure timeouts and retry logic
  provider.connection.timeout = config.timeout;
  
  return provider;
}

// =============================================================================
// PROVIDER UTILITIES
// =============================================================================

/**
 * Test provider connectivity and performance
 */
export async function testProviderPerformance(
  provider: ethers.providers.Provider
): Promise<{
  latency: number;
  blockHeight: number;
  isHealthy: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]) as number;
    
    const latency = Date.now() - startTime;
    
    return {
      latency,
      blockHeight: blockNumber,
      isHealthy: latency < 3000 && blockNumber > 0
    };
  } catch (error) {
    return {
      latency: -1,
      blockHeight: -1,
      isHealthy: false
    };
  }
}

/**
 * Get provider network information
 */
export async function getProviderNetwork(
  provider: ethers.providers.Provider
): Promise<{
  chainId: number;
  name: string;
  ensAddress?: string;
}> {
  try {
    const network = await provider.getNetwork();
    return {
      chainId: network.chainId,
      name: network.name,
      ensAddress: network.ensAddress
    };
  } catch (error) {
    throw new Error(`Failed to get provider network: ${error}`);
  }
}

/**
 * Wait for provider to be ready
 */
export async function waitForProviderReady(
  provider: ethers.providers.Provider,
  timeoutMs: number = 10000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      await provider.getBlockNumber();
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return false;
}

/**
 * Check if provider supports specific features
 */
export async function checkProviderFeatures(
  provider: ethers.providers.Provider
): Promise<{
  supportsEIP1559: boolean;
  supportsEIP712: boolean;
  supportsEth_accounts: boolean;
}> {
  const results = {
    supportsEIP1559: false,
    supportsEIP712: false,
    supportsEth_accounts: false
  };
  
  try {
    // Check EIP-1559 support (Type 2 transactions)
    const feeData = await provider.getFeeData();
    results.supportsEIP1559 = feeData.maxFeePerGas !== null;
  } catch (error) {
    // EIP-1559 not supported
  }
  
  try {
    // Check if it's a Web3Provider (has ethereum object)
    if ('ethereum' in provider && provider.ethereum) {
      // Check EIP-712 support (typed data signing)
      results.supportsEIP712 = 'request' in provider.ethereum;
      
      // Check eth_accounts support
      results.supportsEth_accounts = true;
    }
  } catch (error) {
    // Not a Web3Provider
  }
  
  return results;
}

// =============================================================================
// DEVELOPMENT AND TESTING UTILITIES
// =============================================================================

/**
 * Create a mock provider for testing
 */
export function createMockProvider(
  networkId: NetworkId,
  options: {
    blockNumber?: number;
    latency?: number;
    shouldFail?: boolean;
  } = {}
): ethers.providers.Provider {
  const { blockNumber = 1000000, latency = 100, shouldFail = false } = options;
  
  // Create a mock provider that simulates network calls
  const mockProvider = {
    async getBlockNumber(): Promise<number> {
      await new Promise(resolve => setTimeout(resolve, latency));
      if (shouldFail) throw new Error('Mock provider failure');
      return blockNumber;
    },
    
    async getBalance(address: string): Promise<ethers.BigNumber> {
      await new Promise(resolve => setTimeout(resolve, latency));
      if (shouldFail) throw new Error('Mock provider failure');
      return ethers.BigNumber.from('1000000000000000000'); // 1 ETH
    },
    
    async call(transaction: any): Promise<string> {
      await new Promise(resolve => setTimeout(resolve, latency));
      if (shouldFail) throw new Error('Mock provider failure');
      return '0x';
    },
    
    async estimateGas(transaction: any): Promise<ethers.BigNumber> {
      await new Promise(resolve => setTimeout(resolve, latency));
      if (shouldFail) throw new Error('Mock provider failure');
      return ethers.BigNumber.from('21000');
    },
    
    async getNetwork() {
      const networkConfig = getNetworkConfig(networkId);
      return {
        chainId: networkConfig.chainId,
        name: networkConfig.name
      };
    }
  } as any;
  
  return mockProvider;
}

/**
 * Create provider factory for testing
 */
export function createTestProviderFactory(): (networkId: NetworkId) => DualProvider {
  return (networkId: NetworkId) => {
    const config: ProviderConfig = {
      primary: {
        required: false,
        timeout: 1000,
        retries: 0,
        detectWalletConnect: false,
        supportedWallets: []
      },
      bridge: {
        baseUrl: 'http://localhost:3001',
        timeout: 1000,
        retries: 0,
        enabled: true,
        fallbackStrategy: 'immediate'
      },
      networks: {},
      global: {
        defaultTimeout: 1000,
        maxConcurrentOps: 1,
        strictMode: true,
        debugMode: false
      }
    };
    
    return createDualProvider({
      config,
      networkId,
      enableDebug: false
    });
  };
}