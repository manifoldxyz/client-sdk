import type {
  Product,
  EditionProduct,
  BurnRedeemProduct,
  BlindMintProduct,
  AllocationParams,
  AllocationResponse,
  InstanceData,
  PreviewData,
  EditionPublicData,
  BurnRedeemPublicData,
  BlindMintPublicData,
  EditionOnchainData,
  BurnRedeemOnchainData,
  BlindMintOnchainData,
  AudienceType,
  ProductMetadata,
  ProductInventory,
  ProductRule,
  ProductProvenance,
  Media,
  Money,
} from '../types/product';
import type {
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  TransactionReceipt,
  TransactionStep,
} from '../types/purchase';
import { AppType, type ProductStatus, type Address, type Cost } from '../types/common';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { validateAddress } from '../utils/validation';

// Helper to create Money object
function createMoney(value: bigint, symbol = 'ETH', decimals = 18): Money {
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  const formatted = `${wholePart}.${fractionalPart.toString().padStart(decimals, '0').slice(0, 4)} ${symbol}`;

  return {
    value,
    decimals,
    currency: symbol,
    erc20: '0x0000000000000000000000000000000000000000',
    symbol,
    name: symbol === 'ETH' ? 'Ethereum' : symbol,
    formatted,
    formattedUSD: `$${Number(value / BigInt(1e16)) / 100}`, // Mock USD value
  };
}

// Helper to create Cost object
function createCost(subtotal: bigint, fees: bigint): Cost {
  return {
    subtotal: createMoney(subtotal),
    fees: createMoney(fees),
    total: createMoney(subtotal + fees),
  };
}

// Mock Edition Product Implementation
class MockEditionProduct implements EditionProduct {
  type = AppType.Edition as const;
  id: string;
  data: InstanceData & { publicData: EditionPublicData };
  previewData: PreviewData;
  onchainData?: EditionOnchainData;

  constructor(instanceId: string) {
    this.id = instanceId;
    this.data = {
      id: instanceId,
      creator: {
        id: 'workspace-123',
        slug: 'test-creator',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        name: 'Test Creator',
      },
      publicData: {
        title: `Mock Edition #${instanceId}`,
        description: 'A mock edition product for testing',
        asset: {
          name: `Edition Asset #${instanceId}`,
          description: 'Mock asset description',
          media: {
            image: `https://mock.manifold.xyz/image/${instanceId}.png`,
            imagePreview: `https://mock.manifold.xyz/preview/${instanceId}.png`,
            animation: undefined,
            animationPreview: undefined,
          },
        },
        network: 1,
        contract: {
          networkId: 1,
          address: ('0x' + instanceId.padEnd(40, '0').slice(0, 40)) as Address,
          spec: 'erc721',
          name: 'Mock Edition Contract',
          symbol: 'MOCK',
          explorer: {
            etherscanUrl: `https://etherscan.io/address/${'0x' + instanceId.padEnd(40, '0').slice(0, 40)}`,
            manifoldUrl: `https://manifold.xyz/@test/${instanceId}`,
          },
        },
        extensionAddress: '0x' + 'e'.repeat(40),
      },
      appId: 1,
      appName: 'Edition',
    };

    // Mock preview data
    this.previewData = {
      title: `Mock Edition #${instanceId}`,
      description: 'A mock edition product for testing',
      thumbnail: `https://mock.manifold.xyz/thumbnail/${instanceId}.png`,
      contract: this.data.publicData.contract,
      payoutAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      network: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      price: createMoney(1000000000000000n), // 0.001 ETH
    };

    // Mock onchain data
    this.onchainData = {
      totalSupply: 1000,
      totalMinted: 250,
      walletMax: 5,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      audienceType: 'None' as AudienceType,
      cost: createMoney(BigInt('50000000000000000')), // 0.05 ETH
      paymentReceiver: this.data.creator.address,
    };
  }

