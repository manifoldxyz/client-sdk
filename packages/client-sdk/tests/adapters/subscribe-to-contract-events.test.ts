import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Ethers5PublicProvider } from '../../src/adapters/ethers5-adapter/public-provider';
import { ViemPublicProvider } from '../../src/adapters/viem-adapter/public-provider';
import { WagmiPublicProvider } from '../../src/adapters/wagmi-adapter/public-provider';
import type { Log } from 'viem';

// Mock ethers Contract
vi.mock('ethers', () => {
  const Contract = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
  }));

  return {
    Contract,
    BigNumber: {
      from: vi.fn((val) => ({ toString: () => val.toString() })),
    },
  };
});

// Mock viem
vi.mock('viem/actions', () => ({
  getBalance: vi.fn(),
  readContract: vi.fn(),
}));

// Mock wagmi
vi.mock('@wagmi/core', () => ({
  getBalance: vi.fn(),
  readContract: vi.fn(),
  getPublicClient: vi.fn(),
  watchContractEvent: vi.fn(),
}));

describe('subscribeToContractEvents - Ethers5PublicProvider', () => {
  let mockProvider: any;
  let provider: Ethers5PublicProvider;
  let mockContract: any;

  const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_ABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' },
      ],
      name: 'Transfer',
      type: 'event',
    },
  ];
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockContract = {
      on: vi.fn(),
      off: vi.fn(),
    };

    mockProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      send: vi.fn(),
      getBalance: vi.fn(),
    };

    // Get the mocked Contract constructor
    const ethers = await import('ethers');
    (ethers.Contract as any).mockImplementation(() => mockContract);

    provider = new Ethers5PublicProvider({ 1: mockProvider });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to contract events with topics', async () => {
    const callback = vi.fn();

    const unsubscribe = await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(mockContract.on).toHaveBeenCalledWith({ topics: [TRANSFER_TOPIC] }, callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return unsubscribe function that calls contract.off', async () => {
    const callback = vi.fn();

    const unsubscribe = await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    // Call unsubscribe
    unsubscribe();

    expect(mockContract.off).toHaveBeenCalledWith({ topics: [TRANSFER_TOPIC] }, callback);
  });

  it('should use executeWithFallback for provider fallback', async () => {
    const mockFallbackProvider = {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      send: vi.fn(),
    };

    // Primary provider on wrong network
    mockProvider.getNetwork.mockResolvedValue({ chainId: 2 });
    mockProvider.send.mockRejectedValue(new Error('Cannot switch network'));

    const fallbackProvider = new Ethers5PublicProvider({
      1: [mockProvider, mockFallbackProvider],
    });

    const callback = vi.fn();

    const unsubscribe = await fallbackProvider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(unsubscribe).toBeDefined();
    expect(mockFallbackProvider.getNetwork).toHaveBeenCalled();
  });

  it('should handle multiple topics', async () => {
    const callback = vi.fn();
    const topics = [TRANSFER_TOPIC, '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'];

    await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics,
      callback,
    });

    expect(mockContract.on).toHaveBeenCalledWith({ topics }, callback);
  });
});

