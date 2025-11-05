import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViemPublicProvider } from '../../src/adapters/viem-adapter/public-provider';
import { Ethers5PublicProvider } from '../../src/adapters/ethers5-adapter/public-provider';
import { ClientSDKError, ErrorCode } from '../../src/types/errors';
import * as viemActions from 'viem/actions';

// Mock viem actions
vi.mock('viem/actions', () => ({
  getBalance: vi.fn(),
  readContract: vi.fn(),
}));

describe('Public Provider Fallback - Viem', () => {
  let mockPrimaryClient: any;
  let mockFallbackClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPrimaryClient = {
      getChainId: vi.fn(),
      request: vi.fn(),
      estimateContractGas: vi.fn(),
    };

    mockFallbackClient = {
      getChainId: vi.fn(),
      request: vi.fn(),
      estimateContractGas: vi.fn(),
    };
  });

  it('should use primary provider when it is on correct network', async () => {
    mockPrimaryClient.getChainId.mockResolvedValue(1);
    (viemActions.getBalance as any).mockResolvedValue(BigInt(1000));

    const provider = new ViemPublicProvider({ 1: mockPrimaryClient });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(1000));
    expect(mockPrimaryClient.getChainId).toHaveBeenCalledTimes(1);
    expect(viemActions.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should use fallback provider when primary is on wrong network', async () => {
    mockPrimaryClient.getChainId.mockResolvedValue(2); // Wrong network
    mockFallbackClient.getChainId.mockResolvedValue(1); // Correct network
    (viemActions.getBalance as any).mockResolvedValue(BigInt(2000));

    const provider = new ViemPublicProvider({
      1: [mockPrimaryClient, mockFallbackClient]
    });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(2000));
    expect(mockPrimaryClient.getChainId).toHaveBeenCalledTimes(1);
    expect(mockFallbackClient.getChainId).toHaveBeenCalledTimes(1);
    expect(viemActions.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should use fallback provider when primary fails', async () => {
    mockPrimaryClient.getChainId.mockRejectedValue(new Error('Connection failed'));
    mockFallbackClient.getChainId.mockResolvedValue(1);
    (viemActions.getBalance as any).mockResolvedValue(BigInt(3000));

    const provider = new ViemPublicProvider({
      1: [mockPrimaryClient, mockFallbackClient]
    });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(3000));
    expect(mockPrimaryClient.getChainId).toHaveBeenCalledTimes(1);
    expect(mockFallbackClient.getChainId).toHaveBeenCalledTimes(1);
    expect(viemActions.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should use second provider in array when first fails', async () => {
    mockPrimaryClient.getChainId.mockRejectedValue(new Error('First failed'));
    mockFallbackClient.getChainId.mockResolvedValue(1);
    (viemActions.getBalance as any).mockResolvedValue(BigInt(4000));

    const provider = new ViemPublicProvider({
      1: [mockPrimaryClient, mockFallbackClient]
    });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(4000));
    expect(mockPrimaryClient.getChainId).toHaveBeenCalledTimes(1);
    expect(mockFallbackClient.getChainId).toHaveBeenCalledTimes(1);
    expect(viemActions.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should throw error when neither primary nor fallback work', async () => {
    mockPrimaryClient.getChainId.mockRejectedValue(new Error('Primary failed'));
    mockFallbackClient.getChainId.mockRejectedValue(new Error('Fallback failed'));

    const provider = new ViemPublicProvider({
      1: [mockPrimaryClient, mockFallbackClient]
    });

    await expect(
      provider.getBalance({
        address: '0x1234567890123456789012345678901234567890',
        networkId: 1,
      })
    ).rejects.toThrow();
  });

  it('should throw error when no providers are configured for network', async () => {
    const provider = new ViemPublicProvider({});

    await expect(
      provider.getBalance({
        address: '0x1234567890123456789012345678901234567890',
        networkId: 1,
      })
    ).rejects.toThrow(ClientSDKError);
  });
});

describe('Public Provider Fallback - Ethers5', () => {
  let mockPrimaryProvider: any;
  let mockFallbackProvider: any;

  beforeEach(() => {
    mockPrimaryProvider = {
      getNetwork: vi.fn(),
      getBalance: vi.fn(),
      send: vi.fn(),
    };

    mockFallbackProvider = {
      getNetwork: vi.fn(),
      getBalance: vi.fn(),
      send: vi.fn(),
    };
  });

  it('should use primary provider when it is on correct network', async () => {
    mockPrimaryProvider.getNetwork.mockResolvedValue({ chainId: 1 });
    mockPrimaryProvider.getBalance.mockResolvedValue({ toString: () => '1000' });

    const provider = new Ethers5PublicProvider({ 1: mockPrimaryProvider });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(1000));
    expect(mockPrimaryProvider.getNetwork).toHaveBeenCalledTimes(1);
    expect(mockPrimaryProvider.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should use fallback provider when primary is on wrong network', async () => {
    mockPrimaryProvider.getNetwork.mockResolvedValue({ chainId: 2 }); // Wrong network
    mockPrimaryProvider.send.mockRejectedValue(new Error('Cannot switch network')); // Simulate network switch failure
    mockFallbackProvider.getNetwork.mockResolvedValue({ chainId: 1 }); // Correct network
    mockFallbackProvider.getBalance.mockResolvedValue({ toString: () => '2000' });

    const provider = new Ethers5PublicProvider({
      1: [mockPrimaryProvider, mockFallbackProvider]
    });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(2000));
    expect(mockPrimaryProvider.getNetwork).toHaveBeenCalled();
    expect(mockFallbackProvider.getNetwork).toHaveBeenCalled();
    expect(mockFallbackProvider.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should use fallback provider when primary fails', async () => {
    mockPrimaryProvider.getNetwork.mockRejectedValue(new Error('Connection failed'));
    mockFallbackProvider.getNetwork.mockResolvedValue({ chainId: 1 });
    mockFallbackProvider.getBalance.mockResolvedValue({ toString: () => '3000' });

    const provider = new Ethers5PublicProvider({
      1: [mockPrimaryProvider, mockFallbackProvider]
    });

    const balance = await provider.getBalance({
      address: '0x1234567890123456789012345678901234567890',
      networkId: 1,
    });

    expect(balance).toBe(BigInt(3000));
    expect(mockPrimaryProvider.getNetwork).toHaveBeenCalledTimes(1);
    expect(mockFallbackProvider.getNetwork).toHaveBeenCalledTimes(1);
    expect(mockFallbackProvider.getBalance).toHaveBeenCalledTimes(1);
  });

  it('should throw error when no providers are configured for network', async () => {
    const provider = new Ethers5PublicProvider({});

    await expect(
      provider.getBalance({
        address: '0x1234567890123456789012345678901234567890',
        networkId: 1,
      })
    ).rejects.toThrow(ClientSDKError);
  });
});