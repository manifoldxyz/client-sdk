import { describe, it, expect } from 'vitest';
import { Money, isMoney } from '../../src/libs/money';
import { ClientSDKError } from '../../src/types/errors';
import { ethers } from 'ethers';

const ethData = {
  value: 1000000000000000000n,
  decimals: 18,
  address: ethers.constants.AddressZero,
  symbol: 'ETH',
  formatted: '1.0',
  networkId: 1,
  formattedUSD: '3200.00',
};

const higherEthData = {
  ...ethData,
  value: 2000000000000000000n,
  formatted: '2.0',
  formattedUSD: '6400.00',
};

const usdcData = {
  value: 1000000n,
  decimals: 6,
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  formatted: '1.0',
  networkId: 1,
  formattedUSD: '1.00',
};

describe('Money class', () => {
  it('identifies native and ERC20 tokens', () => {
    const eth = Money.fromData(ethData);
    const usdc = Money.fromData(usdcData);

    expect(eth.isNative()).toBe(true);
    expect(eth.isERC20()).toBe(false);

    expect(usdc.isNative()).toBe(false);
    expect(usdc.isERC20()).toBe(true);
  });

  it('adds and subtracts amounts of same currency', () => {
    const oneEth = Money.fromData(ethData);
    const anotherEth = Money.fromData(ethData);

    const added = oneEth.add(anotherEth);
    expect(added.value.toString()).toBe('2000000000000000000');
    expect(added.formattedUSD).toBe('6400.00');

    const subtracted = added.subtract(oneEth);
    expect(subtracted.value.toString()).toBe(oneEth.value.toString());
    expect(subtracted.formattedUSD).toBe('3200.00');
  });

  it('throws when adding or subtracting different currencies', () => {
    const eth = Money.fromData(ethData);
    const usdc = Money.fromData(usdcData);

    expect(() => eth.add(usdc)).toThrow(ClientSDKError);
    expect(() => eth.subtract(usdc)).toThrow(ClientSDKError);
  });

  it('prevents subtracting amounts larger than balance', () => {
    const oneEth = Money.fromData(ethData);
    const twoEth = Money.fromData(higherEthData);

    expect(() => oneEth.subtract(twoEth)).toThrow(ClientSDKError);
  });

  it('multiplies amounts by scalars', () => {
    const oneEth = Money.fromData(ethData);

    const multiplied = oneEth.multiply(2.5);
    expect(multiplied.value.toString()).toBe('2500000000000000000');
    expect(multiplied.formattedUSD).toBe('8000.00');

    const multipliedInt = oneEth.multiplyInt(3);
    expect(multipliedInt.value.toString()).toBe('3000000000000000000');
    expect(multipliedInt.formattedUSD).toBe('9600.00');
  });

  it('compares values of same currency correctly', () => {
    const oneEth = Money.fromData(ethData);
    const twoEth = Money.fromData(higherEthData);

    expect(oneEth.compareTo(twoEth)).toBe(-1);
    expect(twoEth.compareTo(oneEth)).toBe(1);
    expect(oneEth.compareTo(Money.fromData(ethData))).toBe(0);

    expect(oneEth.isEqualTo(Money.fromData(ethData))).toBe(true);
    expect(twoEth.isGreaterThan(oneEth)).toBe(true);
    expect(oneEth.isGreaterThanOrEqual(twoEth)).toBe(false);
    expect(oneEth.isLessThan(twoEth)).toBe(true);
    expect(oneEth.isLessThanOrEqual(twoEth)).toBe(true);
  });

  it('throws when comparing different currencies', () => {
    const eth = Money.fromData(ethData);
    const usdc = Money.fromData(usdcData);

    expect(() => eth.compareTo(usdc)).toThrow(ClientSDKError);
    expect(() => eth.isGreaterThan(usdc)).toThrow(ClientSDKError);
  });

  it('provides display helpers and cloning', () => {
    const eth = Money.fromData(ethData);
    expect(eth.isZero()).toBe(false);
    expect(eth.isPositive()).toBe(true);
    expect(eth.toDisplayString()).toBe('1.0 ETH');
    expect(eth.toDisplayString(true)).toBe('1.0 ETH ($3200.00)');

    const withoutUsd = Money.fromData({ ...ethData, formattedUSD: undefined });
    const withUsd = withoutUsd.withUSD('100.00');
    expect(withUsd.formattedUSD).toBe('100.00');
  });

  it('converts to and from plain object', () => {
    const eth = Money.fromData(ethData);
    const serialized = eth.toObject();
    expect(serialized).toMatchObject({
      symbol: 'ETH',
      formatted: '1.0',
      networkId: 1,
    });
    const restored = Money.fromData(serialized);
    expect(restored.isEqualTo(eth)).toBe(true);
  });

  it('type guard detects Money instances', () => {
    const eth = Money.fromData(ethData);
    expect(isMoney(eth)).toBe(true);
    expect(isMoney({ ...eth })).toBe(false);
  });
});
