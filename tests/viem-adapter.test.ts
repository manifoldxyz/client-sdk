import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViemAdapter, createViemAdapter, isViemCompatible } from '../src/adapters/viem-adapter';
import { AccountAdapterFactory } from '../src/adapters/account-adapter-factory';
import type { UniversalTransactionRequest, UniversalTransactionResponse } from '../src/types/account-adapter';
import { ClientSDKError } from '../src/types/errors';

// =============================================================================
// TEST SETUP
// =============================================================================

// Mock viem dependency
const mockViem = {
  createPublicClient: vi.fn(),
  zeroAddress: '0x0000000000000000000000000000000000000000',
};

// Mock Money class
vi.mock('../src/libs/money', () => ({
  Money: {
    create: vi.fn().mockResolvedValue({
      value: { toString: () => '1000000000000000000' },
      decimals: 18,
      symbol: 'ETH',
      formatted: '1.0',
      networkId: 1,
    }),
  },
}));

// Mock gas estimation utilities
vi.mock('../src/utils/gas-estimation', () => ({
  checkERC20BalanceViem: vi.fn().mockResolvedValue(BigInt('5000000000000000000')),
}));

// Mock require to return our mocked viem
const originalRequire = require;
vi.stubGlobal('require', (id: string) => {
  if (id === 'viem') {
    return mockViem;
  }
  return originalRequire(id);
});

