import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode } from '../../src/types/errors';

describe('BurnRedeemProduct', () => {
  let burnRedeemProduct: any;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = {
      getBalance: vi.fn(),
      estimateGas: vi.fn(),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
    };

    const instanceData = {
      id: 789012,
      appId: 2, // BurnRedeem app ID
      publicData: {
        network: 1,
        redeemContract: {
          id: 2,
          name: 'Redeemed NFT',
          symbol: 'REDEEM',
          contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          networkId: 1,
          spec: 'erc1155',
        },
        extensionAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        redeemAsset: {
          name: 'Redeemed Asset',
          description: 'Asset received after burning',
          image: 'https://example.com/redeem-image.png',
        },
      },
    };

    const previewData = {
      title: 'Burn & Redeem NFT',
      description: 'Burn your old NFT to get a new one',
      thumbnail: 'https://example.com/burn-thumbnail.png',
    };

    burnRedeemProduct = {
      id: instanceData.id,
      type: 'burn-redeem',
      data: instanceData,
      previewData,
      onchainData: null,
      getAllocations: vi.fn(),
      preparePurchase: vi.fn(),
      purchase: vi.fn(),
      getStatus: vi.fn(),
      fetchOnchainData: vi.fn(),
      getBurnRequirements: vi.fn(),
      validateBurnTokens: vi.fn(),
      getRedeemableTokens: vi.fn(),
    };
  });

  describe('getBurnRequirements', () => {
    it('returns burn requirements for the product', async () => {
      burnRedeemProduct.getBurnRequirements.mockResolvedValue({
        burnSet: {
          items: [
            {
              quantity: 1,
              burnSpec: 'manifold',
              tokenSpec: 'erc721',
              contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
              validationType: 'any',
            },
          ],
          requiredCount: 1,
        },
      });

      const requirements = await burnRedeemProduct.getBurnRequirements();
      
      expect(requirements.burnSet.items).toHaveLength(1);
      expect(requirements.burnSet.requiredCount).toBe(1);
      expect(requirements.burnSet.items[0].tokenSpec).toBe('erc721');
    });

    it('handles multiple burn requirements', async () => {
      burnRedeemProduct.getBurnRequirements.mockResolvedValue({
        burnSet: {
          items: [
            {
              quantity: 2,
              burnSpec: 'openZeppelin',
              tokenSpec: 'erc1155',
              contractAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
              validationType: 'range',
              minTokenId: '100',
              maxTokenId: '200',
            },
            {
              quantity: 1,
              burnSpec: 'manifold',
              tokenSpec: 'erc721',
              contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
              validationType: 'merkleTree',
              merkleRoot: '0x1234567890abcdef',
            },
          ],
          requiredCount: 2,
        },
      });

      const requirements = await burnRedeemProduct.getBurnRequirements();
      
      expect(requirements.burnSet.items).toHaveLength(2);
      expect(requirements.burnSet.items[0].validationType).toBe('range');
      expect(requirements.burnSet.items[1].validationType).toBe('merkleTree');
    });
  });

  describe('validateBurnTokens', () => {
    it('validates eligible burn tokens', async () => {
      burnRedeemProduct.validateBurnTokens.mockResolvedValue({
        isValid: true,
        eligibleTokens: ['1', '2', '3'],
        ineligibleTokens: [],
        reason: undefined,
      });

      const result = await burnRedeemProduct.validateBurnTokens({
        address: '0x1111111111111111111111111111111111111111',
        tokenIds: ['1', '2', '3'],
      });

      expect(result.isValid).toBe(true);
      expect(result.eligibleTokens).toHaveLength(3);
    });

    it('identifies ineligible tokens', async () => {
      burnRedeemProduct.validateBurnTokens.mockResolvedValue({
        isValid: false,
        eligibleTokens: ['1', '2'],
        ineligibleTokens: ['999'],
        reason: 'Token 999 is not eligible for burning',
      });

      const result = await burnRedeemProduct.validateBurnTokens({
        address: '0x1111111111111111111111111111111111111111',
        tokenIds: ['1', '2', '999'],
      });

      expect(result.isValid).toBe(false);
      expect(result.ineligibleTokens).toContain('999');
      expect(result.reason).toContain('not eligible');
    });
  });

  describe('preparePurchase', () => {
    it('prepares burn-redeem transaction', async () => {
      const mockPreparedPurchase = {
        cost: {
          total: {
            amount: '0',
            formatted: '0 ETH',
            currency: 'ETH',
          },
        },
        steps: [
          {
            id: 'approve_burn',
            name: 'Approve Burn',
            type: 'approve',
            description: 'Approve tokens for burning',
            execute: vi.fn(),
          },
          {
            id: 'burn_redeem',
            name: 'Burn & Redeem',
            type: 'burn-redeem',
            description: 'Burn 1 token to redeem new NFT',
            execute: vi.fn(),
          },
        ],
        burnTokens: ['1'],
        redeemCount: 1,
      };

      burnRedeemProduct.preparePurchase.mockResolvedValue(mockPreparedPurchase);

      const result = await burnRedeemProduct.preparePurchase({
        address: '0x1111111111111111111111111111111111111111',
        payload: {
          burnTokenIds: ['1'],
        },
      });

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].type).toBe('approve');
      expect(result.steps[1].type).toBe('burn-redeem');
      expect(result.burnTokens).toEqual(['1']);
    });

    it('handles multiple token burns', async () => {
      burnRedeemProduct.preparePurchase.mockResolvedValue({
        cost: {
          total: {
            amount: '100000000000000000',
            formatted: '0.1 ETH',
            currency: 'ETH',
          },
        },
        steps: [
          {
            id: 'approve_burn_multiple',
            type: 'approve',
            description: 'Approve multiple tokens for burning',
          },
          {
            id: 'burn_redeem_multiple',
            type: 'burn-redeem',
            description: 'Burn 3 tokens to redeem new NFTs',
          },
        ],
        burnTokens: ['10', '20', '30'],
        redeemCount: 3,
      });

      const result = await burnRedeemProduct.preparePurchase({
        address: '0x1111111111111111111111111111111111111111',
        payload: {
          burnTokenIds: ['10', '20', '30'],
        },
      });

      expect(result.burnTokens).toHaveLength(3);
      expect(result.redeemCount).toBe(3);
    });

    it('throws error for invalid burn tokens', async () => {
      burnRedeemProduct.preparePurchase.mockRejectedValue({
        code: ErrorCode.INVALID_INPUT,
        message: 'Invalid burn tokens provided',
      });

      await expect(
        burnRedeemProduct.preparePurchase({
          address: '0x1111111111111111111111111111111111111111',
          payload: {
            burnTokenIds: ['invalid'],
          },
        })
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });
  });

  describe('getRedeemableTokens', () => {
    it('returns tokens eligible for redemption', async () => {
      burnRedeemProduct.getRedeemableTokens.mockResolvedValue({
        tokens: [
          {
            tokenId: '100',
            contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
            metadata: {
              name: 'Token #100',
              image: 'https://example.com/token100.png',
            },
          },
          {
            tokenId: '101',
            contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
            metadata: {
              name: 'Token #101',
              image: 'https://example.com/token101.png',
            },
          },
        ],
        totalCount: 2,
      });

      const result = await burnRedeemProduct.getRedeemableTokens({
        address: '0x1111111111111111111111111111111111111111',
      });

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].tokenId).toBe('100');
      expect(result.totalCount).toBe(2);
    });

    it('returns empty array for address with no tokens', async () => {
      burnRedeemProduct.getRedeemableTokens.mockResolvedValue({
        tokens: [],
        totalCount: 0,
      });

      const result = await burnRedeemProduct.getRedeemableTokens({
        address: '0x2222222222222222222222222222222222222222',
      });

      expect(result.tokens).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('purchase', () => {
    it('executes burn-redeem transaction', async () => {
      const mockOrder = {
        id: 'order_burn_123',
        status: 'completed',
        receipts: [
          {
            txHash: '0xburn123',
            status: 'success',
            blockNumber: 12346,
            gasUsed: '250000',
          },
        ],
        burnedTokens: ['1'],
        redeemedTokens: ['1001'],
      };

      burnRedeemProduct.purchase.mockResolvedValue(mockOrder);

      const mockAccount = {
        getAddress: vi.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
        sendTransaction: vi.fn().mockResolvedValue({ hash: '0xburn123' }),
      };

      const preparedPurchase = {
        steps: [
          { execute: vi.fn().mockResolvedValue({ hash: '0xapprove123' }) },
          { execute: vi.fn().mockResolvedValue({ hash: '0xburn123' }) },
        ],
      };

      const result = await burnRedeemProduct.purchase({
        account: mockAccount,
        preparedPurchase,
      });

      expect(result.status).toBe('completed');
      expect(result.burnedTokens).toEqual(['1']);
      expect(result.redeemedTokens).toEqual(['1001']);
    });
  });

  describe('fetchOnchainData', () => {
    it('fetches burn-redeem on-chain data', async () => {
      const mockOnchainData = {
        totalSupply: 500,
        totalMinted: 100,
        walletMax: 3,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-11-30'),
        audienceType: 'None',
        cost: {
          amount: '0',
          currency: 'ETH',
          formatted: '0 ETH',
        },
        paymentReceiver: '0x0000000000000000000000000000000000000000',
        burnSet: {
          items: [
            {
              quantity: 1,
              burnSpec: 'manifold',
              tokenSpec: 'erc721',
              contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
              validationType: 'any',
            },
          ],
          requiredCount: 1,
        },
      };

      burnRedeemProduct.fetchOnchainData.mockResolvedValue(mockOnchainData);

      const data = await burnRedeemProduct.fetchOnchainData();
      
      expect(data.totalSupply).toBe(500);
      expect(data.totalMinted).toBe(100);
      expect(data.cost.formatted).toBe('0 ETH');
      expect(data.burnSet.items).toHaveLength(1);
    });
  });

  describe('getStatus', () => {
    it('returns active status during burn period', async () => {
      burnRedeemProduct.getStatus.mockResolvedValue('active');
      
      const status = await burnRedeemProduct.getStatus();
      expect(status).toBe('active');
    });

    it('returns completed when all redeemed', async () => {
      burnRedeemProduct.getStatus.mockResolvedValue('completed');
      
      const status = await burnRedeemProduct.getStatus();
      expect(status).toBe('completed');
    });
  });
});