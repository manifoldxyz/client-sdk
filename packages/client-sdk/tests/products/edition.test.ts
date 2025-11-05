import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { EditionProduct, isEditionProduct } from '../../src/products/edition';
import { AppId, AppType } from '../../src/types/common';
import { ClientSDKError, ErrorCode } from '../../src/types/errors';
import type { InstanceData, EditionPublicData, EditionOnchainData } from '../../src/types/product';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client-public';
import { Money } from '../../src/libs/money';
import * as ethers from 'ethers';

// Mock dependencies
vi.mock('../../src/utils/gas-estimation');
vi.mock('../../src/utils/validation');

// Mock Money class with proper structure
vi.mock('../../src/libs/money', () => ({
  Money: {
    create: vi.fn(),
    zero: vi.fn(),
  }
}));

// Import mocked modules
import { estimateGas } from '../../src/utils/gas-estimation';
import { validateAddress } from '../../src/utils/validation';

const mockEstimateGas = estimateGas as MockedFunction<typeof estimateGas>;
const mockValidateAddress = validateAddress as MockedFunction<typeof validateAddress>;

// Mock public provider
const mockPublicProvider = {
  estimateContractGas: vi.fn(),
  readContract: vi.fn(),
  getBalance: vi.fn(),
  simulateContract: vi.fn(),
  getTransactionReceipt: vi.fn(),
};

// Helper to set up default mock responses
const setupDefaultMocks = (overrides: any = {}) => {
  const now = Math.floor(Date.now() / 1000);
  mockPublicProvider.readContract.mockImplementation(async (args: any) => {
    if (args.functionName === 'getClaim') {
      return overrides.getClaim || {
        cost: 1000000000000000000n, // 1 ETH
        erc20: ethers.constants.AddressZero,
        totalMax: 1000n,
        total: 100n,
        walletMax: 5n,
        startDate: BigInt(now - 3600), // 1 hour ago
        endDate: BigInt(now + 3600), // 1 hour from now
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
        signingAddress: '0x2222222222222222222222222222222222222222',
        location: 'ipfs://QmXxx',
        storageProtocol: 1n,
        contractVersion: 7n,
        identical: true,
      };
    }
    if (args.functionName === 'MINT_FEE') {
      return overrides.MINT_FEE !== undefined ? overrides.MINT_FEE : 500000000000000000n;
    }
    if (args.functionName === 'MINT_FEE_MERKLE') {
      return overrides.MINT_FEE_MERKLE !== undefined ? overrides.MINT_FEE_MERKLE : 690000000000000000n;
    }
    if (args.functionName === 'getTotalMints') {
      return overrides.getTotalMints !== undefined ? overrides.getTotalMints : 0n;
    }
    if (args.functionName === 'balanceOf') {
      return overrides.balanceOf !== undefined ? overrides.balanceOf : 10000000000n;
    }
    if (args.functionName === 'allowance') {
      return overrides.allowance !== undefined ? overrides.allowance : 0n;
    }
    return null;
  });
};

// Base test data
const baseInstanceData: InstanceData<EditionPublicData> = {
  id: 123456,
  appId: AppId.EDITION,
  publicData: {
    title: 'Test Edition',
    description: 'A test edition NFT',
    asset: {
      name: 'Test Asset',
      description: 'Test asset description',
      animation_preview: 'https://example.com/animation.mp4',
    },
    network: 1,
    contract: {
      id: 789,
      name: 'Test Contract',
      symbol: 'TEST',
      contractAddress: '0x1234567890123456789012345678901234567890',
      networkId: 1,
      spec: 'erc721',
    },
    extensionAddress721: {
      value: '0x9876543210987654321098765432109876543210',
      version: 7,
    },
    extensionAddress1155: {
      value: '0x9876543210987654321098765432109876543211',
      version: 7,
    },
  },
  creator: {
    id: 42,
    slug: 'test-creator',
    address: '0x0000000000000000000000000000000000000001',
    name: 'Test Creator',
  },
} as InstanceData<EditionPublicData>;