describe('ViemAdapter', () => {
  let mockWalletClient: any;
  let mockPublicClient: any;
  let mockAccount: any;

  beforeEach(() => {
    mockAccount = {
      address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
    };

    mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getChainId: vi.fn().mockResolvedValue(1),
      readContract: vi.fn().mockResolvedValue(BigInt('5000000000000000000')),
      request: vi.fn(),
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1, name: 'Ethereum' },
    };

    mockWalletClient = {
      sendTransaction: vi.fn().mockResolvedValue('0xmockedtxhash'),
      signMessage: vi.fn().mockResolvedValue('0xmockedsignature'),
      getAddresses: vi.fn().mockResolvedValue(['0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a']),
      switchChain: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
      account: mockAccount,
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1, name: 'Ethereum' },
    };

    mockViem.createPublicClient.mockReturnValue(mockPublicClient);
  });

  // =============================================================================
  // CONSTRUCTOR TESTS
  // =============================================================================

  describe('constructor', () => {
    it('should initialize with wallet client', () => {
      const adapter = new ViemAdapter(mockWalletClient);
      expect(adapter.adapterType).toBe('viem');
    });

    it('should initialize with public client', () => {
      const adapter = new ViemAdapter(mockPublicClient);
      expect(adapter.adapterType).toBe('viem');
    });

    it('should throw error for invalid client', () => {
      expect(() => new ViemAdapter(null as any)).toThrow(ClientSDKError);
      expect(() => new ViemAdapter('invalid' as any)).toThrow(ClientSDKError);
    });

    it('should throw error when viem is not installed', () => {
      // Create a new class that will use a throwing require
      class TestAdapter extends ViemAdapter {
        protected override _initializeViem(): void {
          throw new ClientSDKError(
            'INVALID_INPUT' as any,
            'Viem is not installed. Please install viem as a peer dependency: npm install viem',
          );
        }
      }

      expect(() => new TestAdapter(mockWalletClient)).toThrow(ClientSDKError);
      expect(() => new TestAdapter(mockWalletClient)).toThrow('Viem is not installed');
    });
  });

  // =============================================================================
  // ADDRESS PROPERTY TESTS
  // =============================================================================

  describe('address property', () => {
    it('should throw error when address not initialized', () => {
      const adapter = new ViemAdapter(mockWalletClient);
      expect(() => adapter.address).toThrow(ClientSDKError);
      expect(() => adapter.address).toThrow('Address not initialized');
    });

    it('should return address after async method call', async () => {
      const adapter = new ViemAdapter(mockWalletClient);
      await adapter.getBalance(); // This should initialize address
      expect(adapter.address).toBe('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a');
    });

    it('should get address from hoisted account', async () => {
      const adapter = new ViemAdapter(mockWalletClient);
      await adapter.getBalance();
      expect(adapter.address).toBe('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a');
    });

    it('should get address from getAddresses when no hoisted account', async () => {
      const clientWithoutAccount = {
        ...mockWalletClient,
        account: null,
      };
      const adapter = new ViemAdapter(clientWithoutAccount);
      await adapter.getBalance();
      expect(adapter.address).toBe('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a');
      expect(mockWalletClient.getAddresses).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // SEND TRANSACTION TESTS
  // =============================================================================

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000',
      };

      const response = (await adapter.sendTransaction(request)) as unknown as UniversalTransactionResponse;

      expect(response.hash).toBe('0xmockedtxhash');
      expect(response.status).toBe('pending');
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: '0x1234567890123456789012345678901234567890',
        value: BigInt('1000000000000000000'),
        gas: BigInt('21000'),
      });
    });

    it('should handle EIP-1559 transactions', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        maxFeePerGas: '30000000000',
        maxPriorityFeePerGas: '2000000000',
        type: 2,
      };

      await adapter.sendTransaction(request);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          maxFeePerGas: BigInt('30000000000'),
          maxPriorityFeePerGas: BigInt('2000000000'),
          type: 'eip1559',
        }),
      );
    });

    it('should handle legacy transactions', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasPrice: '20000000000',
        type: 0,
      };

      await adapter.sendTransaction(request);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasPrice: BigInt('20000000000'),
          type: 'legacy',
        }),
      );
    });

    it('should add account when not hoisted', async () => {
      const clientWithoutAccount = {
        ...mockWalletClient,
        account: null,
      };
      const adapter = new ViemAdapter(clientWithoutAccount);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
      };

      await adapter.sendTransaction(request);

      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          account: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
        }),
      );
    });

    it('should throw error when using public client without wallet', async () => {
      const adapter = new ViemAdapter(mockPublicClient);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
      };

      await expect(adapter.sendTransaction(request)).rejects.toThrow('No wallet client available');
    });
  });

  // =============================================================================
  // GET BALANCE TESTS
  // =============================================================================

  describe('getBalance', () => {
    it('should get native token balance', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const balance = await adapter.getBalance();

      expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
        address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
      });
      expect(balance.networkId).toBe(1);
    });

    it('should get native token balance with zero address', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const balance = await adapter.getBalance('0x0000000000000000000000000000000000000000');

      expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
        address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
      });
      expect(balance.networkId).toBe(1);
    });

    it('should get ERC-20 token balance', async () => {
      const { checkERC20BalanceViem } = await import('../src/utils/gas-estimation');
      const adapter = new ViemAdapter(mockWalletClient);

      const tokenAddress = '0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B';
      const balance = await adapter.getBalance(tokenAddress);

      expect(checkERC20BalanceViem).toHaveBeenCalledWith(
        tokenAddress,
        '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
        mockPublicClient,
      );
      expect(balance.networkId).toBe(1);
    });

    it('should work with public client only', async () => {
      const adapter = new ViemAdapter(mockPublicClient);

      // Should throw because no wallet client to get address
      await expect(adapter.getBalance()).rejects.toThrow(
        'Cannot get address from read-only client',
      );
    });
  });

  // =============================================================================
  // NETWORK TESTS
  // =============================================================================

  describe('getConnectedNetworkId', () => {
    it('should return current network ID', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const networkId = await adapter.getConnectedNetworkId();

      expect(networkId).toBe(1);
      expect(mockPublicClient.getChainId).toHaveBeenCalled();
    });
  });

  describe('switchNetwork', () => {
    it('should switch network', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      await adapter.switchNetwork(137);

      expect(mockWalletClient.switchChain).toHaveBeenCalledWith({ id: 137 });
    });

    it('should throw error for public client without wallet', async () => {
      const adapter = new ViemAdapter(mockPublicClient);

      await expect(adapter.switchNetwork(137)).rejects.toThrow('No wallet client available');
    });
  });

  // =============================================================================
  // SIGNING TESTS
  // =============================================================================

  describe('signMessage', () => {
    it('should sign message', async () => {
      const adapter = new ViemAdapter(mockWalletClient);

      const signature = await adapter.signMessage('Hello, Web3!');

      expect(signature).toBe('0xmockedsignature');
      expect(mockWalletClient.signMessage).toHaveBeenCalledWith({
        account: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
        message: 'Hello, Web3!',
      });
    });

    it('should throw error when using public client without wallet', async () => {
      const adapter = new ViemAdapter(mockPublicClient);

      await expect(adapter.signMessage('Hello')).rejects.toThrow('No wallet client available');
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('error handling', () => {
    it('should wrap user rejection errors', async () => {
      const rejectionError = { name: 'UserRejectedRequestError', message: 'User rejected request' };
      mockWalletClient.sendTransaction.mockRejectedValue(rejectionError);

      const adapter = new ViemAdapter(mockWalletClient);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('TRANSACTION_REJECTED');
        expect(error.adapterType).toBe('viem');
      }
    });

    it('should wrap insufficient funds errors', async () => {
      const fundsError = { name: 'InsufficientFundsError', message: 'Insufficient funds' };
      mockWalletClient.sendTransaction.mockRejectedValue(fundsError);

      const adapter = new ViemAdapter(mockWalletClient);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('INSUFFICIENT_BALANCE');
        expect(error.adapterType).toBe('viem');
      }
    });

    it('should wrap chain mismatch errors', async () => {
      const chainError = { name: 'ChainMismatchError', message: 'Chain mismatch' };
      mockWalletClient.sendTransaction.mockRejectedValue(chainError);

      const adapter = new ViemAdapter(mockWalletClient);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('NETWORK_MISMATCH');
        expect(error.adapterType).toBe('viem');
      }
    });

    it('should wrap transaction execution errors', async () => {
      const executionError = { name: 'TransactionExecutionError', message: 'Transaction failed' };
      mockWalletClient.sendTransaction.mockRejectedValue(executionError);

      const adapter = new ViemAdapter(mockWalletClient);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('TRANSACTION_FAILED');
        expect(error.adapterType).toBe('viem');
      }
    });
  });
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('createViemAdapter', () => {
  let localMockWalletClient: any;

  beforeEach(() => {
    localMockWalletClient = {
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
      account: { address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a' },
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1 },
    };
  });

  it('should create adapter from valid wallet client', () => {
    const adapter = createViemAdapter(localMockWalletClient);
    expect(adapter).toBeInstanceOf(ViemAdapter);
  });

  it('should throw error for invalid input', () => {
    expect(() => createViemAdapter(null)).toThrow(ClientSDKError);
    expect(() => createViemAdapter('invalid')).toThrow(ClientSDKError);
  });
});

