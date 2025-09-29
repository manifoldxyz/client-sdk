import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import {
  Ethers5Adapter,
  createEthers5Adapter,
  isEthers5Compatible,
} from '../src/adapters/ethers5-adapter';
import { AccountAdapterFactory } from '../src/adapters/account-adapter-factory';
import type { UniversalTransactionRequest } from '../src/types/account-adapter';
import { ClientSDKError } from '../src/types/errors';

// =============================================================================
// TEST SETUP
// =============================================================================

// Mock ethers modules
vi.mock('../src/libs/money', () => ({
  Money: {
    create: vi.fn().mockResolvedValue({
      value: ethers.BigNumber.from('1000000000000000000'),
      decimals: 18,
      symbol: 'ETH',
      formatted: '1.0',
      networkId: 1,
    }),
  },
}));

vi.mock('../src/utils/gas-estimation', () => ({
  checkERC20Balance: vi.fn().mockResolvedValue(ethers.BigNumber.from('5000000000000000000')),
}));

describe('Ethers5Adapter', () => {
  let mockProvider: any;
  let mockSigner: any;
  let mockNetwork: any;

  beforeEach(() => {
    mockNetwork = { chainId: 1, name: 'homestead' };

    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      getBalance: vi.fn().mockResolvedValue(ethers.BigNumber.from('1000000000000000000')),
      _isProvider: true,
    };

    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a'),
      signMessage: vi.fn().mockResolvedValue('0xmockedsignature'),
      signTransaction: vi.fn().mockResolvedValue('0xmockedtransaction'),
      sendTransaction: vi.fn().mockResolvedValue({
        hash: '0xmockedtxhash',
        from: '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
        to: '0x1234567890123456789012345678901234567890',
        nonce: 1,
        confirmations: 0,
        chainId: 1,
      }),
      provider: mockProvider,
    };
  });

  // =============================================================================
  // CONSTRUCTOR TESTS
  // =============================================================================

  describe('constructor', () => {
    it('should initialize with provider', () => {
      const adapter = new Ethers5Adapter(mockProvider);
      expect(adapter.adapterType).toBe('ethers5');
    });

    it('should initialize with signer', () => {
      const adapter = new Ethers5Adapter(mockSigner);
      expect(adapter.adapterType).toBe('ethers5');
    });

    it('should throw error for signer without provider', () => {
      const signerWithoutProvider = {
        ...mockSigner,
        provider: null,
      };

      expect(() => new Ethers5Adapter(signerWithoutProvider)).toThrow(ClientSDKError);
      expect(() => new Ethers5Adapter(signerWithoutProvider)).toThrow(
        'must have a connected provider',
      );
    });

    it('should throw error for invalid input', () => {
      expect(() => new Ethers5Adapter(null as any)).toThrow(ClientSDKError);
      expect(() => new Ethers5Adapter('invalid' as any)).toThrow(ClientSDKError);
    });
  });

  // =============================================================================
  // ADDRESS PROPERTY TESTS
  // =============================================================================

  describe('address property', () => {
    it('should throw error when address not initialized', () => {
      const adapter = new Ethers5Adapter(mockSigner);
      expect(() => adapter.address).toThrow(ClientSDKError);
      expect(() => adapter.address).toThrow('Address not initialized');
    });

    it('should return address after async method call', async () => {
      const adapter = new Ethers5Adapter(mockSigner);
      await adapter.getBalance(); // This should initialize address
      expect(adapter.address).toBe('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a');
    });
  });

  // =============================================================================
  // SEND TRANSACTION TESTS
  // =============================================================================

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasLimit: '21000',
      };

      const response = await adapter.sendTransaction(request);

      expect(response.hash).toBe('0xmockedtxhash');
      expect(response.from).toBe('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a');
      expect(response.to).toBe('0x1234567890123456789012345678901234567890');
      expect(response.status).toBe('pending');
    });

    it('should handle EIP-1559 transactions', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        maxFeePerGas: '30000000000',
        maxPriorityFeePerGas: '2000000000',
        type: 2,
      };

      await adapter.sendTransaction(request);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          maxFeePerGas: ethers.BigNumber.from('30000000000'),
          maxPriorityFeePerGas: ethers.BigNumber.from('2000000000'),
          type: 2,
        }),
      );
    });

    it('should handle legacy transactions', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        gasPrice: '20000000000',
        type: 0,
      };

      await adapter.sendTransaction(request);

      expect(mockSigner.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasPrice: ethers.BigNumber.from('20000000000'),
          type: 0,
        }),
      );
    });

    it('should throw error when using provider without signer', async () => {
      const adapter = new Ethers5Adapter(mockProvider);

      const request: UniversalTransactionRequest = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
      };

      await expect(adapter.sendTransaction(request)).rejects.toThrow('No signer available');
    });
  });

  // =============================================================================
  // GET BALANCE TESTS
  // =============================================================================

  describe('getBalance', () => {
    it('should get native token balance', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const balance = await adapter.getBalance();

      expect(mockProvider.getBalance).toHaveBeenCalledWith(
        '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
      );
      expect(balance.networkId).toBe(1);
    });

    it('should get native token balance with zero address', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const balance = await adapter.getBalance(ethers.constants.AddressZero);

      expect(mockProvider.getBalance).toHaveBeenCalledWith(
        '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
      );
      expect(balance.networkId).toBe(1);
    });

    it('should get ERC-20 token balance', async () => {
      const { checkERC20Balance } = await import('../src/utils/gas-estimation');
      const adapter = new Ethers5Adapter(mockSigner);

      const tokenAddress = '0xA0b86a33E6441d7B2c15e9A9d98b56e3F42E9b9B';
      const balance = await adapter.getBalance(tokenAddress);

      expect(checkERC20Balance).toHaveBeenCalledWith(
        tokenAddress,
        '0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a',
        mockProvider,
      );
      expect(balance.networkId).toBe(1);
    });
  });

  // =============================================================================
  // NETWORK TESTS
  // =============================================================================

  describe('getConnectedNetworkId', () => {
    it('should return current network ID', async () => {
      const adapter = new Ethers5Adapter(mockProvider);

      const networkId = await adapter.getConnectedNetworkId();

      expect(networkId).toBe(1);
      expect(mockProvider.getNetwork).toHaveBeenCalled();
    });
  });

  describe('switchNetwork', () => {
    it('should switch network with Web3Provider', async () => {
      const web3Provider = {
        ...mockProvider,
        request: vi.fn().mockResolvedValue(undefined),
      };
      const adapter = new Ethers5Adapter(web3Provider);

      await adapter.switchNetwork(137);

      expect(web3Provider.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }], // 137 in hex
      });
    });

    it('should throw error for providers without request method', async () => {
      const adapter = new Ethers5Adapter(mockProvider);

      await expect(adapter.switchNetwork(137)).rejects.toThrow('Network switching not supported');
    });
  });

  // =============================================================================
  // SIGNING TESTS
  // =============================================================================

  describe('signMessage', () => {
    it('should sign message', async () => {
      const adapter = new Ethers5Adapter(mockSigner);

      const signature = await adapter.signMessage('Hello, Web3!');

      expect(signature).toBe('0xmockedsignature');
      expect(mockSigner.signMessage).toHaveBeenCalledWith('Hello, Web3!');
    });

    it('should throw error when using provider without signer', async () => {
      const adapter = new Ethers5Adapter(mockProvider);

      await expect(adapter.signMessage('Hello')).rejects.toThrow('No signer available');
    });
  });

  // =============================================================================
  // ERROR HANDLING TESTS
  // =============================================================================

  describe('error handling', () => {
    it('should wrap user rejection errors', async () => {
      const rejectionError = { code: 4001, message: 'User denied transaction signature' };
      mockSigner.sendTransaction.mockRejectedValue(rejectionError);

      const adapter = new Ethers5Adapter(mockSigner);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('TRANSACTION_REJECTED');
        expect(error.adapterType).toBe('ethers5');
      }
    });

    it('should wrap insufficient funds errors', async () => {
      const fundsError = { message: 'insufficient funds for gas' };
      mockSigner.sendTransaction.mockRejectedValue(fundsError);

      const adapter = new Ethers5Adapter(mockSigner);

      try {
        await adapter.sendTransaction({ to: '0x1234567890123456789012345678901234567890' });
      } catch (error: any) {
        expect(error.code).toBe('INSUFFICIENT_BALANCE');
        expect(error.adapterType).toBe('ethers5');
      }
    });
  });
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

