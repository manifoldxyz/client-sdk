import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCode, ClientSDKError } from '../../src/types/errors';

describe('ManifoldApiClient', () => {
  let client: any;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    // Mock the API client
    client = {
      getCompleteInstanceData: vi.fn(),
      getProductsByWorkspace: vi.fn(),
      getAllocations: vi.fn(),
      simulatePurchase: vi.fn(),
      getOnchainData: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCompleteInstanceData', () => {
    it('fetches instance data successfully', async () => {
      const mockResponse = {
        instanceData: {
          id: 123456,
          appId: 2526777015,
          publicData: {
            network: 1,
            title: 'Test NFT',
          },
        },
        previewData: {
          title: 'Test NFT Preview',
          description: 'A test NFT',
          thumbnail: 'https://example.com/thumbnail.jpg',
        },
      };

      client.getCompleteInstanceData.mockResolvedValue(mockResponse);
      const result = await client.getCompleteInstanceData('123456');

      expect(result).toEqual(mockResponse);
      expect(client.getCompleteInstanceData).toHaveBeenCalledWith('123456');
    });

    it('handles API errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      client.getCompleteInstanceData.mockRejectedValue(
        new ClientSDKError(ErrorCode.API_ERROR, 'API Error: 404 Not Found')
      );
      
      await expect(client.getCompleteInstanceData('999999')).rejects.toMatchObject({
        code: ErrorCode.API_ERROR,
        message: expect.stringContaining('404'),
      });
    });

    it('handles network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      client.getCompleteInstanceData.mockRejectedValue(
        new ClientSDKError(ErrorCode.NETWORK_ERROR, 'Network error')
      );
      
      await expect(client.getCompleteInstanceData('123456')).rejects.toMatchObject({
        code: ErrorCode.NETWORK_ERROR,
      });
    });

    it('includes max media width parameter', async () => {
      client.getCompleteInstanceData.mockResolvedValue({ instanceData: {}, previewData: {} });
      await client.getCompleteInstanceData('123456', { maxMediaWidth: 2048 });

      expect(client.getCompleteInstanceData).toHaveBeenCalledWith('123456', { maxMediaWidth: 2048 });
    });
  });

  describe('getProductsByWorkspace', () => {
    it('fetches workspace products with filters', async () => {
      const mockProducts = [
        { id: 1, type: 'edition' },
        { id: 2, type: 'burn-redeem' },
      ];

      client.getProductsByWorkspace.mockResolvedValue({ products: mockProducts });
      
      const result = await client.getProductsByWorkspace('workspace123', {
        limit: 10,
        offset: 0,
        sort: 'latest',
        networkId: 1,
        type: 'edition',
      });

      expect(result.products).toEqual(mockProducts);
      expect(client.getProductsByWorkspace).toHaveBeenCalledWith('workspace123', expect.objectContaining({
        limit: 10,
        type: 'edition',
      }));
    });

    it('uses default parameters when not specified', async () => {
      client.getProductsByWorkspace.mockResolvedValue({ products: [] });
      
      await client.getProductsByWorkspace('workspace123');

      expect(client.getProductsByWorkspace).toHaveBeenCalledWith('workspace123');
    });
  });

  describe('getAllocations', () => {
    it('fetches allocation data for an address', async () => {
      const mockAllocation = {
        isEligible: true,
        quantity: 5,
        reason: null,
      };

      client.getAllocations.mockResolvedValue(mockAllocation);
      
      const result = await client.getAllocations('123456', {
        recipientAddress: '0x1234567890123456789012345678901234567890',
      });

      expect(result).toEqual(mockAllocation);
      expect(client.getAllocations).toHaveBeenCalledWith('123456', {
        recipientAddress: '0x1234567890123456789012345678901234567890',
      });
    });

    it('handles ineligible allocations', async () => {
      const mockAllocation = {
        isEligible: false,
        quantity: 0,
        reason: 'Not on allowlist',
      };

      client.getAllocations.mockResolvedValue(mockAllocation);
      
      const result = await client.getAllocations('123456', {
        recipientAddress: '0x9999999999999999999999999999999999999999',
      });

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Not on allowlist');
    });
  });

  describe('simulatePurchase', () => {
    it('simulates a purchase successfully', async () => {
      const mockSimulation = {
        success: true,
        cost: {
          total: '1000000000000000000',
          breakdown: {
            price: '900000000000000000',
            fee: '100000000000000000',
          },
        },
        steps: [
          { type: 'approve', description: 'Approve token' },
          { type: 'mint', description: 'Mint NFT' },
        ],
      };

      client.simulatePurchase.mockResolvedValue(mockSimulation);
      
      const result = await client.simulatePurchase('123456', {
        address: '0x1234567890123456789012345678901234567890',
        payload: { quantity: 1 },
      });

      expect(result).toEqual(mockSimulation);
      expect(client.simulatePurchase).toHaveBeenCalledWith('123456', expect.objectContaining({
        address: '0x1234567890123456789012345678901234567890',
        payload: { quantity: 1 },
      }));
    });

    it('handles simulation failures', async () => {
      client.simulatePurchase.mockRejectedValue(
        new ClientSDKError(ErrorCode.API_ERROR, 'Insufficient balance')
      );

      await expect(client.simulatePurchase('123456', {
        address: '0x1234567890123456789012345678901234567890',
        payload: { quantity: 10 },
      })).rejects.toMatchObject({
        code: ErrorCode.API_ERROR,
      });
    });
  });

  describe('getOnchainData', () => {
    it('fetches on-chain data for Edition product', async () => {
      const mockOnchainData = {
        totalSupply: 1000,
        totalMinted: 250,
        walletMax: 5,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        audienceType: 'Allowlist',
        cost: {
          amount: '100000000000000000',
          currency: 'ETH',
        },
        paymentReceiver: '0x9876543210987654321098765432109876543210',
      };

      client.getOnchainData.mockResolvedValue(mockOnchainData);
      
      const result = await client.getOnchainData('123456', 1);

      expect(result).toEqual(mockOnchainData);
      expect(client.getOnchainData).toHaveBeenCalledWith('123456', 1);
    });

    it('handles network-specific requests', async () => {
      client.getOnchainData.mockResolvedValue({});
      
      await client.getOnchainData('123456', 8453);

      expect(client.getOnchainData).toHaveBeenCalledWith('123456', 8453);
    });
  });

  describe('error handling', () => {
    it('handles malformed JSON responses', async () => {
      client.getCompleteInstanceData.mockRejectedValue(
        new ClientSDKError(ErrorCode.API_ERROR, 'Invalid JSON')
      );

      await expect(client.getCompleteInstanceData('123456')).rejects.toMatchObject({
        code: ErrorCode.API_ERROR,
      });
    });

    it('handles timeout errors', async () => {
      client.getCompleteInstanceData.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(client.getCompleteInstanceData('123456')).rejects.toThrow('Request timeout');
    });

    it('handles rate limiting', async () => {
      client.getCompleteInstanceData.mockRejectedValue(
        new ClientSDKError(ErrorCode.RATE_LIMITED, 'Too Many Requests')
      );

      await expect(client.getCompleteInstanceData('123456')).rejects.toMatchObject({
        code: ErrorCode.RATE_LIMITED,
      });
    });
  });
});