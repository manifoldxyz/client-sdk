import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { EditionProduct, isEditionProduct } from '../../src/products/edition';
import { AppId, AppType } from '../../src/types/common';
import { ClientSDKError, ErrorCode } from '../../src/types/errors';
import type { InstanceData, EditionPublicData, EditionOnchainData } from '../../src/types/product';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client';
import { Money } from '../../src/libs/money';
import * as ethers from 'ethers';

// Mock dependencies
vi.mock('../../src/utils/provider-factory');
vi.mock('../../src/utils/contract-factory');
vi.mock('../../src/libs/money');
vi.mock('../../src/utils/gas-estimation');
vi.mock('../../src/utils/validation');

// Import mocked modules
import { createProvider } from '../../src/utils/provider-factory';
import { ContractFactory } from '../../src/utils/contract-factory';
import { estimateGas } from '../../src/utils/gas-estimation';
import { validateAddress } from '../../src/utils/validation';

const mockCreateProvider = createProvider as MockedFunction<typeof createProvider>;
const mockContractFactory = ContractFactory as MockedFunction<typeof ContractFactory>;
const mockEstimateGas = estimateGas as MockedFunction<typeof estimateGas>;
const mockValidateAddress = validateAddress as MockedFunction<typeof validateAddress>;

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
    extensionAddress: '0x9876543210987654321098765432109876543210',
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

// Mock contracts
const createMockClaimContract = () => ({
  getClaim: vi.fn(),
  MINT_FEE: vi.fn(),
  MINT_FEE_MERKLE: vi.fn(),
  getTotalMints: vi.fn(),
  mintProxy: vi.fn(),
  estimateGas: vi.fn(),
});

const createMockERC20Contract = () => ({
  balanceOf: vi.fn(),
  allowance: vi.fn(),
  approve: vi.fn(),
  symbol: vi.fn(),
  decimals: vi.fn(),
});

