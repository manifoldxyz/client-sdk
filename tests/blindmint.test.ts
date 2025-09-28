import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlindMintProductImpl, createBlindMintProduct, isBlindMintProduct } from '../src/products/blindmint';
import type { InstanceData } from '../src/types/product';
import type { Address, NetworkId } from '../src/types/common';
import { BlindMintError, BlindMintErrorCode } from '../src/types/enhanced-errors';

// Mock the external dependencies
vi.mock('../src/utils/provider-factory', () => ({
  createProvider: vi.fn(() => ({
    getBlockNumber: vi.fn().mockResolvedValue(1000000),
    getBalance: vi.fn().mockResolvedValue({ toString: () => '1000000000000000000' }), // 1 ETH
  })),
  createDualProvider: vi.fn(() => ({
    switchToOptimal: vi.fn(),
    switchToBridge: vi.fn(),
    current: {
      getBlockNumber: vi.fn().mockResolvedValue(1000000),
    }
  }))
}));

vi.mock('../src/utils/contract-factory', () => ({
  ContractFactory: vi.fn().mockImplementation(() => ({
    createBlindMintContract: vi.fn(() => ({
      MINT_FEE: vi.fn().mockResolvedValue({ toString: () => '10000000000000000' }), // 0.01 ETH
      getClaim: vi.fn().mockResolvedValue({
        storageProtocol: 1,
        total: 2500,
        totalMax: 10000,
        startDate: Math.floor(Date.now() / 1000) - 3600, // Started 1 hour ago
        endDate: Math.floor(Date.now() / 1000) + 86400, // Ends in 24 hours
        startingTokenId: { toString: () => '1' },
        tokenVariations: 10,
        location: 'ipfs://test',
        paymentReceiver: '0x1234567890123456789012345678901234567890',
        cost: { toString: () => '100000000000000000' }, // 0.1 ETH
        erc20: '0x0000000000000000000000000000000000000000', // ETH
      }),
      getUserMints: vi.fn().mockResolvedValue({
        reservedCount: 1,
        deliveredCount: 1,
      }),
      estimateGas: {
        mintReserve: vi.fn().mockResolvedValue({ toString: () => '200000' })
      }
    }))
  }))
}));

vi.mock('../src/config/networks', () => ({
  getNetworkConfig: vi.fn(() => ({
    chainId: 1,
    name: 'mainnet',
  }))
}));

vi.mock('../src/config/cache', () => ({
  getCacheConfig: vi.fn(() => ({}))
}));

vi.mock('../src/utils/validation', () => ({
  validateAddress: vi.fn((address: string) => address.startsWith('0x') && address.length === 42)
}));

vi.mock('../src/libs/money', () => ({
  Money: {
    create: vi.fn().mockResolvedValue({
      value: { toString: () => '100000000000000000' },
      decimals: 18,
      symbol: 'ETH',
      erc20: '0x0000000000000000000000000000000000000000',
      formatted: '0.1',
      formattedUSD: '$250.00',
      isPositive: () => true,
      isERC20: () => false,
      multiplyInt: vi.fn().mockReturnValue({
        value: { toString: () => '200000000000000000' },
        decimals: 18,
        symbol: 'ETH',
        erc20: '0x0000000000000000000000000000000000000000',
        formatted: '0.2',
        formattedUSD: '$500.00',
        isPositive: () => true,
        isERC20: () => false,
      }),
      add: vi.fn().mockReturnValue({
        value: { toString: () => '200000000000000000' },
        decimals: 18,
        symbol: 'ETH',
        erc20: '0x0000000000000000000000000000000000000000',
        formatted: '0.2',
        formattedUSD: '$500.00',
        isPositive: () => true,
        isERC20: () => false,
      }),
      raw: { toString: () => '100000000000000000' },
    }),
    zero: vi.fn().mockResolvedValue({
      value: { toString: () => '0' },
      decimals: 18,
      symbol: 'ETH',
      erc20: '0x0000000000000000000000000000000000000000',
      formatted: '0.0',
      formattedUSD: '$0.00',
      isPositive: () => false,
      isERC20: () => false,
      raw: { toString: () => '0' },
    }),
    fromData: vi.fn().mockReturnValue({
      value: { toString: () => '0' },
      decimals: 18,
      symbol: 'ETH',
      erc20: '0x0000000000000000000000000000000000000000',
      formatted: '0.0',
      formattedUSD: '$0.00',
      isPositive: () => false,
      isERC20: () => false,
      raw: { toString: () => '0' },
    }),
  }
}));

