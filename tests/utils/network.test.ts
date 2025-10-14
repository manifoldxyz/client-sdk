import { describe, it, expect } from 'vitest';

// Mock network utility functions
const getNetworkConfig = (networkId: number) => {
  const configs: Record<number, any> = {
    1: { id: 1, name: 'Ethereum', currency: 'ETH', explorerUrl: 'https://etherscan.io', layer: 'L1', type: 'mainnet', rpcUrl: 'https://mainnet.infura.io/v3/' },
    8453: { id: 8453, name: 'Base', currency: 'ETH', explorerUrl: 'https://basescan.org', layer: 'L2', type: 'mainnet', bridge: { l1NetworkId: 1 }, rpcUrl: 'https://base-mainnet.infura.io/v3/' },
    137: { id: 137, name: 'Polygon', currency: 'MATIC', explorerUrl: 'https://polygonscan.com', layer: 'L2', type: 'mainnet', rpcUrl: 'https://polygon-rpc.com' },
    42161: { id: 42161, name: 'Arbitrum', currency: 'ETH', explorerUrl: 'https://arbiscan.io', layer: 'L2', type: 'mainnet', rpcUrl: 'https://arb1.arbitrum.io/rpc' },
    10: { id: 10, name: 'Optimism', currency: 'ETH', explorerUrl: 'https://optimistic.etherscan.io', layer: 'L2', type: 'mainnet', rpcUrl: 'https://mainnet.optimism.io' },
    5: { id: 5, name: 'Goerli', currency: 'ETH', explorerUrl: 'https://goerli.etherscan.io', type: 'testnet', rpcUrl: 'https://goerli.infura.io/v3/' },
    11155111: { id: 11155111, name: 'Sepolia', currency: 'ETH', explorerUrl: 'https://sepolia.etherscan.io', type: 'testnet', rpcUrl: 'https://sepolia.infura.io/v3/' },
  };
  return configs[networkId];
};

const isNetworkSupported = (networkId: number | string) => {
  const id = typeof networkId === 'string' ? parseInt(networkId, 10) : networkId;
  return getNetworkConfig(id) !== undefined;
};

const getNetworkName = (networkId: number) => {
  const config = getNetworkConfig(networkId);
  return config?.name || 'Unknown Network';
};