describe('subscribeToContractEvents - ViemPublicProvider', () => {
  let mockClient: any;
  let provider: ViemPublicProvider;

  const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_ABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' },
      ],
      name: 'Transfer',
      type: 'event',
    },
  ];
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      getChainId: vi.fn().mockResolvedValue(1),
      watchContractEvent: vi.fn(),
    };

    provider = new ViemPublicProvider({ 1: mockClient });
  });

  it('should subscribe to contract events and filter by topics', async () => {
    const callback = vi.fn();
    const unwatch = vi.fn();

    // Mock watchContractEvent to capture the onLogs callback
    let capturedOnLogs: ((logs: Log[]) => void) | undefined;
    mockClient.watchContractEvent.mockImplementation((params: any) => {
      capturedOnLogs = params.onLogs;
      return unwatch;
    });

    const result = await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(mockClient.watchContractEvent).toHaveBeenCalledWith({
      address: TEST_ADDRESS,
      abi: TEST_ABI,
      onLogs: expect.any(Function),
    });
    expect(result).toBe(unwatch);

    // Test the filtering logic
    expect(capturedOnLogs).toBeDefined();
    if (capturedOnLogs) {
      const matchingLog: Log = {
        address: TEST_ADDRESS as `0x${string}`,
        topics: [TRANSFER_TOPIC as `0x${string}`],
        data: '0x',
        blockNumber: 12345n,
        transactionHash: '0xabc' as `0x${string}`,
        transactionIndex: 0,
        blockHash: '0xdef' as `0x${string}`,
        logIndex: 0,
        removed: false,
      };

      const nonMatchingLog: Log = {
        ...matchingLog,
        topics: ['0x1234' as `0x${string}`],
      };

      capturedOnLogs([matchingLog, nonMatchingLog]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(matchingLog);
    }
  });

  it('should filter logs with multiple topics correctly', async () => {
    const callback = vi.fn();
    const unwatch = vi.fn();

    const topic1 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const topic2 = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

    let capturedOnLogs: ((logs: Log[]) => void) | undefined;
    mockClient.watchContractEvent.mockImplementation((params: any) => {
      capturedOnLogs = params.onLogs;
      return unwatch;
    });

    await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [topic1, topic2],
      callback,
    });

    if (capturedOnLogs) {
      const fullMatchLog: Log = {
        address: TEST_ADDRESS as `0x${string}`,
        topics: [topic1 as `0x${string}`, topic2 as `0x${string}`],
        data: '0x',
        blockNumber: 12345n,
        transactionHash: '0xabc' as `0x${string}`,
        transactionIndex: 0,
        blockHash: '0xdef' as `0x${string}`,
        logIndex: 0,
        removed: false,
      };

      const partialMatchLog: Log = {
        ...fullMatchLog,
        topics: [topic1 as `0x${string}`], // Only has first topic
      };

      const noMatchLog: Log = {
        ...fullMatchLog,
        topics: ['0x9999' as `0x${string}`, topic2 as `0x${string}`], // First topic doesn't match
      };

      capturedOnLogs([fullMatchLog, partialMatchLog, noMatchLog]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(fullMatchLog);
    }
  });

  it('should return unwatch function from viem', async () => {
    const callback = vi.fn();
    const unwatch = vi.fn();

    mockClient.watchContractEvent.mockReturnValue(unwatch);

    const result = await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(result).toBe(unwatch);
  });

  it('should skip logs with insufficient topics', async () => {
    const callback = vi.fn();

    let capturedOnLogs: ((logs: Log[]) => void) | undefined;
    mockClient.watchContractEvent.mockImplementation((params: any) => {
      capturedOnLogs = params.onLogs;
      return vi.fn();
    });

    await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC, '0x1234'],
      callback,
    });

    if (capturedOnLogs) {
      const logWithOneTopic: Log = {
        address: TEST_ADDRESS as `0x${string}`,
        topics: [TRANSFER_TOPIC as `0x${string}`], // Only 1 topic, but we need 2
        data: '0x',
        blockNumber: 12345n,
        transactionHash: '0xabc' as `0x${string}`,
        transactionIndex: 0,
        blockHash: '0xdef' as `0x${string}`,
        logIndex: 0,
        removed: false,
      };

      capturedOnLogs([logWithOneTopic]);

      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('should use executeWithFallback for provider fallback', async () => {
    const mockFallbackClient = {
      getChainId: vi.fn().mockResolvedValue(1),
      watchContractEvent: vi.fn().mockReturnValue(vi.fn()),
    };

    // Primary client on wrong network
    mockClient.getChainId.mockResolvedValue(2);

    const fallbackProvider = new ViemPublicProvider({
      1: [mockClient, mockFallbackClient],
    });

    const callback = vi.fn();

    await fallbackProvider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(mockFallbackClient.watchContractEvent).toHaveBeenCalled();
  });
});