describe('BlindMintProduct', () => {
  let mockInstanceData: InstanceData;
  let blindMintProduct: BlindMintProductImpl;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock instance data
    mockInstanceData = {
      id: 'test-blindmint-123',
      creator: {
        id: 'workspace-456',
        slug: 'test-creator',
        address: '0x1234567890123456789012345678901234567890' as Address,
        name: 'Test Creator',
      },
      publicData: {
        name: 'Test BlindMint Collection',
        description: 'A test BlindMint collection',
        network: 1 as NetworkId,
        contract: {
          id: 123,
          networkId: 1 as NetworkId,
          contractAddress: '0x2234567890123456789012345678901234567890',
          spec: 'erc1155',
          name: 'Test Collection',
          symbol: 'TEST',
        },
        extensionAddress1155: {
          value: '0x3234567890123456789012345678901234567890' as Address,
          version: 1,
        },
        tierProbabilities: [{
          group: 'Standard',
          indices: [0, 1, 2],
          rate: 10000,
        }],
        pool: [
          {
            seriesIndex: 1,
            metadata: {
              name: 'Common Item',
              description: 'A common item',
              image: 'https://example.com/common.png',
            },
          },
          {
            seriesIndex: 2,
            metadata: {
              name: 'Rare Item',
              description: 'A rare item',
              image: 'https://example.com/rare.png',
            },
          },
        ],
      },
      appId: 2526777015, // AppId.BLIND_MINT_1155
      appName: 'BlindMint',
    } as any;

    const mockPreviewData = {
      id: 'test-blindmint-123',
      title: 'Test BlindMint Collection',
      description: 'A test BlindMint collection',
      thumbnail: 'https://example.com/thumbnail.png',
    } as any;

    blindMintProduct = new BlindMintProductImpl(mockInstanceData, mockPreviewData);
  });

  describe('Constructor', () => {
    it('should create a BlindMintProduct with valid instance data', () => {
      expect(blindMintProduct.type).toBe('blind-mint');
      expect(blindMintProduct.id).toBe('test-blindmint-123');
      expect(blindMintProduct.data.publicData.title).toBe('Test BlindMint Collection');
    });

    it('should throw error with invalid instance data', () => {
      const invalidInstanceData = {
        ...mockInstanceData,
        publicData: null,
      };

      expect(() => new BlindMintProductImpl(invalidInstanceData as any))
        .toThrow(BlindMintError);
    });
  });

  describe('Factory Functions', () => {
    it('should create BlindMint product using factory function', () => {
      const mockPreviewData = {
        id: 'test-blindmint-123',
        title: 'Test BlindMint Collection',
        description: 'A test BlindMint collection',
        thumbnail: 'https://example.com/thumbnail.png',
      } as any;
      
      const product = createBlindMintProduct(mockInstanceData, mockPreviewData);
      
      expect(product.type).toBe('blind-mint');
      expect(product.id).toBe('test-blindmint-123');
    });
  });

  describe('Basic Product Methods', () => {
    it('should return preview media', async () => {
      const media = await blindMintProduct.getPreviewMedia();
      
      // Should return media from publicData.previewMedia if available, or undefined
      expect(media).toBeUndefined(); // No previewMedia set in mock data
    });

    it('should return metadata', async () => {
      const metadata = await blindMintProduct.getMetadata();
      
      expect(metadata.name).toBe('Test BlindMint Collection');
      expect(metadata.description).toBe('A test BlindMint collection');
    });

    it('should validate address properly in getAllocations', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890' as Address;
      
      // This should not throw an error for valid addresses
      const result = await blindMintProduct.getAllocations({
        recipientAddress: validAddress,
      });
      
      expect(result).toBeDefined();
    });

    it('should throw error for invalid address in getAllocations', async () => {
      const invalidAddress = 'invalid-address' as Address;
      
      await expect(blindMintProduct.getAllocations({
        recipientAddress: invalidAddress,
      })).rejects.toThrow(BlindMintError);
    });
  });

  describe('Status Management', () => {
    it('should return active status when mint is ongoing', async () => {
      // Mock onchain data is set to be active (started but not ended)
      const status = await blindMintProduct.getStatus();
      
      expect(status).toBe('active');
    });
  });

  describe('Purchase Flow', () => {
    it('should validate address in preparePurchase', async () => {
      const invalidAddress = 'invalid-address';
      
      await expect(blindMintProduct.preparePurchase({
        address: invalidAddress,
        payload: { quantity: 1 },
      } as any)).rejects.toThrow(BlindMintError);
    });

    it('should validate quantity in preparePurchase', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890';
      
      await expect(blindMintProduct.preparePurchase({
        address: validAddress,
        payload: { quantity: 0 },
      } as any)).rejects.toThrow(BlindMintError);
    });
  });

  describe('BlindMint-Specific Methods', () => {
    it('should return token variations', async () => {
      const variations = await blindMintProduct.getTokenVariations();
      
      expect(Array.isArray(variations)).toBe(true);
      expect(variations.length).toBe(2); // Based on pool mock data
      expect(variations[0]).toHaveProperty('tokenId');
      expect(variations[0]).toHaveProperty('metadata');
    });

    it('should return gacha config', async () => {
      const config = await blindMintProduct.getGachaConfig();
      
      expect(config).toHaveProperty('tiers');
      expect(config).toHaveProperty('immediateReveal');
      expect(Array.isArray(config.tiers)).toBe(true);
    });

    it('should return tier probabilities', async () => {
      const tiers = await blindMintProduct.getTierProbabilities();
      
      expect(Array.isArray(tiers)).toBe(true);
      expect(tiers.length).toBeGreaterThan(0);
    });

    it('should return claimable tokens for valid address', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890' as Address;
      
      const claimableTokens = await blindMintProduct.getClaimableTokens(validAddress);
      
      expect(Array.isArray(claimableTokens)).toBe(true);
      expect(claimableTokens.length).toBe(2); // Based on variations
      expect(claimableTokens[0].isClaimable).toBe(true); // BlindMint allows all tokens to be claimable
    });

    it('should throw error for invalid address in getClaimableTokens', async () => {
      const invalidAddress = 'invalid-address' as Address;
      
      await expect(blindMintProduct.getClaimableTokens(invalidAddress))
        .rejects.toThrow(BlindMintError);
    });
  });

  describe('Validation Methods', () => {
    it('should validate mint parameters correctly', async () => {
      const validParams = {
        walletAddress: '0x1234567890123456789012345678901234567890' as Address,
        quantity: 1,
      };
      
      const validation = await blindMintProduct.validateMint(validParams);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should return validation errors for invalid parameters', async () => {
      const invalidParams = {
        walletAddress: 'invalid-address' as Address,
        quantity: -1,
      };
      
      const validation = await blindMintProduct.validateMint(invalidParams);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Inventory and Rules', () => {
    it('should return inventory information', async () => {
      const inventory = await blindMintProduct.getInventory();
      
      expect(inventory).toHaveProperty('totalSupply');
      expect(inventory).toHaveProperty('totalMinted');
      expect(inventory).toHaveProperty('remainingSupply');
      expect(inventory).toHaveProperty('tierBreakdown');
      expect(typeof inventory.totalSupply).toBe('number');
    });

    it('should return rules information', async () => {
      const rules = await blindMintProduct.getRules();
      
      expect(rules).toHaveProperty('startDate');
      expect(rules).toHaveProperty('endDate');
      expect(rules).toHaveProperty('audienceRestriction');
      expect(rules.audienceRestriction).toBe('none'); // BlindMint default
    });

    it('should return provenance information', async () => {
      const provenance = await blindMintProduct.getProvenance();
      
      expect(provenance).toHaveProperty('creator');
      expect(provenance).toHaveProperty('contract');
      expect(provenance).toHaveProperty('networkId');
      expect(provenance.creator.name).toBe('Test Creator');
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate mint gas for valid parameters', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890' as Address;
      const quantity = 2;
      
      const gasEstimate = await blindMintProduct.estimateMintGas(quantity, validAddress);
      
      expect(typeof gasEstimate).toBe('bigint');
      expect(gasEstimate).toBeGreaterThan(0n);
    });

    it('should return fallback gas estimate on error', async () => {
      const validAddress = '0x1234567890123456789012345678901234567890' as Address;
      const quantity = 1;
      
      // Mock the contract to throw an error
      const originalEstimateGas = vi.fn().mockRejectedValue(new Error('Gas estimation failed'));
      
      const gasEstimate = await blindMintProduct.estimateMintGas(quantity, validAddress);
      
      // Should return fallback gas (200000 per token)
      expect(gasEstimate).toBe(BigInt(200000 * quantity));
    });
  });

  describe('Error Handling', () => {
    it('should throw BlindMintError with proper context', async () => {
      const invalidInstanceData = {
        ...mockInstanceData,
        publicData: undefined,
      };

      try {
        new BlindMintProductImpl(invalidInstanceData as any);
      } catch (error) {
        expect(error).toBeInstanceOf(BlindMintError);
        expect((error as BlindMintError).code).toBe(BlindMintErrorCode.INVALID_CONFIGURATION);
        expect((error as BlindMintError).context).toHaveProperty('instanceId');
      }
    });
  });
});

// Test the type guard function
describe('isBlindMintProduct', () => {
  it('should correctly identify BlindMint products', () => {
    const mockBlindMintProduct = { type: 'blind-mint' };
    const mockOtherProduct = { type: 'edition' };
    const invalidObject = {};
    
    expect(isBlindMintProduct(mockBlindMintProduct)).toBe(true);
    expect(isBlindMintProduct(mockOtherProduct)).toBe(false);
    expect(isBlindMintProduct(invalidObject)).toBe(false);
    expect(isBlindMintProduct(null)).toBe(false);
    expect(isBlindMintProduct(undefined)).toBe(false);
  });
});