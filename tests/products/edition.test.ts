import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '../../src/types/errors';

// Mock Edition product class (to be implemented)
describe('EditionProduct', () => {
  let mockManifoldApi: any;
  let mockProvider: any;
  let editionProduct: any;

  beforeEach(() => {
    mockManifoldApi = {
      getCompleteInstanceData: vi.fn(),
      getAllocations: vi.fn(),
      simulatePurchase: vi.fn(),
      getOnchainData: vi.fn(),
    };

    mockProvider = {
      getBalance: vi.fn(),
      estimateGas: vi.fn(),
      getGasPrice: vi.fn(),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
    };

    // Mock Edition product data
    const instanceData = {
      id: 123456,
      appId: 1, // Edition app ID
      publicData: {
        title: 'Test Edition NFT',
        description: 'A test edition NFT',
        network: 1,
        contract: {
          id: 1,
          name: 'Test Contract',
          symbol: 'TEST',
          contractAddress: '0x1234567890123456789012345678901234567890',
          networkId: 1,
          spec: 'erc1155',
        },
        extensionAddress: '0x9876543210987654321098765432109876543210',
        asset: {
          name: 'Test Asset',
          description: 'Test asset description',
          image: 'https://example.com/image.png',
        },
      },
    };

    const previewData = {
      title: 'Test Edition Preview',
      description: 'Preview description',
      thumbnail: 'https://example.com/thumbnail.png',
    };

    // Create mock edition product
    editionProduct = {
      id: instanceData.id,
      type: 'edition',
      data: instanceData,
      previewData,
      onchainData: null,
      getAllocations: vi.fn(),
      preparePurchase: vi.fn(),
      purchase: vi.fn(),
      getStatus: vi.fn(),
      getPreviewMedia: vi.fn(),
      getMetadata: vi.fn(),
      getInventory: vi.fn(),
      getRules: vi.fn(),
      getProvenance: vi.fn(),
      fetchOnchainData: vi.fn(),
    };
  });

  describe('getAllocations', () => {
    it('returns eligible allocation for allowlisted address', async () => {
      editionProduct.getAllocations.mockResolvedValue({
        isEligible: true,
        quantity: 5,
        reason: undefined,
      });

      const result = await editionProduct.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(result.isEligible).toBe(true);
      expect(result.quantity).toBe(5);
    });

    it('returns ineligible allocation for non-allowlisted address', async () => {
      editionProduct.getAllocations.mockResolvedValue({
        isEligible: false,
        quantity: 0,
        reason: 'Address not on allowlist',
      });

      const result = await editionProduct.getAllocations({
        recipientAddress: '0x2222222222222222222222222222222222222222',
      });

      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('Address not on allowlist');
    });
  });

  describe('preparePurchase', () => {
    it('prepares purchase with valid parameters', async () => {
      const mockPreparedPurchase = {
        cost: {
          total: {
            amount: '1100000000000000000',
            formatted: '1.1 ETH',
            currency: 'ETH',
          },
          breakdown: {
            price: {
              amount: '1000000000000000000',
              formatted: '1 ETH',
            },
            fee: {
              amount: '100000000000000000',
              formatted: '0.1 ETH',
            },
          },
        },
        steps: [
          {
            id: 'mint_123',
            name: 'Mint NFT',
            type: 'mint',
            description: 'Mint 1 Edition NFT',
            execute: vi.fn(),
          },
        ],
        eligibility: {
          isEligible: true,
          reason: undefined,
        },
      };

      editionProduct.preparePurchase.mockResolvedValue(mockPreparedPurchase);

      const result = await editionProduct.preparePurchase({
        address: '0x1111111111111111111111111111111111111111',
        payload: { quantity: 1 },
      });

      expect(result.cost.total.formatted).toBe('1.1 ETH');
      expect(result.steps).toHaveLength(1);
      expect(result.eligibility.isEligible).toBe(true);
    });

    it('handles purchase preparation with redemption code', async () => {
      editionProduct.preparePurchase.mockResolvedValue({
        cost: {
          total: {
            amount: '500000000000000000',
            formatted: '0.5 ETH',
            currency: 'ETH',
          },
        },
        steps: [{ id: 'mint_discount', type: 'mint' }],
        eligibility: { isEligible: true },
      });

      const result = await editionProduct.preparePurchase({
        address: '0x1111111111111111111111111111111111111111',
        payload: { quantity: 1, code: 'DISCOUNT50' },
      });

      expect(result.cost.total.formatted).toBe('0.5 ETH');
    });

    it('throws error for invalid quantity', async () => {
      editionProduct.preparePurchase.mockRejectedValue({
        code: ErrorCode.INVALID_INPUT,
        message: 'Quantity exceeds maximum per wallet',
      });

      await expect(
        editionProduct.preparePurchase({
          address: '0x1111111111111111111111111111111111111111',
          payload: { quantity: 100 },
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });
  });

  describe('purchase', () => {
    it('executes purchase successfully', async () => {
      const mockOrder = {
        id: 'order_123',
        status: 'completed',
        receipts: [
          {
            txHash: '0xabc123',
            status: 'success',
            blockNumber: 12345,
            gasUsed: '150000',
          },
        ],
        totalCost: {
          amount: '1100000000000000000',
          formatted: '1.1 ETH',
        },
      };

      editionProduct.purchase.mockResolvedValue(mockOrder);

      const mockAccount = {
        getAddress: vi.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
        sendTransaction: vi.fn().mockResolvedValue({ hash: '0xabc123' }),
      };

      const preparedPurchase = {
        steps: [{ execute: vi.fn().mockResolvedValue({ hash: '0xabc123' }) }],
      };

      const result = await editionProduct.purchase({
        account: mockAccount,
        preparedPurchase,
      });

      expect(result.status).toBe('completed');
      expect(result.receipts[0].txHash).toBe('0xabc123');
    });

    it('handles purchase failure', async () => {
      editionProduct.purchase.mockRejectedValue({
        code: ErrorCode.TRANSACTION_FAILED,
        message: 'Transaction reverted',
      });

      await expect(
        editionProduct.purchase({
          account: {},
          preparedPurchase: {},
        })
      ).rejects.toMatchObject({
        code: ErrorCode.TRANSACTION_FAILED,
      });
    });
  });

  describe('getStatus', () => {
    it('returns active status during sale period', async () => {
      editionProduct.getStatus.mockResolvedValue('active');
      
      const status = await editionProduct.getStatus();
      expect(status).toBe('active');
    });

    it('returns completed status when sold out', async () => {
      editionProduct.getStatus.mockResolvedValue('completed');
      
      const status = await editionProduct.getStatus();
      expect(status).toBe('completed');
    });

    it('returns upcoming status before sale starts', async () => {
      editionProduct.getStatus.mockResolvedValue('upcoming');
      
      const status = await editionProduct.getStatus();
      expect(status).toBe('upcoming');
    });

    it('returns paused status when sale is paused', async () => {
      editionProduct.getStatus.mockResolvedValue('paused');
      
      const status = await editionProduct.getStatus();
      expect(status).toBe('paused');
    });
  });

  describe('getMetadata', () => {
    it('returns product metadata', async () => {
      editionProduct.getMetadata.mockResolvedValue({
        name: 'Test Edition NFT',
        description: 'A test edition NFT for unit testing',
      });

      const metadata = await editionProduct.getMetadata();
      
      expect(metadata.name).toBe('Test Edition NFT');
      expect(metadata.description).toContain('test edition');
    });
  });

  describe('getInventory', () => {
    it('returns inventory information', async () => {
      editionProduct.getInventory.mockResolvedValue({
        totalSupply: 1000,
        totalPurchased: 250,
      });

      const inventory = await editionProduct.getInventory();
      
      expect(inventory.totalSupply).toBe(1000);
      expect(inventory.totalPurchased).toBe(250);
    });

    it('handles unlimited supply', async () => {
      editionProduct.getInventory.mockResolvedValue({
        totalSupply: 0, // 0 indicates unlimited
        totalPurchased: 5000,
      });

      const inventory = await editionProduct.getInventory();
      
      expect(inventory.totalSupply).toBe(0);
      expect(inventory.totalPurchased).toBe(5000);
    });
  });

  describe('getRules', () => {
    it('returns product rules', async () => {
      editionProduct.getRules.mockResolvedValue({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        audienceRestriction: 'allowlist',
        maxPerWallet: 5,
      });

      const rules = await editionProduct.getRules();
      
      expect(rules.audienceRestriction).toBe('allowlist');
      expect(rules.maxPerWallet).toBe(5);
    });
  });

  describe('fetchOnchainData', () => {
    it('fetches and caches on-chain data', async () => {
      const mockOnchainData = {
        totalSupply: 1000,
        totalMinted: 250,
        walletMax: 5,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        audienceType: 'Allowlist',
        cost: {
          amount: '1000000000000000000',
          currency: 'ETH',
          formatted: '1 ETH',
        },
        paymentReceiver: '0x9876543210987654321098765432109876543210',
      };

      editionProduct.fetchOnchainData.mockResolvedValue(mockOnchainData);

      const data = await editionProduct.fetchOnchainData();
      
      expect(data.totalSupply).toBe(1000);
      expect(data.totalMinted).toBe(250);
      expect(data.cost.formatted).toBe('1 ETH');
    });

    it('handles fetch errors', async () => {
      editionProduct.fetchOnchainData.mockRejectedValue({
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to fetch on-chain data',
      });

      await expect(editionProduct.fetchOnchainData()).rejects.toMatchObject({
        code: ErrorCode.NETWORK_ERROR,
      });
    });
  });
});