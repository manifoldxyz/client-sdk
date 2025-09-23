import type {
  Product,
  EditionProduct,
  BurnRedeemProduct,
  BlindMintProduct,
  AllocationParams,
  AllocationResponse,
} from '../types/product';
import type {
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  TransactionReceipt,
  TransactionStep,
} from '../types/purchase';
import { AppType, type ProductStatus, type Address } from '../types/common';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { validateAddress } from '../utils/validation';

class MockEditionProduct implements EditionProduct {
  type = AppType.Edition as const;
  totalSupply = 1000;
  maxPerWallet = 5;
  price = BigInt('50000000000000000'); // 0.05 ETH
  startTime = new Date();
  endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  constructor(
    public id: string,
    public name: string,
    public networkId: number,
    public contractAddress: Address,
    public creatorAddress: Address,
  ) {}

  description = 'Mock Edition Product for testing';

  async getStatus(): Promise<ProductStatus> {
    const now = Date.now();
    if (this.startTime && this.startTime.getTime() > now) {
      return 'upcoming';
    }
    if (this.endTime && this.endTime.getTime() < now) {
      return 'completed';
    }
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    if (!validateAddress(params.recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address');
    }

    // Mock allocation logic
    return {
      isEligible: true,
      quantity: this.maxPerWallet ?? 5,
    };
  }

  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    if (!validateAddress(params.address)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address');
    }

    const quantity = params.payload && 'quantity' in params.payload ? params.payload.quantity : 1;

    const totalPrice = this.price * BigInt(quantity);
    const gasEstimate = BigInt('100000'); // Mock gas estimate
    const fee = (totalPrice * BigInt(25)) / BigInt(1000); // 2.5% fee

    const mockStep: TransactionStep = {
      type: 'mint',
      description: `Mint ${quantity} edition(s)`,
      estimatedGas: gasEstimate,
      async execute(): Promise<TransactionReceipt> {
        // Mock transaction execution
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
      cost: {
        total: {
          value: totalPrice + fee + gasEstimate,
          formatted: `${Number(totalPrice + fee + gasEstimate) / 1e18} ETH`,
          currency: 'ETH',
        },
        price: {
          value: totalPrice,
          formatted: `${Number(totalPrice) / 1e18} ETH`,
          currency: 'ETH',
        },
        fee: {
          value: fee,
          formatted: `${Number(fee) / 1e18} ETH`,
          currency: 'ETH',
        },
        gas: {
          value: gasEstimate,
          formatted: `${Number(gasEstimate) / 1e9} GWEI`,
          currency: 'GWEI',
        },
      },
      steps: [mockStep],
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    // Mock purchase execution
    const receipts: TransactionReceipt[] = [];

    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute();
      receipts.push(receipt);
    }

    return {
      id: 'order_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

class MockBurnRedeemProduct implements BurnRedeemProduct {
  type = AppType.BurnRedeem as const;
  burnTokens = [
    {
      contractAddress: '0x1234567890123456789012345678901234567890' as Address,
      tokenId: '1',
      quantity: 1,
    },
  ];
  redeemTokens = [
    {
      contractAddress: '0x0987654321098765432109876543210987654321' as Address,
      tokenId: '1',
      quantity: 1,
    },
  ];

  constructor(
    public id: string,
    public name: string,
    public networkId: number,
    public contractAddress: Address,
    public creatorAddress: Address,
  ) {}

  description = 'Mock Burn/Redeem Product for testing';

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

    const gasEstimate = BigInt('150000');

    const mockSteps: TransactionStep[] = [
      {
        type: 'approve',
        description: 'Approve burn token transfer',
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
        type: 'burn',
        description: 'Burn and redeem tokens',
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
      cost: {
        total: {
          value: gasEstimate,
          formatted: `${Number(gasEstimate) / 1e9} GWEI`,
          currency: 'GWEI',
        },
        price: {
          value: BigInt(0),
          formatted: '0 ETH',
          currency: 'ETH',
        },
        fee: {
          value: BigInt(0),
          formatted: '0 ETH',
          currency: 'ETH',
        },
        gas: {
          value: gasEstimate,
          formatted: `${Number(gasEstimate) / 1e9} GWEI`,
          currency: 'GWEI',
        },
      },
      steps: mockSteps,
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];

    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute();
      receipts.push(receipt);
    }

    return {
      id: 'order_burn_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

class MockBlindMintProduct implements BlindMintProduct {
  type = AppType.BlindMint as const;
  revealTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  maxSupply = 10000;

  constructor(
    public id: string,
    public name: string,
    public networkId: number,
    public contractAddress: Address,
    public creatorAddress: Address,
  ) {}

  description = 'Mock Blind Mint Product for testing';

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
    const price = BigInt('100000000000000000'); // 0.1 ETH per mint
    const totalPrice = price * BigInt(quantity);
    const gasEstimate = BigInt('120000');
    const fee = (totalPrice * BigInt(25)) / BigInt(1000); // 2.5% fee

    const mockStep: TransactionStep = {
      type: 'mint',
      description: `Blind mint ${quantity} NFT(s)`,
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
      cost: {
        total: {
          value: totalPrice + fee + gasEstimate,
          formatted: `${Number(totalPrice + fee + gasEstimate) / 1e18} ETH`,
          currency: 'ETH',
        },
        price: {
          value: totalPrice,
          formatted: `${Number(totalPrice) / 1e18} ETH`,
          currency: 'ETH',
        },
        fee: {
          value: fee,
          formatted: `${Number(fee) / 1e18} ETH`,
          currency: 'ETH',
        },
        gas: {
          value: gasEstimate,
          formatted: `${Number(gasEstimate) / 1e9} GWEI`,
          currency: 'GWEI',
        },
      },
      steps: [mockStep],
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];

    for (const step of params.preparedPurchase.steps) {
      const receipt = await step.execute();
      receipts.push(receipt);
    }

    return {
      id: 'order_blind_' + Date.now(),
      status: 'completed',
      receipts,
      createdAt: new Date(),
      completedAt: new Date(),
    };
  }
}

export function createMockProduct(instanceId: string): Product {
  // Deterministically choose product type based on instance ID
  const idNum = parseInt(instanceId.replace(/\D/g, '').slice(-1) || '0');
  const mockAddress = ('0x' + instanceId.padEnd(40, '0').slice(0, 40)) as Address;
  const creatorAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  switch (idNum % 3) {
    case 0:
      return new MockEditionProduct(
        instanceId,
        `Mock Edition #${instanceId}`,
        1, // Mainnet
        mockAddress,
        creatorAddress,
      );
    case 1:
      return new MockBurnRedeemProduct(
        instanceId,
        `Mock Burn/Redeem #${instanceId}`,
        8453, // Base
        mockAddress,
        creatorAddress,
      );
    default:
      return new MockBlindMintProduct(
        instanceId,
        `Mock Blind Mint #${instanceId}`,
        137, // Polygon
        mockAddress,
        creatorAddress,
      );
  }
}