describe('Network Utilities', () => {
  describe('getNetworkConfig', () => {
    it('returns config for Ethereum mainnet', () => {
      const config = getNetworkConfig(1);
      
      expect(config).toBeDefined();
      expect(config.id).toBe(1);
      expect(config.name).toBe('Ethereum');
      expect(config.currency).toBe('ETH');
      expect(config.explorerUrl).toContain('etherscan');
    });

    it('returns config for Base', () => {
      const config = getNetworkConfig(8453);
      
      expect(config).toBeDefined();
      expect(config.id).toBe(8453);
      expect(config.name).toBe('Base');
      expect(config.currency).toBe('ETH');
      expect(config.explorerUrl).toContain('basescan');
    });

    it('returns config for Polygon', () => {
      const config = getNetworkConfig(137);
      
      expect(config).toBeDefined();
      expect(config.id).toBe(137);
      expect(config.name).toBe('Polygon');
      expect(config.currency).toBe('MATIC');
      expect(config.explorerUrl).toContain('polygonscan');
    });

    it('returns config for Arbitrum', () => {
      const config = getNetworkConfig(42161);
      
      expect(config).toBeDefined();
      expect(config.id).toBe(42161);
      expect(config.name).toBe('Arbitrum');
      expect(config.currency).toBe('ETH');
      expect(config.explorerUrl).toContain('arbiscan');
    });

    it('returns config for Optimism', () => {
      const config = getNetworkConfig(10);
      
      expect(config).toBeDefined();
      expect(config.id).toBe(10);
      expect(config.name).toBe('Optimism');
      expect(config.currency).toBe('ETH');
      expect(config.explorerUrl).toContain('optimistic.etherscan');
    });

    it('returns undefined for unsupported network', () => {
      const config = getNetworkConfig(999999);
      expect(config).toBeUndefined();
    });

    it('returns config for testnet networks', () => {
      const goerli = getNetworkConfig(5);
      expect(goerli?.name).toBe('Goerli');
      
      const sepolia = getNetworkConfig(11155111);
      expect(sepolia?.name).toBe('Sepolia');
    });
  });

  describe('isNetworkSupported', () => {
    it('returns true for supported networks', () => {
      expect(isNetworkSupported(1)).toBe(true);
      expect(isNetworkSupported(8453)).toBe(true);
      expect(isNetworkSupported(137)).toBe(true);
      expect(isNetworkSupported(42161)).toBe(true);
      expect(isNetworkSupported(10)).toBe(true);
    });

    it('returns false for unsupported networks', () => {
      expect(isNetworkSupported(999999)).toBe(false);
      expect(isNetworkSupported(0)).toBe(false);
      expect(isNetworkSupported(-1)).toBe(false);
    });

    it('handles string network IDs', () => {
      expect(isNetworkSupported('1' as any)).toBe(true);
      expect(isNetworkSupported('8453' as any)).toBe(true);
      expect(isNetworkSupported('999999' as any)).toBe(false);
    });
  });

  describe('getNetworkName', () => {
    it('returns network name for valid ID', () => {
      expect(getNetworkName(1)).toBe('Ethereum');
      expect(getNetworkName(8453)).toBe('Base');
      expect(getNetworkName(137)).toBe('Polygon');
      expect(getNetworkName(42161)).toBe('Arbitrum');
      expect(getNetworkName(10)).toBe('Optimism');
    });

    it('returns Unknown Network for invalid ID', () => {
      expect(getNetworkName(999999)).toBe('Unknown Network');
      expect(getNetworkName(0)).toBe('Unknown Network');
    });
  });

  describe('network configuration details', () => {
    it('includes RPC URLs for each network', () => {
      const networks = [1, 8453, 137, 42161, 10];
      
      networks.forEach(networkId => {
        const config = getNetworkConfig(networkId);
        expect(config?.rpcUrl).toBeDefined();
        expect(config?.rpcUrl).toMatch(/^https?:\/\//);
      });
    });

    it('includes block explorer URLs', () => {
      const networks = [1, 8453, 137, 42161, 10];
      
      networks.forEach(networkId => {
        const config = getNetworkConfig(networkId);
        expect(config?.explorerUrl).toBeDefined();
        expect(config?.explorerUrl).toMatch(/^https?:\/\//);
      });
    });

    it('includes currency symbols', () => {
      expect(getNetworkConfig(1)?.currency).toBe('ETH');
      expect(getNetworkConfig(137)?.currency).toBe('MATIC');
      expect(getNetworkConfig(8453)?.currency).toBe('ETH');
    });

    it('includes chain type information', () => {
      const config = getNetworkConfig(1);
      expect(config?.type).toBe('mainnet');
      
      const testnetConfig = getNetworkConfig(5);
      expect(testnetConfig?.type).toBe('testnet');
    });
  });

  describe('cross-chain configuration', () => {
    it('identifies L1 networks', () => {
      const ethereum = getNetworkConfig(1);
      expect(ethereum?.layer).toBe('L1');
    });

    it('identifies L2 networks', () => {
      const base = getNetworkConfig(8453);
      expect(base?.layer).toBe('L2');
      
      const arbitrum = getNetworkConfig(42161);
      expect(arbitrum?.layer).toBe('L2');
      
      const optimism = getNetworkConfig(10);
      expect(optimism?.layer).toBe('L2');
    });

    it('includes bridge information for L2s', () => {
      const base = getNetworkConfig(8453);
      expect(base?.bridge).toBeDefined();
      expect(base?.bridge?.l1NetworkId).toBe(1);
    });
  });
});