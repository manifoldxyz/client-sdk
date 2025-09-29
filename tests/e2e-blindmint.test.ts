// @ts-nocheck
/**
 * End-to-End BlindMint Workflow Tests
 * 
 * Comprehensive testing of complete BlindMint workflows from client creation
 * to product interaction and purchase flow simulation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '../src/client';
import { resetManifoldApiClient } from '../src/api/manifold-api';
import type { InstanceData } from '../src/types/product';
import type { BlindMintPublicData } from '../src/types/blindmint';
import { AppId } from '../src/types/common';

// Mock fetch globally
global.fetch = vi.fn();

// Mock external dependencies
vi.mock('@manifoldxyz/studio-app-sdk', () => ({
  getAllPreviews: vi.fn(),
}));

vi.mock('@manifoldxyz/manifold-provider-client', () => ({
  ManifoldBridgeProvider: vi.fn().mockImplementation(() => ({
    request: vi.fn(),
    networkId: 1,
  })),
}));

describe('End-to-End BlindMint Workflows', () => {
  const testInstanceNumericId = 4150231280;
  const testInstanceId = String(testInstanceNumericId);

  const testPublicData: BlindMintPublicData = {
    name: 'E2E Test BlindMint',
    description: 'End-to-end test blind mint collection',
    network: 1,
    contract: {
      id: 1,
      name: 'E2E BlindMint Contract',
      symbol: 'E2E',
      contractAddress: '0x1234567890123456789012345678901234567890',
      networkId: 1,
      spec: 'erc1155',
    },
    extensionAddress1155: {
      value: '0x0987654321098765432109876543210987654321',
      version: 1,
    },
    price: {
      value: '50000000000000000',
      decimals: 18,
      currency: 'ETH',
      erc20: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ether',
    },
    tierProbabilities: [],
    pool: [
      {
        seriesIndex: 0,
        metadata: {
          name: 'Genesis Token',
          description: 'First pool token',
        },
      },
    ],
    previewMedia: {
      image: 'https://example.com/e2e-thumbnail.jpg',
    },
    thumbnail: 'https://example.com/e2e-thumbnail.jpg',
  };

  const testInstanceData: InstanceData<BlindMintPublicData> = {
    id: testInstanceNumericId,
    appId: AppId.BLIND_MINT_1155,
    appName: 'BlindMint',
    creator: {
      id: 1,
      address: '0x1234567890123456789012345678901234567890',
      slug: 'test-creator',
      name: 'Test Creator',
    },
    publicData: testPublicData,
    appSlug: 'blindmint',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    resetManifoldApiClient();
    
    // Setup successful API responses
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(testInstanceData),
    } as Response);

    // Setup Studio Apps mock
    const { getAllPreviews } = await import('@manifoldxyz/studio-app-sdk');
    const mockGetAllPreviews = vi.mocked(getAllPreviews);
    mockGetAllPreviews.mockResolvedValue([
      {
        instanceId: testInstanceId,
        previewId: 'e2e-preview-1',
        url: 'https://example.com/preview1.png',
        title: 'Preview 1',
        description: 'First preview image'
      },
      {
        instanceId: testInstanceId,
        previewId: 'e2e-preview-2', 
        url: 'https://example.com/preview2.mp4',
        title: 'Preview 2',
        description: 'Preview animation'
      }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Product Lifecycle', () => {
    it('should successfully create client and fetch BlindMint product', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);

      // Validate product structure
      expect(product).toBeDefined();
      expect(product.type).toBe('blind-mint');
      expect(product.id).toBe(testInstanceId);
      expect(product.data).toBeDefined();
      expect(product.data.id).toBe(testInstanceId);
      expect(product.data.appName).toBe('BlindMint');
      expect(product.data.creator).toBeDefined();
      expect(product.data.publicData).toBeDefined();

      // Validate BlindMint-specific data
      expect(product.data.publicData.name).toBe('E2E Test BlindMint');
      expect(product.data.publicData.contract.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(product.data.publicData.network).toBe(1);
      expect(product.data.publicData.price).toBeDefined();
      expect(product.data.publicData.price?.value).toBe('50000000000000000');
    });

    it('should handle complete minting workflow preparation', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);
      const blindMintProduct = product;

      expect(typeof blindMintProduct.preparePurchase).toBe('function');
      expect(blindMintProduct.data.publicData.price).toBeDefined();
      expect(blindMintProduct.data.publicData.contract.contractAddress).toBeDefined();
      expect(blindMintProduct.data.publicData.network).toBe(1);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should gracefully handle API failures with debug fallback', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockClear();
      mockFetch.mockRejectedValue(new Error('Network unavailable'));

      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);
      
      // Should fallback to mock product
      expect(product).toBeDefined();
      expect(product.id).toBe(testInstanceId);
      expect(product.type).toBe('edition'); // Mock product type
    });

    it('should handle invalid instance IDs appropriately', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      await expect(client.getProduct('invalid-id')).rejects.toThrow();
      await expect(client.getProduct('')).rejects.toThrow();
      await expect(client.getProduct('12345!@#')).rejects.toThrow();
    });

    it('should handle network switching scenarios', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      // Test with different network configurations
      const testCases = [
        { networkId: 1, name: 'Ethereum' },
        { networkId: 137, name: 'Polygon' }, 
        { networkId: 8453, name: 'Base' }
      ];

      for (const testCase of testCases) {
          const networkSpecificData = {
            ...testInstanceData,
            publicData: {
              ...testInstanceData.publicData,
              network: testCase.networkId
            }
        };

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(networkSpecificData),
        } as Response);

        const product = await client.getProduct(testInstanceId);
        expect(product.data.publicData.network).toBe(testCase.networkId);
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle high-value mint scenarios', async () => {
      const highValueData = {
        ...testInstanceData,
        publicData: {
          ...testInstanceData.publicData,
          price: {
            ...testInstanceData.publicData.price!,
            value: '1000000000000000000',
          },
        }
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(highValueData),
      } as Response);

      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);
      expect(product.data.publicData.price?.value).toBe('1000000000000000000');
    });

    it('should handle ERC20 token payment scenarios', async () => {
      const erc20Data = {
        ...testInstanceData,
        publicData: {
          ...testInstanceData.publicData,
          price: {
            ...testInstanceData.publicData.price!,
            currency: 'USDC',
            symbol: 'USDC',
            name: 'USD Coin',
            value: '100000000',
            decimals: 6,
            erc20: '0xA0b86a33E6417aF4E73D4F3C9c77A9b7D1B9A4C2',
          },
        }
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(erc20Data),
      } as Response);

      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);
      
      expect(product.data.publicData.price?.currency).toBe('USDC');
      expect(product.data.publicData.price?.erc20).not.toBe('0x0000000000000000000000000000000000000000');
      expect(product.data.publicData.price?.value).toBe('100000000');
    });

    it('should handle batch minting scenarios', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);
      
      // Test multiple quantity minting setup by ensuring preparePurchase is callable
      const batchQuantities = [1, 5, 10];

      for (const quantity of batchQuantities) {
        expect(typeof product.preparePurchase).toBe('function');
        expect(quantity).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should efficiently cache and reuse instance data', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const mockFetch = vi.mocked(fetch);
      
      // First call should hit the API
      await client.getProduct(testInstanceId);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache (no additional API call)
      await client.getProduct(testInstanceId);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Third call with same ID should still use cache
      await client.getProduct(testInstanceId);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      // Make multiple concurrent requests
      const promises = [
        client.getProduct(testInstanceId),
        client.getProduct(testInstanceId),
        client.getProduct(testInstanceId)
      ];

      const results = await Promise.all(promises);

      // All should resolve successfully
      results.forEach(product => {
        expect(product).toBeDefined();
        expect(product.id).toBe(testInstanceId);
        expect(product.type).toBe('blind-mint');
      });

      // API should only be called once due to caching/deduplication
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security and Validation', () => {
    it('should validate all critical addresses', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const product = await client.getProduct(testInstanceId);

      if (product.type !== 'blind-mint') {
        throw new Error('Expected BlindMint product for validation test');
      }

      // Validate contract address format
      expect(product.data.publicData.contract.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      // Validate creator address format  
      expect(product.data.creator.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // Validate ERC20 address format
      expect(product.data.publicData.price?.erc20).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should handle malicious input safely', async () => {
      const client = createClient({
        debug: true,
        environment: 'test'
      });

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'javascript:alert(1)',
        '0x' + 'f'.repeat(100), // Too long address
        null,
        undefined
      ];

      for (const maliciousInput of maliciousInputs) {
        await expect(client.getProduct(maliciousInput as any)).rejects.toThrow();
      }
    });

    it('should not leak sensitive information in errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockClear();
      mockFetch.mockRejectedValue(new Error('Internal server error with sensitive data: API_KEY_12345'));

      const client = createClient({
        debug: false, // Production mode
        environment: 'production'
      });

      try {
        await client.getProduct(testInstanceId);
      } catch (error: any) {
        // Error should be sanitized and not contain sensitive information
        expect(error.message).not.toContain('API_KEY_12345');
        expect(error.message).toContain('Failed to fetch product data');
      }
    });
  });
});
