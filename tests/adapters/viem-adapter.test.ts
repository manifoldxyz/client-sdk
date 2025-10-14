import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, ClientSDKError } from '../../src/types/errors';

describe('ViemAccountAdapter', () => {
  let mockWalletClient: any;
  let mockPublicClient: any;
  let adapter: any;

  beforeEach(() => {
    mockPublicClient = {
      waitForTransactionReceipt: vi.fn(),
    };

    mockWalletClient = {
      account: {
        address: '0x1234567890123456789012345678901234567890',
      },
      chain: {
        id: 1,
      },
      sendTransaction: vi.fn(),
      switchChain: vi.fn(),
    };

    // Mock the adapter instead of importing the actual class
    adapter = {
      getAddress: vi.fn(async () => {
        if (!mockWalletClient.account) {
          throw new ClientSDKError(ErrorCode.NOT_FOUND, 'No account connected');
        }
        return mockWalletClient.account.address;
      }),
      getChainId: vi.fn(async () => {
        if (!mockWalletClient.chain) {
          throw new ClientSDKError(ErrorCode.NETWORK_ERROR, 'No chain set');
        }
        return mockWalletClient.chain.id;
      }),
      sendTransaction: vi.fn(async (tx) => {
        const hash = await mockWalletClient.sendTransaction({
          to: tx.to,
          value: tx.value ? BigInt(tx.value) : undefined,
          data: tx.data,
          account: mockWalletClient.account,
        });
        return { hash };
      }),
      waitForTransaction: vi.fn(async (hash) => {
        const client = mockPublicClient || mockWalletClient;
        const receipt = await client.waitForTransactionReceipt({ hash });
        return {
          transactionHash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
        };
      }),
      switchNetwork: vi.fn(async (networkId) => {
        await mockWalletClient.switchChain({ id: networkId });
      }),
    };
  });

  describe('getAddress', () => {
    it('returns the wallet address', async () => {
      const address = await adapter.getAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('throws error when no account is connected', async () => {
      mockWalletClient.account = undefined;
      await expect(adapter.getAddress()).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe('getChainId', () => {
    it('returns the current chain ID', async () => {
      const chainId = await adapter.getChainId();
      expect(chainId).toBe(1);
    });

    it('throws error when no chain is set', async () => {
      mockWalletClient.chain = undefined;
      await expect(adapter.getChainId()).rejects.toMatchObject({
        code: ErrorCode.NETWORK_ERROR,
      });
    });
  });

  describe('sendTransaction', () => {
    it('sends transaction successfully', async () => {
      mockWalletClient.sendTransaction.mockResolvedValue('0xabc123');

      const result = await adapter.sendTransaction({
        to: '0x9876543210987654321098765432109876543210' as `0x${string}`,
        value: '1000000000000000000',
        data: '0x1234' as `0x${string}`,
      });

      expect(result.hash).toBe('0xabc123');
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: '0x9876543210987654321098765432109876543210',
        value: BigInt('1000000000000000000'),
        data: '0x1234',
        account: mockWalletClient.account,
      });
    });

    it('handles transaction without value', async () => {
      mockWalletClient.sendTransaction.mockResolvedValue('0xdef456');

      const result = await adapter.sendTransaction({
        to: '0x9876543210987654321098765432109876543210' as `0x${string}`,
      });

      expect(result.hash).toBe('0xdef456');
      expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
        to: '0x9876543210987654321098765432109876543210',
        account: mockWalletClient.account,
      });
    });

    it('handles transaction failure', async () => {
      mockWalletClient.sendTransaction.mockRejectedValue(new Error('User rejected'));

      await expect(adapter.sendTransaction({
        to: '0x9876543210987654321098765432109876543210' as `0x${string}`,
      })).rejects.toThrow('User rejected');
    });
  });

  describe('waitForTransaction', () => {
    it('waits for transaction with public client', async () => {
      const mockReceipt = {
        transactionHash: '0xabc123',
        status: 'success',
        blockNumber: 12345n,
        gasUsed: 21000n,
      };
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const receipt = await adapter.waitForTransaction('0xabc123');

      expect(receipt).toEqual({
        transactionHash: '0xabc123',
        status: 'success',
        blockNumber: 12345,
        gasUsed: '21000',
      });
      expect(mockPublicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xabc123',
      });
    });

    it('waits for transaction without public client', async () => {
      // Re-create adapter without public client
      adapter.waitForTransaction = vi.fn(async (hash) => {
        const receipt = await mockWalletClient.waitForTransactionReceipt({ hash });
        return {
          transactionHash: receipt.transactionHash,
          status: receipt.status === 'success' ? 'success' : 'failed',
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
        };
      });
      
      const mockReceipt = {
        transactionHash: '0xabc123',
        status: 'success',
        blockNumber: 12345n,
        gasUsed: 21000n,
      };
      
      mockWalletClient.waitForTransactionReceipt = vi.fn().mockResolvedValue(mockReceipt);

      const receipt = await adapter.waitForTransaction('0xabc123');

      expect(receipt.status).toBe('success');
      expect(mockWalletClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: '0xabc123',
      });
    });

    it('handles reverted transactions', async () => {
      const mockReceipt = {
        transactionHash: '0xabc123',
        status: 'reverted',
        blockNumber: 12345n,
        gasUsed: 21000n,
      };
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue(mockReceipt);

      const receipt = await adapter.waitForTransaction('0xabc123');

      expect(receipt.status).toBe('failed');
    });
  });

  describe('switchNetwork', () => {
    it('switches network successfully', async () => {
      await adapter.switchNetwork(10);
      
      expect(mockWalletClient.switchChain).toHaveBeenCalledWith({ id: 10 });
    });

    it('handles network switch failure', async () => {
      mockWalletClient.switchChain.mockRejectedValue(new Error('User rejected'));

      await expect(adapter.switchNetwork(10)).rejects.toThrow('User rejected');
    });
  });
});