// Mock Money class
const createMockMoney = (value: string = '1000000000000000000', isERC20: boolean = false, erc20Address?: string) => {
  const mockMoney = {
    raw: ethers.BigNumber.from(value),
    formatted: '1.0',
    symbol: isERC20 ? 'USDC' : 'ETH',
    decimals: isERC20 ? 6 : 18,
    erc20: isERC20 ? (erc20Address || '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2') : ethers.constants.AddressZero,
    isPositive: vi.fn().mockReturnValue(true),
    isERC20: vi.fn().mockReturnValue(isERC20),
    multiplyInt: vi.fn().mockImplementation((quantity: number) => createMockMoney((ethers.BigNumber.from(value).mul(quantity)).toString(), isERC20, erc20Address)),
    add: vi.fn().mockImplementation((other: any) => createMockMoney((ethers.BigNumber.from(value).add(other.raw)).toString(), isERC20, erc20Address)),
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
  return new EditionProduct(instanceData, previewData);
}

describe('EditionProduct', () => {
  let mockProvider: any;
  let mockContractFactoryInstance: any;
  let mockClaimContract: any;
  let mockERC20Contract: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock provider
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      getBalance: vi.fn().mockResolvedValue(ethers.BigNumber.from('10000000000000000000')),
      call: vi.fn(),
    };

    // Setup mock contracts
    mockClaimContract = createMockClaimContract();
    mockERC20Contract = createMockERC20Contract();

    // Setup mock contract factory
    mockContractFactoryInstance = {
      createEditionContract: vi.fn().mockReturnValue(mockClaimContract),
      createEdition1155Contract: vi.fn().mockReturnValue(mockClaimContract),
      createERC20Contract: vi.fn().mockReturnValue(mockERC20Contract),
    };

    // Setup mocks
    mockCreateProvider.mockReturnValue(mockProvider);
    mockContractFactory.mockImplementation(() => mockContractFactoryInstance);
    mockValidateAddress.mockReturnValue(true);
    mockEstimateGas.mockResolvedValue(ethers.BigNumber.from('200000'));

    // Setup Money mock
    const mockMoneyClass = Money as any;
    mockMoneyClass.create = vi.fn().mockResolvedValue(createMockMoney());
    mockMoneyClass.zero = vi.fn().mockResolvedValue(createMockMoney('0'));
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
      expect(product.data.publicData.extensionAddress).toBe('0x9876543210987654321098765432109876543210');
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
    const mockClaimData = {
      cost: ethers.BigNumber.from('1000000000000000000'), // 1 ETH
      erc20: ethers.constants.AddressZero,
      totalMax: 1000,
      total: 100,
      walletMax: 5,
      startDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      endDate: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      merkleRoot: ethers.constants.HashZero,
      paymentReceiver: '0x1111111111111111111111111111111111111111',
      signingAddress: '0x2222222222222222222222222222222222222222',
      location: 'ipfs://QmXxx',
      storageProtocol: 1,
      contractVersion: 7,
      identical: true, // For ERC721
    };

    beforeEach(() => {
      mockClaimContract.getClaim.mockResolvedValue(mockClaimData);
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('500000000000000000')); // 0.5 ETH platform fee
      mockClaimContract.MINT_FEE_MERKLE.mockResolvedValue(ethers.BigNumber.from('690000000000000000')); // 0.69 ETH merkle fee
    });

    it('fetches and caches onchain data successfully', async () => {
      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(mockClaimContract.getClaim).toHaveBeenCalledWith(
        baseInstanceData.publicData.contract.contractAddress,
        123456
      );
      expect(onchainData.totalSupply).toBe(1000);
      expect(onchainData.totalMinted).toBe(100);
      expect(onchainData.walletMax).toBe(5);
      expect(onchainData.audienceType).toBe('None'); // No merkle root
      expect(product.onchainData).toBe(onchainData);
    });

    it('returns cached data on subsequent calls', async () => {
      const product = createProduct();
      await product.fetchOnchainData();
      await product.fetchOnchainData();

      expect(mockClaimContract.getClaim).toHaveBeenCalledTimes(1);
    });

    it('forces refresh when force=true', async () => {
      const product = createProduct();
      await product.fetchOnchainData();
      await product.fetchOnchainData(true);

      expect(mockClaimContract.getClaim).toHaveBeenCalledTimes(2);
    });

    it('detects allowlist audience type with merkle root', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        ...mockClaimData,
        merkleRoot: '0x1234567890123456789012345678901234567890123456789012345678901234',
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData.audienceType).toBe('Allowlist');
    });

    it('handles ERC20 payment token', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      mockClaimContract.getClaim.mockResolvedValue({
        ...mockClaimData,
        erc20: erc20Address,
      });

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(Money.create).toHaveBeenCalledWith({
        value: mockClaimData.cost,
        networkId: 1,
        erc20: erc20Address,
        provider: mockProvider,
        fetchUSD: true,
      });
    });

    it('throws error when contract call fails', async () => {
      mockClaimContract.getClaim.mockRejectedValue(new Error('Contract call failed'));

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });

    it('uses Edition contract for both ERC721 and ERC1155 tokens', async () => {
      // Test ERC1155
      const product1155 = createProduct({}, { contract: { ...baseInstanceData.publicData.contract, spec: 'erc1155' } });
      await product1155.fetchOnchainData();
      expect(mockContractFactoryInstance.createEditionContract).toHaveBeenCalledWith('0x9876543210987654321098765432109876543210');

      // Clear mock calls
      mockContractFactoryInstance.createEditionContract.mockClear();

      // Test ERC721
      const product721 = createProduct();
      await product721.fetchOnchainData();
      expect(mockContractFactoryInstance.createEditionContract).toHaveBeenCalledWith('0x9876543210987654321098765432109876543210');
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      const now = Math.floor(Date.now() / 1000);
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: now - 3600, // 1 hour ago
        endDate: now + 3600, // 1 hour from now
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));
    });

    it('returns "active" for ongoing sale', async () => {
      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('active');
    });

    it('returns "upcoming" for future sale', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 0,
        startDate: futureTime,
        endDate: futureTime + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('upcoming');
    });

    it('returns "ended" for past sale', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: pastTime - 3600,
        endDate: pastTime,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('ended');
    });

    it('returns "sold-out" when total minted equals total supply', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 1000, // Sold out
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      const status = await product.getStatus();
      expect(status).toBe('sold-out');
    });
  });

  describe('getAllocations', () => {
    beforeEach(() => {
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));
      mockClaimContract.getTotalMints.mockResolvedValue(2); // Wallet has minted 2 already
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
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 105, // Only 5 left total
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 10,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      const allocations = await product.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(allocations.quantity).toBe(5); // Limited by remaining supply
    });

    it('handles getTotalMints failure gracefully', async () => {
      mockClaimContract.getTotalMints.mockRejectedValue(new Error('Contract call failed'));

      const product = createProduct();
      const allocations = await product.getAllocations({
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(allocations.isEligible).toBe(true);
      expect(allocations.quantity).toBe(5); // Falls back to wallet max
    });
  });

  describe('preparePurchase', () => {
    const walletAddress = '0x1111111111111111111111111111111111111111';

    beforeEach(() => {
      // Setup successful onchain data
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('500000000000000000'));
      mockClaimContract.getTotalMints.mockResolvedValue(0);

      // Setup ERC20 contract responses
      mockERC20Contract.balanceOf.mockResolvedValue(ethers.BigNumber.from('10000000000')); // 10 USDC
      mockERC20Contract.allowance.mockResolvedValue(ethers.BigNumber.from('0'));
    });

    it('prepares purchase for native currency successfully', async () => {
      const product = createProduct();
      const prepared = await product.preparePurchase({
        address: walletAddress,
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
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('2000000'), // 2 USDC (6 decimals)
        erc20: erc20Address,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      // Mock Money.create for ERC20
      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      const prepared = await product.preparePurchase({
        address: walletAddress,
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
        address: 'invalid-address',
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sale not started', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 0,
        startDate: Math.floor(Date.now() / 1000) + 3600, // Future
        endDate: Math.floor(Date.now() / 1000) + 7200,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        address: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sale ended', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 7200,
        endDate: Math.floor(Date.now() / 1000) - 3600, // Past
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        address: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error when sold out', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 1000, // Sold out
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      const product = createProduct();
      await expect(product.preparePurchase({
        address: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('throws error for insufficient ERC20 balance', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('2000000'), // 2 USDC
        erc20: erc20Address,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      // Insufficient balance
      mockERC20Contract.balanceOf.mockResolvedValue(ethers.BigNumber.from('1000000')); // Only 1 USDC

      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      await expect(product.preparePurchase({
        address: walletAddress,
        payload: { quantity: 1 },
      })).rejects.toThrow(ClientSDKError);
    });

    it('applies gas buffer correctly', async () => {
      const product = createProduct();
      const prepared = await product.preparePurchase({
        address: walletAddress,
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
        address: walletAddress,
        payload: { quantity: 1 },
        account: mockAccount as any,
      });

      expect(prepared.isEligible).toBe(true);
      expect(mockAccount.getBalance).toHaveBeenCalledWith(1);
    });

    it('skips approval step when sufficient allowance exists', async () => {
      const erc20Address = '0xA0b86a33E6417a7dA5B4C1D35aF7E7f2F2a0F2F2';
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('2000000'), // 2 USDC
        erc20: erc20Address,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });

      // Sufficient allowance
      mockERC20Contract.allowance.mockResolvedValue(ethers.BigNumber.from('10000000')); // 10 USDC

      const mockERC20Money = createMockMoney('2000000', true, erc20Address);
      (Money.create as any).mockResolvedValue(mockERC20Money);

      const product = createProduct();
      const prepared = await product.preparePurchase({
        address: walletAddress,
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
      const mockStepExecute = vi.fn().mockResolvedValue({
        networkId: 1,
        step: 'mint',
        txHash: '0x1234567890abcdef',
        blockNumber: 12345,
        gasUsed: BigInt(200000),
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
      expect(order.status).toBe('completed');
      expect(order.receipts).toHaveLength(1);
      expect(order.buyer.walletAddress).toBe('0x1111111111111111111111111111111111111111');
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
      const mockApprovalExecute = vi.fn().mockResolvedValue({
        networkId: 1,
        step: 'approve-usdc',
        txHash: '0xabcdef1234567890',
        blockNumber: 12344,
        gasUsed: BigInt(50000),
      });
      const mockMintExecute = vi.fn().mockResolvedValue({
        networkId: 1,
        step: 'mint',
        txHash: '0x1234567890abcdef',
        blockNumber: 12345,
        gasUsed: BigInt(200000),
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
      expect(order.receipts).toHaveLength(2);
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
      mockClaimContract.getClaim.mockResolvedValue({
        totalMax: 1000,
        total: 100,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        walletMax: 5,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));
    });

    describe('getInventory', () => {
      it('returns inventory information', async () => {
        const product = createProduct();
        const inventory = await product.getInventory();

        expect(inventory.totalSupply).toBe(1000);
        expect(inventory.totalPurchased).toBe(100);
      });

      it('returns -1 for unlimited supply', async () => {
        mockClaimContract.getClaim.mockResolvedValue({
          totalMax: Number.MAX_SAFE_INTEGER,
          total: 100,
          startDate: Math.floor(Date.now() / 1000) - 3600,
          endDate: Math.floor(Date.now() / 1000) + 3600,
          cost: ethers.BigNumber.from('1000000000000000000'),
          erc20: ethers.constants.AddressZero,
          walletMax: 5,
          merkleRoot: ethers.constants.HashZero,
          paymentReceiver: '0x1111111111111111111111111111111111111111',
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
        mockClaimContract.getClaim.mockResolvedValue({
          totalMax: 1000,
          total: 100,
          startDate: Math.floor(Date.now() / 1000) - 3600,
          endDate: Math.floor(Date.now() / 1000) + 3600,
          cost: ethers.BigNumber.from('1000000000000000000'),
          erc20: ethers.constants.AddressZero,
          walletMax: 5,
          merkleRoot: '0x1234567890123456789012345678901234567890123456789012345678901234',
          paymentReceiver: '0x1111111111111111111111111111111111111111',
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
        });
      });

      it('returns undefined when no thumbnail', async () => {
        const product = createProduct({}, {}, { thumbnail: undefined });
        const media = await product.getPreviewMedia();

        expect(media).toBeUndefined();
      });
    });
  });

  describe('Helper Methods', () => {
    describe('_applyGasBuffer', () => {
      it('applies multiplier gas buffer correctly', () => {
        const product = createProduct();
        const gasEstimate = ethers.BigNumber.from('100000');
        
        // Access private method through any
        const result = (product as any)._applyGasBuffer(gasEstimate, { multiplier: 125 });
        expect(result.toString()).toBe('125000');
      });

      it('applies fixed gas buffer correctly', () => {
        const product = createProduct();
        const gasEstimate = ethers.BigNumber.from('100000');
        
        const result = (product as any)._applyGasBuffer(gasEstimate, { fixed: ethers.BigNumber.from('50000') });
        expect(result.toString()).toBe('150000');
      });

      it('returns original estimate when no buffer provided', () => {
        const product = createProduct();
        const gasEstimate = ethers.BigNumber.from('100000');
        
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
      mockCreateProvider.mockImplementation(() => {
        throw new Error('Provider creation failed');
      });

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });

    it('handles contract factory creation failure', async () => {
      mockContractFactory.mockImplementation(() => {
        throw new Error('Contract factory creation failed');
      });

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });

    it('handles Money.create failure', async () => {
      (Money.create as any).mockRejectedValue(new Error('Money creation failed'));
      mockClaimContract.getClaim.mockResolvedValue({
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        totalMax: 1000,
        total: 100,
        walletMax: 5,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));

      const product = createProduct();
      await expect(product.fetchOnchainData()).rejects.toThrow(ClientSDKError);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero cost products', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        cost: ethers.BigNumber.from('0'), // Free mint
        erc20: ethers.constants.AddressZero,
        totalMax: 1000,
        total: 100,
        walletMax: 5,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));
      mockClaimContract.getTotalMints.mockResolvedValue(0);

      // Mock zero Money
      (Money.create as any).mockResolvedValue(createMockMoney('0'));

      const product = createProduct();
      const prepared = await product.preparePurchase({
        address: '0x1111111111111111111111111111111111111111',
        payload: { quantity: 1 },
      });

      expect(prepared.isEligible).toBe(true);
      expect(prepared.steps).toHaveLength(1); // Only mint step
    });

    it('handles unlimited supply (totalMax = 0)', async () => {
      mockClaimContract.getClaim.mockResolvedValue({
        cost: ethers.BigNumber.from('1000000000000000000'),
        erc20: ethers.constants.AddressZero,
        totalMax: 0, // Unlimited
        total: 100,
        walletMax: 5,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData.totalSupply).toBe(Number.MAX_SAFE_INTEGER); // Unlimited supply is represented as MAX_SAFE_INTEGER
      
      const status = await product.getStatus();
      expect(status).toBe('active'); // Should not be sold out
    });

    it('handles very large numbers correctly', async () => {
      const largeNumber = ethers.BigNumber.from('999999999999999999999999999999');
      mockClaimContract.getClaim.mockResolvedValue({
        cost: largeNumber,
        erc20: ethers.constants.AddressZero,
        totalMax: 1000,
        total: 100,
        walletMax: 5,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 3600,
        merkleRoot: ethers.constants.HashZero,
        paymentReceiver: '0x1111111111111111111111111111111111111111',
      });
      mockClaimContract.MINT_FEE.mockResolvedValue(ethers.BigNumber.from('0'));

      const product = createProduct();
      const onchainData = await product.fetchOnchainData();

      expect(onchainData).toBeDefined();
      expect(Money.create).toHaveBeenCalledWith({
        value: largeNumber,
        networkId: 1,
        erc20: ethers.constants.AddressZero,
        provider: mockProvider,
        fetchUSD: true,
      });
    });
  });
});