import { describe, it, expect, vi } from 'vitest';
import { estimateGas, applyGasBuffer } from '../../src/utils/gas-estimation';
import { ErrorCode } from '../../src/types/errors';

describe('gas estimation utilities', () => {
  it('estimates gas using contract method when available', async () => {
    const gasValue = 21000n;
    const mockPublicProvider = {
      estimateContractGas: vi.fn().mockResolvedValue(gasValue),
    };

    const result = await estimateGas({
      publicProvider: mockPublicProvider as any,
      contractAddress: '0x0000000000000000000000000000000000000002',
      abi: [],
      functionName: 'mint',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
      networkId: 1,
    });

    expect(result).toEqual(gasValue);
    expect(mockPublicProvider.estimateContractGas).toHaveBeenCalledTimes(1);
    expect(mockPublicProvider.estimateContractGas).toHaveBeenCalledWith({
      contractAddress: '0x0000000000000000000000000000000000000002',
      abi: [],
      functionName: 'mint',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
      value: undefined,
      networkId: 1,
    });
  });

  it('falls back to provided fallback gas when estimation fails', async () => {
    const fallback = 500000n;
    const mockPublicProvider = {
      estimateContractGas: vi.fn().mockRejectedValue(new Error('boom')),
    };

    const result = await estimateGas({
      publicProvider: mockPublicProvider as any,
      contractAddress: '0x0000000000000000000000000000000000000002',
      abi: [],
      functionName: 'mint',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
      networkId: 1,
      fallbackGas: fallback,
    });

    expect(result).toEqual(fallback);
  });

  it('throws error when method is missing and no fallback provided', async () => {
    const mockPublicProvider = {
      estimateContractGas: vi.fn().mockRejectedValue(new Error('Method approve not found on contract')),
    };

    await expect(
      estimateGas({
        publicProvider: mockPublicProvider as any,
        contractAddress: '0x0000000000000000000000000000000000000002',
        abi: [],
        functionName: 'approve',
        args: [],
        from: '0x0000000000000000000000000000000000000001',
        networkId: 1,
      })
    ).rejects.toMatchObject({
      code: ErrorCode.GAS_ESTIMATION_FAILED,
      message: 'Failed to estimate gas for approve',
    });
  });

  it('applies buffer percentage to gas estimates', () => {
    const base = 100000n;
    expect(applyGasBuffer(base)).toEqual(130000n);
    expect(applyGasBuffer(base, 50)).toEqual(150000n);
  });
});