  async getStatus(): Promise<ProductStatus> {
    if (!this.onchainData) return 'upcoming';
    const now = Date.now();
    if (this.onchainData.startDate.getTime() > now) return 'upcoming';
    if (this.onchainData.endDate.getTime() < now) return 'completed';
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    if (!validateAddress(params.recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address');
    }
    return {
      isEligible: true,
      quantity: this.onchainData?.walletMax ?? 5,
    };
  }

  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    if (!validateAddress(params.address)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address');
    }

    const quantity = params.payload && 'quantity' in params.payload ? params.payload.quantity : 1;
    const price = this.onchainData?.cost.value ?? BigInt('50000000000000000');
    const subtotal = price * BigInt(quantity);
    const fees = (subtotal * BigInt(25)) / BigInt(1000); // 2.5% fee
    const gasEstimate = BigInt('100000');

    const mockStep: TransactionStep = {
      type: 'mint',
      description: `Mint ${quantity} edition(s)`,
      // @ts-ignore - estimatedGas not in interface
      estimatedGas: gasEstimate,
      async execute(): Promise<TransactionReceipt> {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          txHash: '0x' + '1234567890abcdef'.repeat(4),
          blockNumber: 12345678,
          gasUsed: gasEstimate,
          status: 'success',
        };
      },
    };

    return {
      cost: createCost(subtotal, fees),
      steps: [mockStep],
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];
    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute?.();
      if (receipt) receipts.push(receipt);
    }
    return {
      id: 'order_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    return this.data.publicData.asset.media;
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.title,
      description: this.data.publicData.description,
    };
  }

  async getInventory(): Promise<ProductInventory> {
    return {
      totalSupply: this.onchainData?.totalSupply ?? 1000,
      totalPurchased: this.onchainData?.totalMinted ?? 250,
    };
  }

  async getRules(): Promise<ProductRule> {
    return {
      startDate: this.onchainData?.startDate,
      endDate: this.onchainData?.endDate,
      audienceRestriction: 'none',
      maxPerWallet: this.onchainData?.walletMax,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    return {
      creator: this.data.creator,
      contract: this.data.publicData.contract,
      networkId: this.data.publicData.network,
    };
  }

  async fetchOnchainData(): Promise<EditionOnchainData> {
    // Mock fetching onchain data
    if (!this.onchainData) {
      this.onchainData = {
        totalSupply: 1000,
        totalMinted: 250,
        walletMax: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        audienceType: 'None' as AudienceType,
        cost: createMoney(BigInt('50000000000000000')),
        paymentReceiver: this.data.creator.address,
      };
    }
    return this.onchainData;
  }
}

// Mock Burn/Redeem Product Implementation
class MockBurnRedeemProduct implements BurnRedeemProduct {
  type = AppType.BurnRedeem as const;
  id: string;
  data: InstanceData & { publicData: BurnRedeemPublicData };
  previewData: PreviewData;
  onchainData?: BurnRedeemOnchainData;

  constructor(instanceId: string) {
    this.id = instanceId;
    this.data = {
      id: instanceId,
      creator: {
        id: 'workspace-456',
        slug: 'burn-creator',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        name: 'Burn Creator',
      },
      publicData: {
        redeemAsset: {
          name: `Redeem Asset #${instanceId}`,
          description: 'Asset received after burn',
          media: {
            image: `https://mock.manifold.xyz/redeem/${instanceId}.png`,
            imagePreview: `https://mock.manifold.xyz/redeem-preview/${instanceId}.png`,
          },
        },
        network: 8453, // Base
        redeemContract: {
          networkId: 8453,
          address: ('0x' + instanceId.padEnd(40, '1').slice(0, 40)) as Address,
          spec: 'erc1155',
          name: 'Mock Redeem Contract',
          symbol: 'REDEEM',
          explorer: {
            etherscanUrl: `https://basescan.org/address/${'0x' + instanceId.padEnd(40, '1').slice(0, 40)}`,
          },
        },
        extensionAddress: '0x' + 'b'.repeat(40),
      },
      appId: 2,
      appName: 'Burn-Redeem',
    };

    // Mock preview data
    this.previewData = {
      title: `Mock Burn-Redeem #${instanceId}`,
      description: 'A mock burn-redeem product for testing',
      thumbnail: `https://mock.manifold.xyz/thumbnail/burn-redeem-${instanceId}.png`,
      contract: this.data.publicData.redeemContract,
      payoutAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      network: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      price: createMoney(BigInt('0')), // Free
    };

    this.onchainData = {
      totalSupply: 500,
      totalMinted: 100,
      walletMax: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      audienceType: 'None' as AudienceType,
      cost: createMoney(BigInt('0')),
      paymentReceiver: this.data.creator.address,
      burnSet: {
        items: [
          {
            quantity: 1,
            burnSpec: 'manifold',
            tokenSpec: 'erc721',
            contractAddress: '0x1234567890123456789012345678901234567890',
            validationType: 'any',
          },
        ],
        requiredCount: 1,
      },
    };
  }

