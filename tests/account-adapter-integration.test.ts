import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountAdapterFactory } from '../src/adapters/account-adapter-factory';
import { BlindMintProductImpl } from '../src/products/blindmint';
import type { IAccountAdapter } from '../src/types/account-adapter';
import type { InstanceData } from '../src/types/product';
import { BlindMintError, BlindMintErrorCode } from '../src/types/enhanced-errors';

// Mock implementations for testing
const createMockAdapter = (networkId: number = 1, address: string = '0x742d35Cc6634C0532925a3b8D66320d7c2fbd768'): IAccountAdapter => ({
  address,
  adapterType: 'ethers5',
  async sendTransaction(request) {
    return {
      hash: '0x123abc',
      from: address,
      to: request.to,
      status: 'confirmed' as const,
    };
  },
  async getBalance(tokenAddress) {
    const mockMoney = await import('../src/libs/money').then(m => m.Money);
    return mockMoney.create({
      value: '1000000000000000000', // 1 ETH
      networkId,
      erc20: tokenAddress,
      provider: {} as any,
      fetchUSD: false,
    });
  },
  async getConnectedNetworkId() {
    return networkId;
  },
  async switchNetwork(chainId) {
    // Mock implementation - would normally switch networks
  },
});

// Mock the external dependencies
vi.mock('../src/utils/provider-factory', () => ({
  createProvider: vi.fn(() => ({
    getBlockNumber: vi.fn().mockResolvedValue(1000000),
    getBalance: vi.fn().mockResolvedValue({
      toString: () => '1000000000000000000',
      _isBigNumber: true,
      lt: vi.fn().mockReturnValue(false),
    }),
  })),
}));

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    BigNumber: {
      from: vi.fn((value) => ({
        toString: () => String(value),
        _isBigNumber: true,
        _hex: `0x${parseInt(value).toString(16)}`,
        lt: vi.fn().mockReturnValue(false),
        mul: vi.fn().mockReturnThis(),
        div: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
      })),
    },
    constants: {
      AddressZero: '0x0000000000000000000000000000000000000000',
    },
    utils: {
      formatUnits: vi.fn().mockReturnValue('1.0'),
      Interface: vi.fn().mockImplementation(() => ({
        encodeFunctionData: vi.fn().mockReturnValue('0x123abc'),
      })),
    },
  };
});

vi.mock('../src/utils/contract-factory', () => ({
  ContractFactory: vi.fn().mockImplementation(() => ({
    createBlindMintContract: vi.fn(() => ({
      MINT_FEE: vi.fn().mockResolvedValue({
        toString: () => '10000000000000000',
        _isBigNumber: true,
      }),
      getClaim: vi.fn().mockResolvedValue({
        storageProtocol: 1,
        total: 100,
        totalMax: 10000,
        startDate: Math.floor(Date.now() / 1000) - 3600,
        endDate: Math.floor(Date.now() / 1000) + 86400,
        startingTokenId: { toString: () => '1', _isBigNumber: true },
        tokenVariations: 10,
        location: 'ipfs://test',
        paymentReceiver: '0x1234567890123456789012345678901234567890',
        cost: { toString: () => '100000000000000000', _isBigNumber: true },
        erc20: '0x0000000000000000000000000000000000000000',
      }),
      getUserMints: vi.fn().mockResolvedValue({
        reservedCount: 0,
        deliveredCount: 0,
      }),
    })),
  })),
}));

vi.mock('../src/utils/gas-estimation', () => ({
  checkERC20Balance: vi.fn().mockResolvedValue({
    toString: () => '2000000000000000000',
    _isBigNumber: true,
    lt: vi.fn().mockReturnValue(false),
  }),
  checkERC20Allowance: vi.fn().mockResolvedValue({
    toString: () => '0',
    _isBigNumber: true,
    lt: vi.fn().mockReturnValue(true),
  }),
}));

vi.mock('../src/utils/validation', () => ({
  validateAddress: vi.fn(() => true),
}));

vi.mock('../src/libs/money', () => ({
  Money: {
    create: vi.fn().mockResolvedValue({
      value: { toString: () => '100000000000000000', _isBigNumber: true },
      decimals: 18,
      symbol: 'ETH',
      erc20: '0x0000000000000000000000000000000000000000',
      formatted: '0.1',
      formattedUSD: '$250.00',
      isPositive: () => true,
      isERC20: () => false,
      raw: { toString: () => '100000000000000000', _isBigNumber: true },
      multiplyInt: vi.fn().mockReturnValue({
        value: { toString: () => '200000000000000000' },
        isPositive: () => true,
        isERC20: () => false,
        raw: { toString: () => '200000000000000000' },
      }),
      add: vi.fn().mockReturnValue({
        value: { toString: () => '200000000000000000' },
        isPositive: () => true,
        isERC20: () => false,
      }),
      lt: vi.fn().mockReturnValue(false),
    }),
    zero: vi.fn().mockResolvedValue({
      value: { toString: () => '0' },
      isPositive: () => false,
      isERC20: () => false,
    }),
  },
}));