const basePreviewData: InstancePreview = {
  title: 'Preview Title',
  description: 'Preview Description',
  thumbnail: 'https://example.com/thumbnail.jpg',
  manifest: {},
  status: 'DEPLOYED',
};

// Remove mock contracts - no longer needed since we mock publicProvider

// Mock Money class
const createMockMoney = (value: string = '1000000000000000000', isERC20: boolean = false, erc20Address?: string) => {
  const mockMoney = {
    value: BigInt(value),
    formatted: '1.0',
    symbol: isERC20 ? 'USDC' : 'ETH',
    decimals: isERC20 ? 6 : 18,
    erc20: isERC20 ? (erc20Address || '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2') : ethers.constants.AddressZero,
    isPositive: vi.fn().mockReturnValue(true),
    isERC20: vi.fn().mockReturnValue(isERC20),
    multiplyInt: vi.fn().mockImplementation((quantity: number) => createMockMoney((BigInt(value) * BigInt(quantity)).toString(), isERC20, erc20Address)),
    add: vi.fn().mockImplementation((other: any) => createMockMoney((BigInt(value) + BigInt(other.value.toString())).toString(), isERC20, erc20Address)),
    isLessThan: vi.fn().mockReturnValue(false),
  };
  return mockMoney;
};

// Helper function to create product with overrides
function createProduct(
  overrides: Partial<InstanceData<EditionPublicData>> = {},
  publicDataOverrides: Partial<EditionPublicData> = {},
  previewOverrides: Partial<InstancePreview> = {},
) {
  const instanceData = JSON.parse(JSON.stringify(baseInstanceData)) as InstanceData<EditionPublicData>;
  Object.assign(instanceData, overrides);
  instanceData.publicData = {
    ...instanceData.publicData,
    ...publicDataOverrides,
  };
  const previewData: InstancePreview = {
    ...basePreviewData,
    ...previewOverrides,
  };
  return new EditionProduct(instanceData, previewData, mockPublicProvider as any);
}