  async getStatus(): Promise<ProductStatus> {
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    if (!validateAddress(params.recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address');
    }
    return {
      isEligible: true,
      quantity: 1,
    };
  }

  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    if (!validateAddress(params.address)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address');
    }

    const mockSteps: TransactionStep[] = [
      {
        type: 'approve',
        description: 'Approve burn token transfer',
        // @ts-ignore - estimatedGas not in interface
        estimatedGas: BigInt('50000'),
        async execute(): Promise<TransactionReceipt> {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            txHash: '0x' + 'abcdef1234567890'.repeat(4),
            blockNumber: 12345679,
            gasUsed: BigInt('45000'),
            status: 'success',
          };
        },
      },
      {
        type: 'mint' as const, // Changed from 'burn' as it's not a valid type
        description: 'Burn and redeem tokens',
        // @ts-ignore - estimatedGas not in interface
        estimatedGas: BigInt('100000'),
        async execute(): Promise<TransactionReceipt> {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            txHash: '0x' + 'fedcba0987654321'.repeat(4),
            blockNumber: 12345680,
            gasUsed: BigInt('95000'),
            status: 'success',
          };
        },
      },
    ];

    return {
      cost: createCost(BigInt(0), BigInt(0)),
      steps: mockSteps,
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];
    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute?.();
      if (receipt) receipts.push(receipt);
    }
    return {
      id: 'order_burn_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    return this.data.publicData.redeemAsset.media;
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.redeemAsset.name,
      description: this.data.publicData.redeemAsset.description,
    };
  }

  async getInventory(): Promise<ProductInventory> {
    return {
      totalSupply: this.onchainData?.totalSupply ?? 500,
      totalPurchased: this.onchainData?.totalMinted ?? 100,
    };
  }

  async getRules(): Promise<ProductRule> {
    return {
      startDate: this.onchainData?.startDate,
      endDate: this.onchainData?.endDate,
      audienceRestriction: 'none',
      maxPerWallet: this.onchainData?.walletMax,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    return {
      creator: this.data.creator,
      contract: this.data.publicData.redeemContract,
      networkId: this.data.publicData.network,
    };
  }

  async fetchOnchainData(): Promise<BurnRedeemOnchainData> {
    if (!this.onchainData) {
      throw new ClientSDKError(ErrorCode.NOT_FOUND, 'Onchain data not available');
    }
    return this.onchainData;
  }
}

// Mock Blind Mint Product Implementation
class MockBlindMintProduct implements BlindMintProduct {
  type = AppType.BlindMint as const;
  id: string;
  data: InstanceData & { publicData: BlindMintPublicData };
  previewData: PreviewData;
  onchainData?: BlindMintOnchainData;