// =============================================================================
// COMPATIBILITY DETECTION TESTS
// =============================================================================

describe('isViemCompatible', () => {
  let localMockWalletClient: any;
  let localMockPublicClient: any;

  beforeEach(() => {
    localMockWalletClient = {
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
      account: { address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a' },
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1 },
    };

    localMockPublicClient = {
      getBalance: vi.fn(),
      readContract: vi.fn(),
      getChainId: vi.fn(),
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1 },
    };
  });

  it('should detect viem wallet clients', () => {
    expect(isViemCompatible(localMockWalletClient)).toBe(true);
  });

  it('should detect viem public clients', () => {
    expect(isViemCompatible(localMockPublicClient)).toBe(true);
  });

  it('should reject invalid inputs', () => {
    expect(isViemCompatible(null)).toBe(false);
    expect(isViemCompatible('invalid')).toBe(false);
    expect(isViemCompatible({})).toBe(false);
  });

  it('should reject ethers-like objects', () => {
    const ethersLikeProvider = {
      getNetwork: vi.fn(),
      getBalance: vi.fn(),
      _isProvider: true,
    };

    expect(isViemCompatible(ethersLikeProvider)).toBe(false);
  });

  it('should reject test clients', () => {
    const testClient = {
      ...localMockWalletClient,
      mode: 'anvil',
    };

    expect(isViemCompatible(testClient)).toBe(false);
  });
});

// =============================================================================
// INTEGRATION TESTS WITH FACTORY
// =============================================================================

describe('AccountAdapterFactory integration', () => {
  let mockWalletClient: any;
  let mockPublicClient: any;

  beforeEach(() => {
    mockWalletClient = {
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
      account: { address: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a' },
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1 },
    };

    mockPublicClient = {
      getBalance: vi.fn(),
      readContract: vi.fn(),
      getChainId: vi.fn(),
      transport: vi.fn(() => ({ type: 'http' })),
      chain: { id: 1 },
    };
  });

  it('should create viem adapter via factory', () => {
    const adapter = AccountAdapterFactory.fromViem(mockWalletClient);
    expect(adapter).toBeInstanceOf(ViemAdapter);
    expect(adapter.adapterType).toBe('viem');
  });

  it('should auto-detect viem wallet client', () => {
    const adapter = AccountAdapterFactory.create(mockWalletClient);
    expect(adapter).toBeInstanceOf(ViemAdapter);
  });

  it('should auto-detect viem public client', () => {
    const adapter = AccountAdapterFactory.create(mockPublicClient);
    expect(adapter).toBeInstanceOf(ViemAdapter);
  });

  it('should provide detailed detection info for wallet client', () => {
    const detection = AccountAdapterFactory.detectProvider(mockWalletClient);
    expect(detection.isViem).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.7);
    expect(detection.features).toContain('viemWalletClient');
  });

  it('should provide detailed detection info for public client', () => {
    const detection = AccountAdapterFactory.detectProvider(mockPublicClient);
    expect(detection.isViem).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.7);
    expect(detection.features).toContain('viemPublicClient');
  });
});