describe('subscribeToContractEvents - WagmiPublicProvider', () => {
  let mockConfig: any;
  let mockClient: any;
  let provider: WagmiPublicProvider;

  const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_ABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'from', type: 'address' },
        { indexed: true, name: 'to', type: 'address' },
        { indexed: false, name: 'value', type: 'uint256' },
      ],
      name: 'Transfer',
      type: 'event',
    },
  ];
  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = {
      getChainId: vi.fn().mockResolvedValue(1),
    };

    mockConfig = {
      chains: [{ id: 1, name: 'Ethereum' }],
    };

    // Import and setup mocks
    const wagmiCore = await import('@wagmi/core');
    (wagmiCore.getPublicClient as any).mockReturnValue(mockClient);
    (wagmiCore.watchContractEvent as any).mockReturnValue(vi.fn());

    provider = new WagmiPublicProvider({ config: mockConfig });
  });

  it('should subscribe to contract events and filter by topics', async () => {
    const callback = vi.fn();
    const unwatch = vi.fn();

    const wagmiCore = await import('@wagmi/core');

    // Mock watchContractEvent to capture the onLogs callback
    let capturedOnLogs: ((logs: Log[]) => void) | undefined;
    (wagmiCore.watchContractEvent as any).mockImplementation((_config: any, params: any) => {
      capturedOnLogs = params.onLogs;
      return unwatch;
    });

    const result = await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [TRANSFER_TOPIC],
      callback,
    });

    expect(wagmiCore.getPublicClient).toHaveBeenCalledWith(mockConfig, { chainId: 1 });
    expect(wagmiCore.watchContractEvent).toHaveBeenCalledWith(mockConfig, {
      address: TEST_ADDRESS,
      abi: TEST_ABI,
      onLogs: expect.any(Function),
    });
    expect(result).toBe(unwatch);

    // Test the filtering logic
    expect(capturedOnLogs).toBeDefined();
    if (capturedOnLogs) {
      const matchingLog: Log = {
        address: TEST_ADDRESS as `0x${string}`,
        topics: [TRANSFER_TOPIC as `0x${string}`],
        data: '0x',
        blockNumber: 12345n,
        transactionHash: '0xabc' as `0x${string}`,
        transactionIndex: 0,
        blockHash: '0xdef' as `0x${string}`,
        logIndex: 0,
        removed: false,
      };

      capturedOnLogs([matchingLog]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(matchingLog);
    }
  });

  it('should throw error when no client is configured for network', async () => {
    const wagmiCore = await import('@wagmi/core');
    (wagmiCore.getPublicClient as any).mockReturnValue(undefined);

    const callback = vi.fn();

    await expect(
      provider.subscribeToContractEvents({
        contractAddress: TEST_ADDRESS,
        abi: TEST_ABI,
        networkId: 999,
        topics: [TRANSFER_TOPIC],
        callback,
      })
    ).rejects.toThrow('No client configured for network 999');
  });

  it('should wrap errors with _wrapError', async () => {
    const wagmiCore = await import('@wagmi/core');
    (wagmiCore.watchContractEvent as any).mockImplementation(() => {
      throw new Error('Wagmi error');
    });

    const callback = vi.fn();

    await expect(
      provider.subscribeToContractEvents({
        contractAddress: TEST_ADDRESS,
        abi: TEST_ABI,
        networkId: 1,
        topics: [TRANSFER_TOPIC],
        callback,
      })
    ).rejects.toThrow('Wagmi public provider subscribeToContractEvents failed');
  });

  it('should filter logs correctly with multiple topics', async () => {
    const callback = vi.fn();
    const unwatch = vi.fn();

    const topic1 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const topic2 = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

    const wagmiCore = await import('@wagmi/core');

    let capturedOnLogs: ((logs: Log[]) => void) | undefined;
    (wagmiCore.watchContractEvent as any).mockImplementation((_config: any, params: any) => {
      capturedOnLogs = params.onLogs;
      return unwatch;
    });

    await provider.subscribeToContractEvents({
      contractAddress: TEST_ADDRESS,
      abi: TEST_ABI,
      networkId: 1,
      topics: [topic1, topic2],
      callback,
    });

    if (capturedOnLogs) {
      const fullMatchLog: Log = {
        address: TEST_ADDRESS as `0x${string}`,
        topics: [topic1 as `0x${string}`, topic2 as `0x${string}`],
        data: '0x',
        blockNumber: 12345n,
        transactionHash: '0xabc' as `0x${string}`,
        transactionIndex: 0,
        blockHash: '0xdef' as `0x${string}`,
        logIndex: 0,
        removed: false,
      };

      const wrongTopicLog: Log = {
        ...fullMatchLog,
        topics: ['0x9999' as `0x${string}`, topic2 as `0x${string}`],
      };

      capturedOnLogs([fullMatchLog, wrongTopicLog]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(fullMatchLog);
    }
  });
});
