import { describe, it, expect, vi } from 'vitest';
import { ethers } from 'ethers';
import { estimateGas, applyGasBuffer } from '../../src/utils/gas-estimation';

describe('gas estimation utilities', () => {
  it('estimates gas using contract method when available', async () => {
    const gasValue = ethers.BigNumber.from(21000);
    const contract = {
      estimateGas: {
        mint: vi.fn().mockResolvedValue(gasValue),
      },
    } as unknown as ethers.Contract;

    const result = await estimateGas({
      contract,
      method: 'mint',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
    });

    expect(result).toEqual(gasValue);
    expect(contract.estimateGas.mint).toHaveBeenCalledTimes(1);
    expect(contract.estimateGas.mint.mock.calls[0][0]).toEqual(
      expect.objectContaining({ from: '0x0000000000000000000000000000000000000001' }),
    );
  });

  it('falls back to provided fallback gas when estimation fails', async () => {
    const fallback = ethers.BigNumber.from(500000);
    const contract = {
      estimateGas: {
        mint: vi.fn().mockRejectedValue(new Error('boom')),
      },
    } as unknown as ethers.Contract;

    const result = await estimateGas({
      contract,
      method: 'mint',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
      fallbackGas: fallback,
    });

    expect(result).toEqual(fallback);
  });

  it('falls back to default gas when method is missing', async () => {
    const contract = {
      estimateGas: {},
    } as unknown as ethers.Contract;

    const result = await estimateGas({
      contract,
      method: 'approve',
      args: [],
      from: '0x0000000000000000000000000000000000000001',
    });

    expect(result).toEqual(ethers.BigNumber.from(200000));
  });

  it('applies buffer percentage to gas estimates', () => {
    const base = ethers.BigNumber.from(100000);
    expect(applyGasBuffer(base)).toEqual(ethers.BigNumber.from(130000));
    expect(applyGasBuffer(base, 50)).toEqual(ethers.BigNumber.from(150000));
  });
});