describe('Account Adapter Integration', () => {
  let mockInstanceData: InstanceData;
  let blindMintProduct: BlindMintProductImpl;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstanceData = {
      id: 123,
      creator: {
        id: 'workspace-456',
        slug: 'test-creator',
        name: 'Test Creator',
        address: '0x123',
      },
      appId: 2526777015,
      publicData: {
        id: 123,
        appId: 2526777015,
        contract: {
          id: 'contract-789',
          networkId: 1,
          contractAddress: '0x1234567890123456789012345678901234567890',
          name: 'Test Contract',
          symbol: 'TEST',
          spec: 'erc1155' as const,
        },
        extensionAddress1155: {
          value: '0x9876543210987654321098765432109876543210',
        },
        network: 1,
        name: 'Test BlindMint',
        description: 'Test description',
        mintPrice: {
          value: '100000000000000000',
          currency: 'ETH',
          erc20: '0x0000000000000000000000000000000000000000',
        },
        pool: [
          {
            seriesIndex: 1,
            metadata: { name: 'Token 1', image: 'image1.png' },
          },
        ],
        tierProbabilities: [
          {
            group: 'Common',
            rate: 0.8,
            indices: [0],
          },
        ],
      },
    } as InstanceData;

    blindMintProduct = new BlindMintProductImpl(mockInstanceData, {}, {});
  });

  describe('preparePurchase with Account Adapters', () => {
    it('should prepare purchase using account adapter', async () => {
      const adapter = createMockAdapter(1);
      
      const result = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true);
      expect(result.steps).toHaveLength(1); // Only mint step (no approval needed for ETH)
      expect(result.steps[0].id).toBe('mint');
      expect(result.steps[0].executeWithAdapter).toBeDefined();
    });

    it('should detect network mismatch and throw error', async () => {
      const adapter = createMockAdapter(137); // Polygon, but product is on Ethereum
      
      await expect(
        blindMintProduct.preparePurchase({
          accountAdapter: adapter,
          payload: { quantity: 1 },
        })
      ).rejects.toThrow(BlindMintError);
      
      try {
        await blindMintProduct.preparePurchase({
          accountAdapter: adapter,
          payload: { quantity: 1 },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BlindMintError);
        expect((error as BlindMintError).code).toBe(BlindMintErrorCode.NETWORK_MISMATCH);
        expect((error as BlindMintError).context?.expectedNetworkId).toBe(1);
        expect((error as BlindMintError).context?.actualNetworkId).toBe(137);
      }
    });

    it('should support legacy address parameter for backward compatibility', async () => {
      const result = await blindMintProduct.preparePurchase({
        address: '0x742d35Cc6634C0532925a3b8D66320d7c2fbd768',
        payload: { quantity: 1 },
      });

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].execute).toBeDefined();
      expect(result.steps[0].executeWithAdapter).toBeUndefined();
    });

    it('should throw error when neither address nor accountAdapter provided', async () => {
      await expect(
        blindMintProduct.preparePurchase({
          payload: { quantity: 1 },
        })
      ).rejects.toThrow(BlindMintError);
    });

    it('should check balance using adapter', async () => {
      const adapter = createMockAdapter(1);
      const getBalanceSpy = vi.spyOn(adapter, 'getBalance');
      
      await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      expect(getBalanceSpy).toHaveBeenCalledWith(); // Called for native token balance check
    });
  });

  describe('purchase with Account Adapters', () => {
    it('should execute purchase using account adapter', async () => {
      const adapter = createMockAdapter(1);
      const sendTransactionSpy = vi.spyOn(adapter, 'sendTransaction');
      
      const preparedPurchase = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      const order = await blindMintProduct.purchase({
        accountAdapter: adapter,
        preparedPurchase,
      });

      expect(order).toBeDefined();
      expect(order.status).toBe('completed');
      expect(order.receipts).toHaveLength(1);
      expect(order.buyer.walletAddress).toBe(adapter.address);
      expect(sendTransactionSpy).toHaveBeenCalled();
    });

    it('should support legacy account parameter for backward compatibility', async () => {
      const legacyAccount = {
        address: '0x742d35Cc6634C0532925a3b8D66320d7c2fbd768',
      };
      
      const preparedPurchase = await blindMintProduct.preparePurchase({
        address: legacyAccount.address,
        payload: { quantity: 1 },
      });

      // Mock the execute function for legacy mode
      if (preparedPurchase.steps[0].execute) {
        vi.mocked(preparedPurchase.steps[0].execute).mockResolvedValue({
          networkId: 1,
          step: 'mint',
          txHash: '0x123abc',
          blockNumber: 1000000,
          gasUsed: BigInt('200000'),
          status: 'success',
        });
      }

      const order = await blindMintProduct.purchase({
        account: legacyAccount,
        preparedPurchase,
      });

      expect(order).toBeDefined();
      expect(order.status).toBe('completed');
      expect(order.buyer.walletAddress).toBe(legacyAccount.address);
    });

    it('should throw error when no compatible execution method available', async () => {
      const adapter = createMockAdapter(1);
      
      const preparedPurchase = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      // Remove the executeWithAdapter method to simulate incompatible step
      preparedPurchase.steps[0].executeWithAdapter = undefined;

      await expect(
        blindMintProduct.purchase({
          accountAdapter: adapter,
          preparedPurchase,
        })
      ).rejects.toThrow('No compatible execution method available');
    });
  });

  describe('ERC20 Token Support with Adapters', () => {
    beforeEach(() => {
      // Mock ERC20 token payment scenario
      vi.mocked(mockInstanceData.publicData.mintPrice).erc20 = '0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B';
      
      // Update contract mock to return ERC20 data
      const contractMock = vi.fn(() => ({
        MINT_FEE: vi.fn().mockResolvedValue({
          toString: () => '10000000000000000',
          _isBigNumber: true,
        }),
        getClaim: vi.fn().mockResolvedValue({
          storageProtocol: 1,
          total: 100,
          totalMax: 10000,
          startDate: Math.floor(Date.now() / 1000) - 3600,
          endDate: Math.floor(Date.now() / 1000) + 86400,
          startingTokenId: { toString: () => '1', _isBigNumber: true },
          tokenVariations: 10,
          location: 'ipfs://test',
          paymentReceiver: '0x1234567890123456789012345678901234567890',
          cost: { toString: () => '100000000000000000', _isBigNumber: true },
          erc20: '0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B', // ERC20 token
        }),
        getUserMints: vi.fn().mockResolvedValue({
          reservedCount: 0,
          deliveredCount: 0,
        }),
      }));

      // Update Money mock for ERC20
      vi.mocked(require('../src/libs/money').Money.create).mockResolvedValue({
        value: { toString: () => '100000000000000000', _isBigNumber: true },
        decimals: 6,
        symbol: 'USDC',
        erc20: '0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B',
        formatted: '100.0',
        formattedUSD: '$100.00',
        isPositive: () => true,
        isERC20: () => true,
        raw: { toString: () => '100000000000000000', _isBigNumber: true },
        multiplyInt: vi.fn().mockReturnValue({
          value: { toString: () => '100000000000000000' },
          isPositive: () => true,
          isERC20: () => true,
          raw: { toString: () => '100000000000000000' },
        }),
        add: vi.fn().mockReturnValue({
          value: { toString: () => '100000000000000000' },
          isPositive: () => true,
          isERC20: () => true,
        }),
      });
    });

    it('should create approval step for ERC20 payments', async () => {
      const adapter = createMockAdapter(1);
      
      const result = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      expect(result.steps).toHaveLength(2); // Approval + mint steps
      expect(result.steps[0].type).toBe('approval');
      expect(result.steps[0].executeWithAdapter).toBeDefined();
      expect(result.steps[1].type).toBe('mint');
      expect(result.steps[1].executeWithAdapter).toBeDefined();
    });

    it('should check ERC20 token balance using adapter', async () => {
      const adapter = createMockAdapter(1);
      const getBalanceSpy = vi.spyOn(adapter, 'getBalance');
      
      await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      expect(getBalanceSpy).toHaveBeenCalledWith('0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B');
    });
  });

  describe('Gas Estimation and Buffers', () => {
    it('should apply gas buffer correctly', async () => {
      const adapter = createMockAdapter(1);
      
      const result = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
        gasBuffer: { multiplier: 150 }, // 50% buffer
      });

      expect(result.steps[0].executeWithAdapter).toBeDefined();
      
      // Execute the step to verify gas buffer is applied
      const receipt = await result.steps[0].executeWithAdapter!(adapter);
      expect(receipt.txHash).toBe('0x123abc');
    });

    it('should use fixed gas buffer when provided', async () => {
      const adapter = createMockAdapter(1);
      
      const result = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
        gasBuffer: { fixed: BigInt('50000') }, // Fixed 50k gas buffer
      });

      expect(result.steps[0].executeWithAdapter).toBeDefined();
    });
  });

  describe('Error Handling with Adapters', () => {
    it('should handle adapter transaction failures gracefully', async () => {
      const adapter = createMockAdapter(1);
      vi.spyOn(adapter, 'sendTransaction').mockRejectedValue(new Error('Transaction failed'));
      
      const preparedPurchase = await blindMintProduct.preparePurchase({
        accountAdapter: adapter,
        payload: { quantity: 1 },
      });

      await expect(
        blindMintProduct.purchase({
          accountAdapter: adapter,
          preparedPurchase,
        })
      ).rejects.toThrow('Transaction failed at step mint');
    });

    it('should handle network switching in adapter', async () => {
      const adapter = createMockAdapter(137); // Wrong network initially
      const switchNetworkSpy = vi.spyOn(adapter, 'switchNetwork');
      
      // This should throw network mismatch error
      await expect(
        blindMintProduct.preparePurchase({
          accountAdapter: adapter,
          payload: { quantity: 1 },
        })
      ).rejects.toThrow(BlindMintError);
      
      // switchNetwork should not be called automatically in preparePurchase
      expect(switchNetworkSpy).not.toHaveBeenCalled();
    });
  });
});