describe('createEthers5Adapter', () => {
  let localMockProvider: any;

  beforeEach(() => {
    localMockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      getBalance: vi.fn().mockResolvedValue(ethers.BigNumber.from('1000000000000000000')),
      _isProvider: true,
    };
  });

  it('should create adapter from valid provider', () => {
    const adapter = createEthers5Adapter(localMockProvider);
    expect(adapter).toBeInstanceOf(Ethers5Adapter);
  });

  it('should throw error for invalid input', () => {
    expect(() => createEthers5Adapter(null)).toThrow(ClientSDKError);
    expect(() => createEthers5Adapter('invalid')).toThrow(ClientSDKError);
  });
});

// =============================================================================
// COMPATIBILITY DETECTION TESTS
// =============================================================================

describe('isEthers5Compatible', () => {
  let localMockProvider: any;
  let localMockSigner: any;

  beforeEach(() => {
    localMockProvider = {
      getNetwork: vi.fn(),
      getBalance: vi.fn(),
      _isProvider: true,
    };

    localMockSigner = {
      getAddress: vi.fn(),
      signTransaction: vi.fn(),
      provider: localMockProvider,
    };
  });

  it('should detect ethers v5 providers', () => {
    expect(isEthers5Compatible(localMockProvider)).toBe(true);
    expect(isEthers5Compatible(localMockSigner)).toBe(true);
  });

  it('should reject invalid inputs', () => {
    expect(isEthers5Compatible(null)).toBe(false);
    expect(isEthers5Compatible('invalid')).toBe(false);
    expect(isEthers5Compatible({})).toBe(false);
  });

  it('should reject ethers v6-like objects', () => {
    const v6LikeProvider = {
      getNetwork: vi.fn(),
      getBalance: vi.fn(),
      request: { constructor: { name: 'v6Provider' } },
    };

    const result = isEthers5Compatible(v6LikeProvider);
    expect(result).toBe(false);
  });
});

// =============================================================================
// INTEGRATION TESTS WITH FACTORY
// =============================================================================

describe('AccountAdapterFactory integration', () => {
  let mockProvider: any;
  let mockSigner: any;

  beforeEach(() => {
    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      getBalance: vi.fn().mockResolvedValue(ethers.BigNumber.from('1000000000000000000')),
      _isProvider: true,
    };

    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x742d35cc6488ad532a3b33a8b3c9f9b8eb8c5b3a'),
      signTransaction: vi.fn(),
      provider: mockProvider,
    };
  });

  it('should create ethers5 adapter via factory', () => {
    const adapter = AccountAdapterFactory.fromEthers5(mockSigner);
    expect(adapter).toBeInstanceOf(Ethers5Adapter);
    expect(adapter.adapterType).toBe('ethers5');
  });

  it('should auto-detect ethers5 provider', () => {
    const adapter = AccountAdapterFactory.create(mockSigner);
    expect(adapter).toBeInstanceOf(Ethers5Adapter);
  });

  it('should provide detailed detection info', () => {
    const detection = AccountAdapterFactory.detectProvider(mockSigner);
    expect(detection.isEthers5).toBe(true);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.7);
    expect(detection.features).toContain('signTransaction');
  });
});
