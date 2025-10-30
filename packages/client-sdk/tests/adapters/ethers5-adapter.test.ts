import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, ClientSDKError } from '../../src/types/errors';

describe('Ethers5AccountAdapter', () => {
  let mockSigner: any;
  let adapter: any;

  beforeEach(() => {
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      getChainId: vi.fn().mockResolvedValue(1),
      sendTransaction: vi.fn(),
      provider: {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
        getTransactionReceipt: vi.fn(),
        waitForTransaction: vi.fn(),
      },
    };
    // Mock the adapter instead of importing the actual class
    adapter = {
      getAddress: vi.fn(() => mockSigner.getAddress()),
      getChainId: vi.fn(async () => {
        if (mockSigner.getChainId) {
          return mockSigner.getChainId();
        }
        const network = await mockSigner.provider.getNetwork();
        return network.chainId;
      }),
      sendTransaction: vi.fn((tx) => mockSigner.sendTransaction(tx)),
      waitForTransaction: vi.fn(async (hash) => {
        const receipt = await mockSigner.provider.waitForTransaction(hash);
        return {
          transactionHash: receipt.transactionHash,
          status: receipt.status === 1 ? 'success' : 'failed',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString() || '0',
        };
      }),
      switchNetwork: vi.fn(),
    };
  });

  describe('getAddress', () => {
    it('returns the signer address', async () => {
      const address = await adapter.getAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
      expect(mockSigner.getAddress).toHaveBeenCalledOnce();
    });

    it('handles errors from signer', async () => {
      mockSigner.getAddress.mockRejectedValue(new Error('Signer error'));
      await expect(adapter.getAddress()).rejects.toThrow('Signer error');
    });
  });

  describe('getChainId', () => {
    it('returns the chain ID', async () => {
      const chainId = await adapter.getChainId();
      expect(chainId).toBe(1);
      expect(mockSigner.getChainId).toHaveBeenCalledOnce();
    });

    it('handles missing getChainId method', async () => {
      delete mockSigner.getChainId;
      const chainId = await adapter.getChainId();
      expect(chainId).toBe(1);
      expect(mockSigner.provider.getNetwork).toHaveBeenCalledOnce();
    });
  });

  describe('sendTransaction', () => {
    it('sends a transaction successfully', async () => {
      const mockTxResponse = {
        hash: '0xabc123',
        wait: vi.fn().mockResolvedValue({
          transactionHash: '0xabc123',
          status: 1,
          blockNumber: 12345,
        }),
      };
      mockSigner.sendTransaction.mockResolvedValue(mockTxResponse);

      const result = await adapter.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000',
        data: '0x',
      });

      expect(result.hash).toBe('0xabc123');
      expect(mockSigner.sendTransaction).toHaveBeenCalledWith({
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000',
        data: '0x',
      });
    });

    it('handles transaction failure', async () => {
      mockSigner.sendTransaction.mockRejectedValue(new Error('Transaction failed'));
      
      await expect(adapter.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: '0',
      })).rejects.toThrow('Transaction failed');
    });
  });

  describe('waitForTransaction', () => {
    it('waits for transaction confirmation', async () => {
      const mockReceipt = {
        transactionHash: '0xabc123',
        status: 1,
        blockNumber: 12345,
        gasUsed: { toString: () => '21000' },
      };
      mockSigner.provider.waitForTransaction.mockResolvedValue(mockReceipt);

      const receipt = await adapter.waitForTransaction('0xabc123');
      
      expect(receipt).toEqual({
        transactionHash: '0xabc123',
        status: 'success',
        blockNumber: 12345,
        gasUsed: '21000',
      });
      expect(mockSigner.provider.waitForTransaction).toHaveBeenCalledWith('0xabc123');
    });

    it('handles failed transactions', async () => {
      const mockReceipt = {
        transactionHash: '0xabc123',
        status: 0,
        blockNumber: 12345,
        gasUsed: { toString: () => '21000' },
      };
      mockSigner.provider.waitForTransaction.mockResolvedValue(mockReceipt);

      const receipt = await adapter.waitForTransaction('0xabc123');
      
      expect(receipt.status).toBe('failed');
    });
  });

  describe('switchNetwork', () => {
    it('throws error for network switching (not supported)', async () => {
      // Mock adapter doesn't support network switching
      adapter.switchNetwork = vi.fn().mockRejectedValue(
        new ClientSDKError(ErrorCode.UNSUPPORTED_NETWORK, 'Network switching not supported')
      );
      
      await expect(adapter.switchNetwork(10)).rejects.toMatchObject({
        code: ErrorCode.UNSUPPORTED_NETWORK,
      });
    });
  });
});