  constructor(instanceId: string) {
    this.id = instanceId;
    this.data = {
      id: instanceId,
      creator: {
        id: 'workspace-789',
        slug: 'blindmint-creator',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        name: 'BlindMint Creator',
      },
      publicData: {
        title: `Mock Blind Mint #${instanceId}`,
        description: 'A mystery box NFT',
        network: 137, // Polygon
        contract: {
          networkId: 137,
          address: ('0x' + instanceId.padEnd(40, '2').slice(0, 40)) as Address,
          spec: 'erc1155',
          name: 'Mock BlindMint Contract',
          symbol: 'BLIND',
          explorer: {
            etherscanUrl: `https://polygonscan.com/address/${'0x' + instanceId.padEnd(40, '2').slice(0, 40)}`,
          },
        },
        extensionAddress: '0x' + 'g'.repeat(40),
        tierProbabilities: {
          group: 'Standard',
          indices: [0, 1, 2],
          rate: 10000, // 100%
        },
        pool: [
          {
            index: 0,
            metadata: {
              name: 'Common Asset',
              description: 'Common rarity pool asset',
              media: {
                image: `https://mock.manifold.xyz/mystery/${instanceId}-common.png`,
                imagePreview: `https://mock.manifold.xyz/mystery-preview/${instanceId}-common.png`,
              },
            },
          },
          {
            index: 1,
            metadata: {
              name: 'Rare Asset',
              description: 'Rare pool asset',
              media: {
                image: `https://mock.manifold.xyz/mystery/${instanceId}-rare.png`,
                imagePreview: `https://mock.manifold.xyz/mystery-preview/${instanceId}-rare.png`,
              },
            },
          },
          {
            index: 2,
            metadata: {
              name: 'Legendary Asset',
              description: 'Legendary pool asset',
              media: {
                image: `https://mock.manifold.xyz/mystery/${instanceId}-legendary.png`,
                imagePreview: `https://mock.manifold.xyz/mystery-preview/${instanceId}-legendary.png`,
              },
            },
          },
        ],
      },
      appId: 3,
      appName: 'Blind-Mint',
    };

    // Mock preview data
    this.previewData = {
      title: `Mock Blind Mint #${instanceId}`,
      description: 'A mock blind mint product for testing',
      thumbnail: `https://mock.manifold.xyz/thumbnail/blind-mint-${instanceId}.png`,
      contract: this.data.publicData.contract,
      payoutAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      network: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      price: createMoney(BigInt('10000000000000000')), // 0.01 ETH
    };

    this.onchainData = {
      totalSupply: 10000,
      totalMinted: 2500,
      walletMax: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      audienceType: 'None' as AudienceType,
      cost: createMoney(BigInt('100000000000000000')), // 0.1 ETH
      paymentReceiver: this.data.creator.address,
      tokenVariations: 10,
      startingTokenId: 1,
    };
  }

  async getStatus(): Promise<ProductStatus> {
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    if (!validateAddress(params.recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address');
    }
    return {
      isEligible: true,
      quantity: 10,
    };
  }

  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    if (!validateAddress(params.address)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address');
    }

    const quantity = params.payload && 'quantity' in params.payload ? params.payload.quantity : 1;
    const price = this.onchainData?.cost.value ?? BigInt('100000000000000000');
    const subtotal = price * BigInt(quantity);
    const fees = (subtotal * BigInt(25)) / BigInt(1000); // 2.5% fee
    const gasEstimate = BigInt('120000');

    const mockStep: TransactionStep = {
      type: 'mint',
      description: `Blind mint ${quantity} NFT(s)`,
      // @ts-ignore - estimatedGas not in interface
      estimatedGas: gasEstimate,
      async execute(): Promise<TransactionReceipt> {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          txHash: '0x' + 'blind1234567890ab'.repeat(4),
          blockNumber: 12345681,
          gasUsed: gasEstimate,
          status: 'success',
        };
      },
    };

    return {
      cost: createCost(subtotal, fees),
      steps: [mockStep],
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];
    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute?.();
      if (receipt) receipts.push(receipt);
    }
    return {
      id: 'order_blind_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    // For BlindMint, return media from the first item in the pool
    return this.data.publicData.pool[0]?.metadata.media;
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.title,
      description: this.data.publicData.description,
    };
  }

  async getInventory(): Promise<ProductInventory> {
    return {
      totalSupply: this.onchainData?.totalSupply ?? 10000,
      totalPurchased: this.onchainData?.totalMinted ?? 2500,
    };
  }

  async getRules(): Promise<ProductRule> {
    return {
      startDate: this.onchainData?.startDate,
      endDate: this.onchainData?.endDate,
      audienceRestriction: 'none',
      maxPerWallet: this.onchainData?.walletMax,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    return {
      creator: this.data.creator,
      contract: this.data.publicData.contract,
      networkId: this.data.publicData.network,
    };
  }

  async fetchOnchainData(): Promise<BlindMintOnchainData> {
    if (!this.onchainData) {
      throw new ClientSDKError(ErrorCode.NOT_FOUND, 'Onchain data not available');
    }
    return this.onchainData;
  }
}

// Factory function to create mock products
export function createMockProduct(instanceId: string): Product {
  // Deterministically choose product type based on instance ID
  const idNum = parseInt(instanceId.replace(/\D/g, '').slice(-1) || '0');

  switch (idNum % 3) {
    case 0:
      return new MockEditionProduct(instanceId);
    case 1:
      return new MockBurnRedeemProduct(instanceId);
    default:
      return new MockBlindMintProduct(instanceId);
  }
}
