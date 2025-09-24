import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createManifoldApiClient, getManifoldApiClient, resetManifoldApiClient } from '../src/api/manifold-api';
import { StudioAppsClient } from '../src/stubs/studio-apps-client';
import { createManifoldProvider, ManifoldBridgeProvider } from '../src/stubs/manifold-provider-client';
import { createClient } from '../src/client';
import { createApiConfig, TEST_API_CONFIG } from '../src/config/api';
import { ClientSDKError, ErrorCode } from '../src/types/errors';
import type { InstanceData, PreviewData } from '../src/types/product';
import type { NetworkId } from '../src/types/common';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the @manifoldxyz/studio-app-sdk getAllPreviews function
vi.mock('@manifoldxyz/studio-app-sdk', () => ({
  getAllPreviews: vi.fn(),
}));

// Mock the @manifoldxyz/manifold-provider-client
vi.mock('@manifoldxyz/manifold-provider-client', () => ({
  ManifoldBridgeProvider: vi.fn().mockImplementation(() => {
    const mockInstance = {
      request: vi.fn(),
      networkId: 1,
    };
    return mockInstance;
  }),
}));

describe('API Integration Tests', () => {
  const mockInstanceId = '123456789'; // Use numeric format as expected by validateInstanceId
  const mockInstanceData: InstanceData = {
    id: mockInstanceId,
    appId: 3,
    appName: 'BlindMint',
    creator: {
      name: 'Test Creator',
      address: '0x1234567890123456789012345678901234567890',
    },
    publicData: {
      title: 'Test BlindMint',
      description: 'A test blind mint collection',
      contract: '0x1234567890123456789012345678901234567890',
      network: 1,
      thumbnail: 'https://example.com/thumbnail.jpg',
      mintPrice: {
        value: 100000000000000000n, // 0.1 ETH in wei
        currency: 'ETH',
        erc20: '0x0000000000000000000000000000000000000000',
      },
      pool: [],
    },
  };

  const mockPreviewData: PreviewData = {
    title: 'Test BlindMint Enhanced',
    description: 'Enhanced description from Studio Apps',
    contract: '0x1234567890123456789012345678901234567890',
    thumbnail: 'https://example.com/enhanced-thumbnail.jpg',
    network: 1,
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    animations: ['https://example.com/animation1.mp4'],
    metadata: { enhanced: true },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetManifoldApiClient();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Manifold API Client', () => {
    it('should create API client with proper configuration', () => {
      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      expect(client).toBeDefined();
      expect(typeof client.getInstanceData).toBe('function');
    });

    it('should fetch instance data successfully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInstanceData),
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      const result = await client.getInstanceData(mockInstanceId);
      
      expect(result).toEqual(mockInstanceData);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://apps.api.manifoldxyz.dev/public/instance/data?id=${mockInstanceId}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      await expect(client.getInstanceData(mockInstanceId)).rejects.toThrow(
        ClientSDKError
      );
      await expect(client.getInstanceData(mockInstanceId)).rejects.toThrow(
        'API resource not found'
      );
    }, 10000); // Increase timeout to 10 seconds

    it('should retry failed requests with exponential backoff', async () => {
      const mockFetch = vi.mocked(fetch);
      
      // First two attempts fail with network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Third attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInstanceData),
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      const result = await client.getInstanceData(mockInstanceId);
      
      expect(result).toEqual(mockInstanceData);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should validate instance data structure', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: 'data' }),
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      await expect(client.getInstanceData(mockInstanceId)).rejects.toThrow(
        'Invalid instance data: missing or invalid id'
      );
    });

    it('should use singleton pattern correctly', () => {
      const config = createApiConfig({ environment: 'test' });
      const client1 = getManifoldApiClient(config, true);
      const client2 = getManifoldApiClient(config, true);
      
      expect(client1).toBe(client2);
    });
  });

  describe('Studio Apps Client', () => {
    it('should create Studio Apps client with proper configuration', () => {
      const client = new StudioAppsClient({
        debug: true,
        timeout: 5000,
      });
      
      expect(client).toBeDefined();
      expect(typeof client.getPreviewData).toBe('function');
    });

    it('should fetch and filter preview data by instanceId', async () => {
      const { getAllPreviews } = await import('@manifoldxyz/studio-app-sdk');
      const mockGetAllPreviews = vi.mocked(getAllPreviews);
      
      // Mock getAllPreviews to return an array with our test data
      mockGetAllPreviews.mockResolvedValueOnce([
        { id: 'other-instance', title: 'Other Instance' },
        { id: mockInstanceId, ...mockPreviewData },
        { id: 'another-instance', title: 'Another Instance' },
      ]);

      const client = new StudioAppsClient({ debug: true });
      const result = await client.getPreviewData(mockInstanceId);
      
      expect(result).toEqual(expect.objectContaining({
        title: mockPreviewData.title,
        description: mockPreviewData.description,
        images: mockPreviewData.images,
        animations: mockPreviewData.animations,
      }));
      expect(mockGetAllPreviews).toHaveBeenCalledOnce();
    });

    it('should return null when no preview data found', async () => {
      const { getAllPreviews } = await import('@manifoldxyz/studio-app-sdk');
      const mockGetAllPreviews = vi.mocked(getAllPreviews);
      
      mockGetAllPreviews.mockResolvedValueOnce([
        { id: 'other-instance', title: 'Other Instance' },
      ]);

      const client = new StudioAppsClient({ debug: true });
      const result = await client.getPreviewData(mockInstanceId);
      
      expect(result).toBeNull();
    });

    it('should handle invalid responses from getAllPreviews', async () => {
      const { getAllPreviews } = await import('@manifoldxyz/studio-app-sdk');
      const mockGetAllPreviews = vi.mocked(getAllPreviews);
      
      mockGetAllPreviews.mockResolvedValueOnce('not an array' as any);

      const client = new StudioAppsClient({ debug: true });
      
      await expect(client.getPreviewData(mockInstanceId)).rejects.toThrow(
        'Invalid response from getAllPreviews: expected array'
      );
    });

    it('should validate instance ID input', async () => {
      const client = new StudioAppsClient({ debug: true });
      
      await expect(client.getPreviewData('')).rejects.toThrow(
        'Instance ID is required and must be a non-empty string'
      );
      await expect(client.getPreviewData(null as any)).rejects.toThrow(
        'Instance ID is required and must be a non-empty string'
      );
    });
  });

  describe('Manifold Provider Client', () => {
    it('should create Manifold provider with proper network configuration', () => {
      const networkId: NetworkId = 1;
      const provider = createManifoldProvider(networkId, { debug: true });
      
      expect(provider).toBeDefined();
      expect(provider.isReady()).toBe(true);
      expect(typeof provider.request).toBe('function');
    });

    it('should initialize ManifoldBridgeProvider correctly', () => {
      const networkId: NetworkId = 1;
      const provider = createManifoldProvider(networkId, { debug: true });
      const bridgeProvider = provider.getBridgeProvider();
      
      expect(bridgeProvider).toBeDefined();
      expect(ManifoldBridgeProvider).toHaveBeenCalledWith(networkId);
    });

    it('should handle RPC requests through bridge provider', async () => {
      const networkId: NetworkId = 1;
      const provider = createManifoldProvider(networkId, { debug: true });
      const bridgeProvider = provider.getBridgeProvider();
      
      const mockResult = { blockNumber: '0x123456' };
      const mockRequest = vi.fn().mockResolvedValueOnce(mockResult);
      bridgeProvider.request = mockRequest;
      
      const result = await provider.request('eth_blockNumber', []);
      
      expect(result).toEqual(mockResult);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'eth_blockNumber',
        params: [],
      });
    });

    it('should validate RPC method and params', async () => {
      const networkId: NetworkId = 1;
      const provider = createManifoldProvider(networkId, { debug: true });
      
      await expect(provider.request('', [])).rejects.toThrow(
        'RPC method is required and must be a string'
      );
      await expect(provider.request('eth_blockNumber', 'not-array' as any)).rejects.toThrow(
        'RPC params must be an array'
      );
    });

    it('should handle RPC errors gracefully', async () => {
      const networkId: NetworkId = 1;
      const provider = createManifoldProvider(networkId, { debug: true });
      const bridgeProvider = provider.getBridgeProvider();
      
      const mockRequest = vi.fn().mockRejectedValueOnce(new Error('RPC error'));
      bridgeProvider.request = mockRequest;
      
      await expect(provider.request('eth_blockNumber', [])).rejects.toThrow(
        ClientSDKError
      );
      await expect(provider.request('eth_blockNumber', [])).rejects.toThrow(
        'RPC request failed for method eth_blockNumber'
      );
    });
  });

  describe('End-to-End Integration', () => {
    it('should create client and fetch product with real API integration', async () => {
      // Mock the Manifold API
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInstanceData),
      } as Response);

      // Mock the Studio Apps SDK
      const { getAllPreviews } = await import('@manifoldxyz/studio-app-sdk');
      const mockGetAllPreviews = vi.mocked(getAllPreviews);
      mockGetAllPreviews.mockResolvedValueOnce([
        { id: mockInstanceId, ...mockPreviewData },
      ]);

      const client = createClient({
        debug: true,
        environment: 'test',
        includeOnchainData: false,
      });
      
      const product = await client.getProduct(mockInstanceId);
      
      expect(product).toBeDefined();
      expect(product.type).toBe('blind-mint');
      expect(product.id).toBe(mockInstanceId);
      expect(product.data.appName).toBe('BlindMint');
      
      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`id=${mockInstanceId}`),
        expect.any(Object)
      );
    });

    it('should fallback to mock product when API fails in debug mode', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const client = createClient({
        debug: true,
        environment: 'test',
      });
      
      const product = await client.getProduct(mockInstanceId);
      
      expect(product).toBeDefined();
      expect(product.type).toBe('mock');
      expect(product.id).toBe(mockInstanceId);
    });

    it('should throw error when API fails in production mode', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('API unavailable'));

      const client = createClient({
        debug: false,
        environment: 'production',
      });
      
      await expect(client.getProduct(mockInstanceId)).rejects.toThrow(
        ClientSDKError
      );
      await expect(client.getProduct(mockInstanceId)).rejects.toThrow(
        'Failed to fetch product data'
      );
    });

    it('should handle invalid instance ID format', async () => {
      const client = createClient({ debug: true });
      
      await expect(client.getProduct('')).rejects.toThrow(
        'Invalid instance ID format'
      );
      await expect(client.getProduct('invalid-format!')).rejects.toThrow(
        'Invalid instance ID format'
      );
    });

    it('should parse Manifold URLs correctly', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInstanceData),
      } as Response);

      const client = createClient({ debug: true, environment: 'test' });
      const manifestUrl = `https://manifold.xyz/@test-creator/id/${mockInstanceId}`;
      
      const product = await client.getProduct(manifestUrl);
      
      expect(product).toBeDefined();
      expect(product.id).toBe(mockInstanceId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`id=${mockInstanceId}`),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          // Mock fetch that takes too long and gets aborted
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockInstanceData),
          } as Response), 2000);
        });
      });

      // Create config with very short timeout for testing
      const config = createApiConfig({ environment: 'test' });
      config.requests!.timeout = 100; // 100ms timeout
      config.requests!.maxRetries = 0; // No retries to speed up test
      
      const client = createManifoldApiClient(config, true);
      
      await expect(client.getInstanceData(mockInstanceId)).rejects.toThrow(
        ClientSDKError
      );
    }, 10000);

    it('should handle rate limiting with proper error code', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      const client = createManifoldApiClient(config, true);
      
      const error = await client.getInstanceData(mockInstanceId).catch(e => e);
      expect(error).toBeInstanceOf(ClientSDKError);
      expect(error.code).toBe(ErrorCode.RATE_LIMITED);
    });

    it('should handle malformed JSON responses', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      const config = createApiConfig({ environment: 'test' });
      config.requests!.maxRetries = 0; // No retries to speed up test
      const client = createManifoldApiClient(config, true);
      
      await expect(client.getInstanceData(mockInstanceId)).rejects.toThrow(
        ClientSDKError
      );
    }, 10000);
  });
});