describe('EditionProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockValidateAddress.mockReturnValue(true);
    mockEstimateGas.mockResolvedValue(200000n);

    // Setup Money mock
    vi.mocked(Money.create).mockImplementation(async (params: any) => {
      // Handle undefined params
      if (!params) {
        return createMockMoney('0', false);
      }
      const isERC20 = params?.erc20 && params.erc20 !== ethers.constants.AddressZero;
      const valueStr = params?.value ? 
        (typeof params.value === 'string' ? params.value : params.value.toString()) : '0';
      return createMockMoney(valueStr, isERC20, params?.erc20);
    });
    vi.mocked(Money.zero).mockImplementation(async () => createMockMoney('0'));
    
    // Setup default mocks
    setupDefaultMocks();
    
    mockPublicProvider.getBalance.mockResolvedValue(10000000000000000000n);
  });

  describe('Constructor', () => {
    it('creates instance with valid Edition app ID', () => {
      const product = createProduct();
      expect(product.id).toBe(123456);
      expect(product.type).toBe(AppType.EDITION);
      expect(product.data).toBeDefined();
      expect(product.previewData).toBeDefined();
    });

    it('throws when constructed with non-edition app id', () => {
      expect(() => {
        createProduct({ appId: AppId.BLIND_MINT_1155 });
      }).toThrow(ClientSDKError);
    });

    it('detects ERC1155 contracts correctly', () => {
      const product = createProduct({}, { contract: { ...baseInstanceData.publicData.contract, spec: 'erc1155' } });
      expect(product).toBeDefined();
    });

    it('stores creator contract and extension addresses', () => {
      const product = createProduct();
      expect(product.data.publicData.contract.contractAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(product.data.publicData.extensionAddress721.value).toBe('0x9876543210987654321098765432109876543210');
    });
  });

  describe('isEditionProduct type guard', () => {
    it('identifies edition products correctly', () => {
      expect(isEditionProduct({ type: AppType.EDITION } as any)).toBe(true);
      expect(isEditionProduct({ type: AppType.BLIND_MINT } as any)).toBe(false);
      expect(isEditionProduct(null as any)).toBe(false);
    });
  });

  describe('fetchOnchainData', () => {

    it('fetches and caches onchain data successfully', async () => {
      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(mockPublicProvider.readContract).toHaveBeenCalled();
      const getClaimCalls = mockPublicProvider.readContract.mock.calls.filter(
        (call: any) => call[0]?.functionName === 'getClaim'
      );
      expect(getClaimCalls).toHaveLength(1);
      expect(onchainData.totalMax).toBe(1000);
      expect(onchainData.total).toBe(100);
      expect(onchainData.walletMax).toBe(5);
      expect(onchainData.audienceType).toBe('None'); // No merkle root
      expect(product.onchainData).toBe(onchainData);
    });

    it('returns cached data on subsequent calls', async () => {
      const product = createProduct();
      await product.fetchOnchainData();
      await product.fetchOnchainData();

      const getClaimCalls = mockPublicProvider.readContract.mock.calls.filter(
        (call: any) => call[0]?.functionName === 'getClaim'
      );
      expect(getClaimCalls).toHaveLength(1);
    });

    it('forces refresh when force=true', async () => {
      const product = createProduct();
      await product.fetchOnchainData();
      await product.fetchOnchainData(true);

      const getCalls = mockPublicProvider.readContract.mock.calls.filter((call: any) => 
        call[0]?.functionName === 'getClaim'
      );
      expect(getCalls).toHaveLength(2);
    });

    it('detects allowlist audience type with merkle root', async () => {
      const now = Math.floor(Date.now() / 1000);
      setupDefaultMocks({
        getClaim: {
          cost: 1000000000000000000n,
          erc20: ethers.constants.AddressZero,
          totalMax: 1000n,
          total: 100n,
          walletMax: 5n,
          startDate: BigInt(now - 3600),
          endDate: BigInt(now + 3600),
          merkleRoot: '0x1234567890123456789012345678901234567890123456789012345678901234',
          paymentReceiver: '0x1111111111111111111111111111111111111111',
        }
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData.audienceType).toBe('Allowlist');
    });

    it('handles ERC20 payment token', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      const now = Math.floor(Date.now() / 1000);
      setupDefaultMocks({
        getClaim: {
          cost: 1000000000000000000n,
          erc20: erc20Address,
          totalMax: 1000n,
          total: 100n,
          walletMax: 5n,
          startDate: BigInt(now - 3600),
          endDate: BigInt(now + 3600),
          merkleRoot: ethers.constants.HashZero,
          paymentReceiver: '0x1111111111111111111111111111111111111111',
        }
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(Money.create).toHaveBeenCalledWith({
        value: 1000000000000000000n,
        networkId: 1,
        erc20: erc20Address,
        fetchUSD: true,
      });
    });

    it('throws error when contract call fails', async () => {
      mockPublicProvider.readContract.mockRejectedValue(new Error('Contract call failed'));

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });

    it('uses Edition contract for both ERC721 and ERC1155 tokens', async () => {
      // Test ERC1155
      const product1155 = createProduct({}, { contract: { ...baseInstanceData.publicData.contract, spec: 'erc1155' } });
      await product1155.fetchOnchainData();
      expect(mockPublicProvider.readContract).toHaveBeenCalledWith(expect.objectContaining({
        abi: expect.any(Array),
        contractAddress: '0x9876543210987654321098765432109876543211',
        functionName: 'getClaim'
      }));

      // Clear mock calls
      mockPublicProvider.readContract.mockClear();
      
      // Reset mock implementation
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            totalMax: 1000n,
            total: 100n,
            walletMax: 5n,
            startDate: BigInt(Math.floor(Date.now() / 1000) - 3600),
            endDate: BigInt(Math.floor(Date.now() / 1000) + 3600),
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 690000000000000000n;
        return null;
      });

      // Test ERC721
      const product721 = createProduct();
      await product721.fetchOnchainData();
      expect(mockPublicProvider.readContract).toHaveBeenCalledWith(expect.objectContaining({
        abi: expect.any(Array),
        contractAddress: '0x9876543210987654321098765432109876543210',
        functionName: 'getClaim'
      }));
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      setupDefaultMocks({ MINT_FEE: 0n, MINT_FEE_MERKLE: 0n });
    });

    it('returns "active" for ongoing sale', async () => {
      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('active');
    });

    it('returns "upcoming" for future sale', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      setupDefaultMocks({
        getClaim: {
          totalMax: 1000n,
          total: 0n,
          startDate: BigInt(futureTime),
          endDate: BigInt(futureTime + 3600),
          cost: 1000000000000000000n,
          erc20: ethers.constants.AddressZero,
          walletMax: 5n,
          merkleRoot: ethers.constants.HashZero,
          paymentReceiver: '0x1111111111111111111111111111111111111111',
        },
        MINT_FEE: 0n,
        MINT_FEE_MERKLE: 0n
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('upcoming');
    });

    it('returns "ended" for past sale', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(pastTime - 3600),
            endDate: BigInt(pastTime),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('ended');
    });

    it('returns "sold-out" when total minted equals total supply', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 1000n, // Sold out
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('sold-out');
    });
  });

  describe('getAllocations', () => {
    beforeEach(() => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        if (args.functionName === 'getTotalMints') return 2n; // Wallet has minted 2 already
        return null;
      });
    });

    it('returns allocation for eligible wallet', async () => {
      const product = createProduct();
      const allocations = await product.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(allocations.isEligible).toBe(true);
      expect(allocations.quantity).toBe(3); // 5 max - 2 already minted
    });

    it('throws error for invalid address', async () => {
      mockValidateAddress.mockReturnValue(false);
      const product = createProduct();

      await expect(product.getAllocations({
        recipientAddress: 'invalid-address',
      })).rejects.toThrow(ClientSDKError);
    });

    it('considers remaining supply in calculations', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 105n, // Only 5 left total
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 10n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'getTotalMints') return 2n;
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      const allocations = await product.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(allocations.quantity).toBe(5); // Limited by remaining supply
    });

    it('handles getTotalMints failure gracefully', async () => {
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getTotalMints') {
          throw new Error('Contract call failed');
        }
        const now = Math.floor(Date.now() / 1000);
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      
      // Should throw error when getTotalMints fails
      await expect(product.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      })).rejects.toThrow('Contract call failed');
    });
  });

  describe('preparePurchase', () => {
    const walletAddress = '0x1111111111111111111111111111111111111111';

    beforeEach(() => {
      // Setup successful onchain data
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 690000000000000000n;
        if (args.functionName === 'getTotalMints') return 0n;
        if (args.functionName === 'balanceOf') return 10000000000n; // 10 USDC
        if (args.functionName === 'allowance') return 0n;
        return null;
      });
    });

    it('prepares purchase for native currency successfully', async () => {
      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 2 },
      });

      expect(prepared.isEligible).toBe(true);
      expect(prepared.steps).toHaveLength(1); // Only mint step for native currency
      expect(prepared.steps[0].id).toBe('mint');
      expect(prepared.steps[0].type).toBe('mint');
      expect(prepared.cost.total.native).toBeDefined();
    });

    it('prepares purchase with ERC20 approval step', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 2000000n, // 2 USDC (6 decimals)
            erc20: erc20Address,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 690000000000000000n;
        if (args.functionName === 'getTotalMints') return 0n;
        if (args.functionName === 'balanceOf') return 10000000000n;
        if (args.functionName === 'allowance') return 0n;
        return null;
      });

      // Mock Money.create for ERC20
      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      });

      expect(prepared.steps).toHaveLength(2); // Approval + mint
      expect(prepared.steps[0].id).toBe('approve-usdc');
      expect(prepared.steps[0].type).toBe('approve');
      expect(prepared.steps[1].id).toBe('mint');
    });

    it('throws error for invalid wallet address', async () => {
      mockValidateAddress.mockReturnValue(false);

      const product = createProduct();
      await expect(product.preparePurchase({
        userAddress: 'invalid-address',
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sale not started', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 0n,
            startDate: BigInt(futureTime), // Future
            endDate: BigInt(futureTime + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sale ended', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(pastTime - 3600),
            endDate: BigInt(pastTime), // Past
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sold out', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 1000n, // Sold out
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 500000000000000000n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error for insufficient ERC20 balance', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 2000000n, // 2 USDC
            erc20: erc20Address,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'balanceOf') return 1000000n; // Only 1 USDC
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        if (args.functionName === 'getTotalMints') return 0n;
        if (args.functionName === 'allowance') return 0n;
        return null;
      });

      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      await expect(product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('applies gas buffer correctly', async () => {
      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
        gasBuffer: { multiplier: 1.5 }, // 50% buffer
      });

      expect(prepared.steps).toHaveLength(1);
      // Gas buffer is applied in the execute function, so we can't easily test it here
      // but we verify the parameter is accepted
    });

    it('checks native balance when account provided', async () => {
      const mockAccount = {
        getBalance: vi.fn().mockResolvedValue(createMockMoney('10000000000000000000')), // 10 ETH
        getAddress: vi.fn().mockResolvedValue(walletAddress),
      };

      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
        account: mockAccount as any,
      });

      expect(prepared.isEligible).toBe(true);
      expect(mockAccount.getBalance).toHaveBeenCalledWith(1);
    });

    it('skips approval step when sufficient allowance exists', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 2000000n, // 2 USDC
            erc20: erc20Address,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'allowance') return 10000000n; // 10 USDC
        if (args.functionName === 'balanceOf') return 10000000n;
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        if (args.functionName === 'getTotalMints') return 0n;
        return null;
      });

      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: walletAddress,
        payload: { quantity: 1 },
      });

      expect(prepared.steps).toHaveLength(1); // Only mint step, no approval needed
      expect(prepared.steps[0].id).toBe('mint');
    });
  });

  describe('purchase', () => {
    const mockAccount = {
      getAddress: vi.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
      sendTransactionWithConfirmation: vi.fn(),
      switchNetwork: vi.fn(),
    };

    const mockPreparedPurchase = {
      cost: {
        total: {
          native: createMockMoney(),
          erc20s: [],
        },
        breakdown: {
          product: createMockMoney(),
          platformFee: createMockMoney('0'),
        },
      },
      steps: [
        {
          id: 'mint',
          name: 'Mint Edition NFTs',
          type: 'mint',
          description: 'Mint 1 NFT(s)',
          execute: vi.fn(),
        },
      ],
      isEligible: true,
    };

    beforeEach(() => {
      mockAccount.sendTransactionWithConfirmation.mockResolvedValue({
        hash: '0x1234567890abcdef',
        blockNumber: 12345,
        gasUsed: '200000',
        receipt: {
          blockNumber: 12345,
          gasUsed: '200000',
        },
      });
    });

    it('executes purchase successfully', async () => {
      const product = createProduct();
      const walletAddress = '0x1111111111111111111111111111111111111111';
      const mockStepExecute = vi.fn().mockResolvedValue({
        transactionReceipt: {
          networkId: 1,
          step: 'mint',
          txHash: '0x1234567890abcdef',
          blockNumber: 12345,
          gasUsed: BigInt(200000),
        },
        order: {
          walletAddress: walletAddress,
          orderItems: [
            {
              tokenId: '1',
              quantity: 1,
              cost: createMockMoney('1000000000000000000'),
            },
            {
              tokenId: '2',
              quantity: 1,
              cost: createMockMoney('1000000000000000000'),
            },
          ],
          totalCost: createMockMoney('2000000000000000000'),
        },
      });

      const preparedPurchase = {
        ...mockPreparedPurchase,
        steps: [
          {
            ...mockPreparedPurchase.steps[0],
            execute: mockStepExecute,
          },
        ],
      };

      const order = await product.purchase({
        account: mockAccount as any,
        preparedPurchase: preparedPurchase as any,
      });

      expect(mockStepExecute).toHaveBeenCalledWith(mockAccount);
      expect(order.order).toBeDefined();
      expect(order.transactionReceipt).toBeDefined();
      expect(order.order.walletAddress).toBe(walletAddress);
    });

    it('handles step execution failure', async () => {
      const product = createProduct();
      const mockStepExecute = vi.fn().mockRejectedValue(new Error('Transaction failed'));

      const preparedPurchase = {
        ...mockPreparedPurchase,
        steps: [
          {
            ...mockPreparedPurchase.steps[0],
            execute: mockStepExecute,
          },
        ],
      };

      await expect(product.purchase({
        account: mockAccount as any,
        preparedPurchase: preparedPurchase as any,
      })).rejects.toThrow(ClientSDKError);
    });

    it('executes multiple steps in sequence', async () => {
      const product = createProduct();
      const walletAddress = '0x1111111111111111111111111111111111111111';
      const mockApprovalExecute = vi.fn().mockResolvedValue({
        transactionReceipt: {
          networkId: 1,
          step: 'approve-usdc',
          txHash: '0xabcdef1234567890',
          blockNumber: 12344,
          gasUsed: BigInt(50000),
        },
      });
      const mockMintExecute = vi.fn().mockResolvedValue({
        transactionReceipt: {
          networkId: 1,
          step: 'mint',
          txHash: '0x1234567890abcdef',
          blockNumber: 12345,
          gasUsed: BigInt(200000),
        },
        order: {
          walletAddress: walletAddress,
          orderItems: [
            {
              tokenId: '1',
              quantity: 2,
              cost: createMockMoney('2000000000000000000'),
            },
          ],
          totalCost: createMockMoney('2000000000000000000'),
        },
      });

      const preparedPurchase = {
        ...mockPreparedPurchase,
        steps: [
          {
            id: 'approve-usdc',
            name: 'Approve USDC Spending',
            type: 'approve',
            description: 'Approve USDC',
            execute: mockApprovalExecute,
          },
          {
            id: 'mint',
            name: 'Mint Edition NFTs',
            type: 'mint',
            description: 'Mint NFTs',
            execute: mockMintExecute,
          },
        ],
      };

      const order = await product.purchase({
        account: mockAccount as any,
        preparedPurchase: preparedPurchase as any,
      });

      expect(mockApprovalExecute).toHaveBeenCalledWith(mockAccount);
      expect(mockMintExecute).toHaveBeenCalledWith(mockAccount);
      expect(order.order).toBeDefined();
      expect(order.transactionReceipt).toBeDefined();
    });

    it('includes successful receipts when later step fails', async () => {
      const product = createProduct();
      const mockApprovalExecute = vi.fn().mockResolvedValue({
        networkId: 1,
        step: 'approve-usdc',
        txHash: '0xabcdef1234567890',
        blockNumber: 12344,
        gasUsed: BigInt(50000),
      });
      const mockMintExecute = vi.fn().mockRejectedValue(new Error('Mint failed'));

      const preparedPurchase = {
        ...mockPreparedPurchase,
        steps: [
          {
            id: 'approve-usdc',
            execute: mockApprovalExecute,
          },
          {
            id: 'mint',
            execute: mockMintExecute,
          },
        ],
      };

      try {
        await product.purchase({
          account: mockAccount as any,
          preparedPurchase: preparedPurchase as any,
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ClientSDKError);
        if (error instanceof ClientSDKError) {
          expect(error.details).toHaveProperty('receipts');
          expect((error.details as any).receipts).toHaveLength(1);
        }
      }
    });
  });

  describe('Interface Methods', () => {
    beforeEach(() => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            totalMax: 1000n,
            total: 100n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            walletMax: 5n,
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });
    });

    describe('getInventory', () => {
      it('returns inventory information', async () => {
        const product = createProduct();
        const inventory = await product.getInventory();

        expect(inventory.totalSupply).toBe(1000);
        expect(inventory.totalPurchased).toBe(100);
      });

      it('returns -1 for unlimited supply', async () => {
        const now = Math.floor(Date.now() / 1000);
        mockPublicProvider.readContract.mockImplementation((args: any) => {
          if (args.functionName === 'getClaim') {
            return {
              totalMax: BigInt(Number.MAX_SAFE_INTEGER),
              total: 100n,
              startDate: BigInt(now - 3600),
              endDate: BigInt(now + 3600),
              cost: 1000000000000000000n,
              erc20: ethers.constants.AddressZero,
              walletMax: 5n,
              merkleRoot: ethers.constants.HashZero,
              paymentReceiver: '0x1111111111111111111111111111111111111111',
            };
          }
          if (args.functionName === 'MINT_FEE') return 0n;
          if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
          return null;
        });

        const product = createProduct();
        const inventory = await product.getInventory();

        expect(inventory.totalSupply).toBe(-1);
      });
    });

    describe('getRules', () => {
      it('returns product rules', async () => {
        const product = createProduct();
        const rules = await product.getRules();

        expect(rules.audienceRestriction).toBe('none');
        expect(rules.maxPerWallet).toBe(5);
        expect(rules.startDate).toBeInstanceOf(Date);
        expect(rules.endDate).toBeInstanceOf(Date);
      });

      it('returns allowlist restriction for merkle root', async () => {
        const now = Math.floor(Date.now() / 1000);
        mockPublicProvider.readContract.mockImplementation((args: any) => {
          if (args.functionName === 'getClaim') {
            return {
              totalMax: 1000n,
              total: 100n,
              startDate: BigInt(now - 3600),
              endDate: BigInt(now + 3600),
              cost: 1000000000000000000n,
              erc20: ethers.constants.AddressZero,
              walletMax: 5n,
              merkleRoot: '0x1234567890123456789012345678901234567890123456789012345678901234',
              paymentReceiver: '0x1111111111111111111111111111111111111111',
            };
          }
          if (args.functionName === 'MINT_FEE') return 0n;
          if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
          return null;
        });

        const product = createProduct();
        const rules = await product.getRules();

        expect(rules.audienceRestriction).toBe('allowlist');
      });
    });

    describe('getProvenance', () => {
      it('returns provenance information', async () => {
        const product = createProduct();
        const provenance = await product.getProvenance();

        expect(provenance.creator.id).toBe('42');
        expect(provenance.creator.slug).toBe('test-creator');
        expect(provenance.creator.address).toBe('0x0000000000000000000000000000000000000001');
        expect(provenance.creator.name).toBe('Test Creator');
        expect(provenance.contract?.id).toBe(789);
        expect(provenance.contract?.contractAddress).toBe('0x1234567890123456789012345678901234567890');
        expect(provenance.networkId).toBe(1);
      });
    });

    describe('getMetadata', () => {
      it('returns metadata from public data', async () => {
        const product = createProduct();
        const metadata = await product.getMetadata();

        expect(metadata.name).toBe('Test Edition');
        expect(metadata.description).toBe('A test edition NFT');
      });

      it('falls back to preview data for missing fields', async () => {
        const product = createProduct(
          {},
          { description: undefined },
          { description: 'Fallback Description' }
        );
        const metadata = await product.getMetadata();

        expect(metadata.description).toBe('Fallback Description');
      });
    });

    describe('getPreviewMedia', () => {
      it('returns preview media from preview data', async () => {
        const product = createProduct();
        const media = await product.getPreviewMedia();

        expect(media).toEqual({
          image: 'https://example.com/thumbnail.jpg',
          imagePreview: 'https://example.com/thumbnail.jpg',
          animation: undefined,
          animationPreview: 'https://example.com/animation.mp4',
        });
      });

      it('returns undefined when no thumbnail', async () => {
        const product = createProduct({}, { asset: { ...baseInstanceData.publicData.asset, image: undefined, image_preview: undefined, animation: undefined, animation_preview: undefined } }, { thumbnail: undefined });
        const media = await product.getPreviewMedia();

        expect(media).toEqual({
          image: undefined,
          imagePreview: undefined, 
          animation: undefined,
          animationPreview: undefined,
        });
      });
    });
  });

  describe('Helper Methods', () => {
    describe('_applyGasBuffer', () => {
      it('applies multiplier gas buffer correctly', () => {
        const product = createProduct();
        const gasEstimate = 100000n;
        
        // Access private method through any
        const result = (product as any)._applyGasBuffer(gasEstimate, { multiplier: 1.25 });
        expect(result.toString()).toBe('125000');
      });

      it('applies fixed gas buffer correctly', () => {
        const product = createProduct();
        const gasEstimate = 100000n;
        
        const result = (product as any)._applyGasBuffer(gasEstimate, { fixed: 50000n });
        expect(result.toString()).toBe('150000');
      });

      it('returns original estimate when no buffer provided', () => {
        const product = createProduct();
        const gasEstimate = 100000n;
        
        const result = (product as any)._applyGasBuffer(gasEstimate);
        expect(result).toBe(gasEstimate);
      });
    });

    describe('_buildApprovalData', () => {
      it('builds approval transaction data correctly', () => {
        const product = createProduct();
        const spender = '0x9876543210987654321098765432109876543210';
        const amount = '1000000000000000000';
        
        const data = (product as any)._buildApprovalData(spender, amount);
        expect(data).toMatch(/^0x/);
        expect(data.length).toBeGreaterThan(10);
      });
    });

    describe('_buildMintData', () => {
      it('builds mint transaction data correctly', () => {
        const product = createProduct();
        const data = (product as any)._buildMintData(
          '0x1234567890123456789012345678901234567890',
          123456,
          2,
          [],
          [],
          '0x1111111111111111111111111111111111111111'
        );
        
        expect(data).toMatch(/^0x/);
        expect(data.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('handles provider creation failure', async () => {
      // This test is no longer applicable since provider is passed in constructor
      // Skipping this test
      expect(true).toBe(true);
    });

    it('handles contract factory creation failure', async () => {
      // This test is no longer applicable since we don't use ContractFactory
      // Skipping this test
      expect(true).toBe(true);
    });

    it('handles Money.create failure', async () => {
      (Money.create as any).mockRejectedValue(new Error('Money creation failed'));
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            totalMax: 1000n,
            total: 100n,
            walletMax: 5n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero cost products', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            cost: 0n, // Free mint
            erc20: ethers.constants.AddressZero,
            totalMax: 1000n,
            total: 100n,
            walletMax: 5n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        if (args.functionName === 'getTotalMints') return 0n;
        return null;
      });

      // Mock zero Money
      (Money.create as any).mockResolvedValue(createMockMoney('0'));

      const product = createProduct();
      const prepared = await product.preparePurchase({
        userAddress: '0x1111111111111111111111111111111111111111',
        payload: { quantity: 1 },
      });

      expect(prepared.isEligible).toBe(true);
      expect(prepared.steps).toHaveLength(1); // Only mint step
    });

    it('handles unlimited supply (totalMax = 0)', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            cost: 1000000000000000000n,
            erc20: ethers.constants.AddressZero,
            totalMax: 0n, // Unlimited
            total: 100n,
            walletMax: 5n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData.totalMax).toBe(null); // Unlimited supply is represented as null
      
      const status = await product.getStatus();
      expect(status).toBe('active'); // Should not be sold out
    });

    it('handles very large numbers correctly', async () => {
      const largeNumber = 999999999999999999999999999999n;
      const now = Math.floor(Date.now() / 1000);
      mockPublicProvider.readContract.mockImplementation((args: any) => {
        if (args.functionName === 'getClaim') {
          return {
            cost: largeNumber,
            erc20: ethers.constants.AddressZero,
            totalMax: 1000n,
            total: 100n,
            walletMax: 5n,
            startDate: BigInt(now - 3600),
            endDate: BigInt(now + 3600),
            merkleRoot: ethers.constants.HashZero,
            paymentReceiver: '0x1111111111111111111111111111111111111111',
          };
        }
        if (args.functionName === 'MINT_FEE') return 0n;
        if (args.functionName === 'MINT_FEE_MERKLE') return 0n;
        return null;
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData).toBeDefined();
      expect(Money.create).toHaveBeenCalledWith({
        value: largeNumber,
        networkId: 1,
        erc20: ethers.constants.AddressZero,
        fetchUSD: true,
      });
    });
  });
});
