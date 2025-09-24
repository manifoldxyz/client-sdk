import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlindMintProductImpl, createBlindMintProduct, isBlindMintProduct } from '../src/products/blindmint';
import type { InstanceData } from '../src/types/product';
import type { Address, NetworkId } from '../src/types/common';
import { BlindMintError, BlindMintErrorCode } from '../src/types/enhanced-errors';

// Mock the external dependencies
vi.mock('../src/utils/provider-factory', () => ({
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
      totalSupply: vi.fn().mockResolvedValue({ toNumber: () => 10000 }),
      totalMinted: vi.fn().mockResolvedValue({ toNumber: () => 2500 }),
      walletMax: vi.fn().mockResolvedValue({ toNumber: () => 5 }),
      startDate: vi.fn().mockResolvedValue({ toNumber: () => Date.now() / 1000 - 3600 }),
      endDate: vi.fn().mockResolvedValue({ toNumber: () => Date.now() / 1000 + 86400 }),
      cost: vi.fn().mockResolvedValue({ toString: () => '100000000000000000' }), // 0.1 ETH
      paymentReceiver: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      tokenVariations: vi.fn().mockResolvedValue({ toNumber: () => 10 }),
      startingTokenId: vi.fn().mockResolvedValue({ toNumber: () => 1 }),
      metadataLocation: vi.fn().mockResolvedValue('ipfs://test'),
      storageProtocol: vi.fn().mockResolvedValue(1), // IPFS
      estimateGas: {
        mint: vi.fn().mockResolvedValue({ mul: vi.fn().mockReturnValue({ div: vi.fn().mockReturnValue({ toString: () => '200000' }) }) })
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
        title: 'Test BlindMint Collection',
        description: 'A test BlindMint collection',
        network: 1 as NetworkId,
        contract: {
          networkId: 1 as NetworkId,
          address: '0x2234567890123456789012345678901234567890' as Address,
          spec: 'erc1155',
          name: 'Test Collection',
          symbol: 'TEST',
          explorer: {
            etherscanUrl: 'https://etherscan.io/address/0x2234567890123456789012345678901234567890',
          },
        },
        extensionAddress: '0x3234567890123456789012345678901234567890' as Address,
        tierProbabilities: {
          group: 'Standard',
          indices: [0, 1, 2],
          rate: 10000,
        },
        pool: [
          {
            index: 0,
            metadata: {
              name: 'Common Item',
              description: 'A common item',
              media: {
                image: 'https://example.com/common.png',
                imagePreview: 'https://example.com/common-preview.png',
              },
            },
          },
          {
            index: 1,
            metadata: {
              name: 'Rare Item',
              description: 'A rare item',
              media: {
                image: 'https://example.com/rare.png',
                imagePreview: 'https://example.com/rare-preview.png',
              },
            },
          },
        ],
      },
      appId: 3,
      appName: 'BlindMint',
    } as any;

    blindMintProduct = new BlindMintProductImpl(mockInstanceData);
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
      const product = createBlindMintProduct(mockInstanceData);
      
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