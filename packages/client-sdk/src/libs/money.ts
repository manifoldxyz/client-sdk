import { ethers } from 'ethers';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { Currency } from '@manifoldxyz/js-ts-utils';
import { getEthToUsdRate, getERC20ToUSDRate, calculateUSDValue } from '../api/coinbase';
import type { MoneyData } from '../types/money';

/**
 * Robust Money class for handling both native and ERC20 token amounts
 */
export class Money implements MoneyData {
  readonly value: bigint;
  readonly decimals: number;
  readonly address: string;
  readonly symbol: string;
  readonly formatted: string;
  readonly formattedUSD?: string;
  readonly networkId: number;

  private constructor(params: {
    value: bigint;
    decimals: number;
    address: string;
    symbol: string;
    formattedUSD?: string;
    networkId: number;
  }) {
    this.value = params.value;
    this.decimals = params.decimals;
    this.address = params.address;
    this.symbol = params.symbol;
    this.formatted = ethers.utils.formatUnits(params.value.toString(), params.decimals);
    this.formattedUSD = params.formattedUSD;
    this.networkId = params.networkId;
  }

  /**
   * Create a Money instance - automatically fetches metadata
   */
  static async create(params: {
    value: bigint | string | number;
    networkId: number;
    address?: string;
    fetchUSD?: boolean;
  }): Promise<Money> {
    const { value, networkId, address = ethers.constants.AddressZero, fetchUSD = true } = params;

    const bigintValue = typeof value === 'bigint' ? value : BigInt(value.toString());
    const isNative = address === ethers.constants.AddressZero;
    console.log('isNative  ', isNative)
    let symbol: string;
    let decimals: number;
    let formattedUSD: string | undefined;

    if (isNative) {
      // Native token
      symbol = Currency.ethCurrencyNameForNetwork(networkId);
      decimals = 18; // Native tokens always have 18 decimals

      if (fetchUSD) {
        try {
          const usdRate = await getEthToUsdRate(symbol);
          if (usdRate) {
            formattedUSD = calculateUSDValue(bigintValue, decimals, usdRate);
          }
        } catch (error) {
          console.debug('Failed to fetch USD rate for native token:', error);
        }
      }
    } else {
      console.log('isERC20  ', address)
      // ERC20 token
      const metadata = await Currency.getERC20Metadata(networkId, address);
      symbol = metadata.symbol;
      decimals = metadata.decimals;

      if (fetchUSD) {
        try {
          const usdRate = await getERC20ToUSDRate(symbol, address);
          if (usdRate) {
            formattedUSD = calculateUSDValue(bigintValue, decimals, usdRate);
          }
        } catch (error) {
          console.debug('Failed to fetch USD rate for ERC20:', error);
        }
      }
    }

    return new Money({
      value: bigintValue,
      decimals,
      address,
      symbol,
      formattedUSD,
      networkId,
    });
  }

  /**
   * Create a zero-value Money instance
   */
  static async zero(params: { networkId: number; address?: string }): Promise<Money> {
    return Money.create({
      value: 0,
      networkId: params.networkId,
      address: params.address,
      fetchUSD: false, // No need to fetch USD for zero value
    });
  }

  /**
   * Create from existing Money data (when you already have all the metadata)
   */
  static fromData(data: MoneyData | Omit<MoneyData, 'formatted'>): Money {
    return new Money({
      value: data.value,
      decimals: data.decimals,
      address: data.address,
      symbol: data.symbol,
      networkId: data.networkId,
      formattedUSD: 'formattedUSD' in data ? data.formattedUSD : undefined,
    });
  }

  /**
   * Check if this is an ERC20 token (vs native token)
   */
  isERC20(): boolean {
    return this.address !== ethers.constants.AddressZero;
  }

  /**
   * Check if this is a native token
   */
  isNative(): boolean {
    return this.address === ethers.constants.AddressZero;
  }

  /**
   * Check if this Money has the same currency as another
   */
  isSameCurrency(other: Money): boolean {
    return this.address === other.address && this.symbol === other.symbol;
  }

  /**
   * Add another Money amount (must be same currency)
   */
  add(other: Money): Money {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot add different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }

    const newValue = this.value + other.value;
    const newUSD =
      this.formattedUSD && other.formattedUSD
        ? (parseFloat(this.formattedUSD) + parseFloat(other.formattedUSD)).toFixed(2)
        : this.formattedUSD || other.formattedUSD;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Subtract another Money amount (must be same currency)
   */
  subtract(other: Money): Money {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot subtract different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }

    if (other.value > this.value) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot subtract ${other.formatted} from ${this.formatted} - would result in negative`,
      );
    }

    const newValue = this.value - other.value;
    const newUSD =
      this.formattedUSD && other.formattedUSD
        ? (parseFloat(this.formattedUSD) - parseFloat(other.formattedUSD)).toFixed(2)
        : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Multiply by a scalar value
   */
  multiply(scalar: number | string): Money {
    const multiplier = BigInt(Math.floor(Number(scalar) * 1000));
    const newValue = (this.value * multiplier) / 1000n;

    const newUSD = this.formattedUSD
      ? (parseFloat(this.formattedUSD) * Number(scalar)).toFixed(2)
      : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Multiply by an integer (more precise than multiply for whole numbers)
   */
  multiplyInt(scalar: number): Money {
    const newValue = this.value * BigInt(scalar);

    const newUSD = this.formattedUSD
      ? (parseFloat(this.formattedUSD) * scalar).toFixed(2)
      : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Divide by an integer amount (flooring the quotient to avoid fractional wei)
   */
  divideInt(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor <= 0) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Divisor must be a positive integer, received ${divisor}`,
      );
    }

    const dividedValue = this.value / BigInt(divisor);
    const formattedUSD =
      this.formattedUSD !== undefined
        ? (parseFloat(this.formattedUSD) / divisor).toFixed(2)
        : undefined;

    return Money.fromData({
      value: dividedValue,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Compare to another Money amount (must be same currency)
   * Returns: -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: Money): number {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot compare different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }

    if (this.value < other.value) return -1;
    if (this.value > other.value) return 1;
    return 0;
  }

  /**
   * Check if equal to another Money amount
   */
  isEqualTo(other: Money): boolean {
    return this.isSameCurrency(other) && this.value === other.value;
  }

  /**
   * Check if greater than another Money amount
   */
  isGreaterThan(other: Money): boolean {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot compare different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }
    return this.value > other.value;
  }

  /**
   * Check if greater than or equal to another Money amount
   */
  isGreaterThanOrEqual(other: Money): boolean {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot compare different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }
    return this.value >= other.value;
  }

  /**
   * Check if less than another Money amount
   */
  isLessThan(other: Money): boolean {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot compare different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }
    return this.value < other.value;
  }

  /**
   * Check if less than or equal to another Money amount
   */
  isLessThanOrEqual(other: Money): boolean {
    if (!this.isSameCurrency(other)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot compare different currencies: ${this.symbol} and ${other.symbol}`,
      );
    }
    return this.value <= other.value;
  }

  /**
   * Check if the value is zero
   */
  isZero(): boolean {
    return this.value === 0n;
  }

  /**
   * Check if the value is positive (greater than zero)
   */
  isPositive(): boolean {
    return this.value > 0n;
  }

  /**
   * Clone with updated USD value
   */
  withUSD(formattedUSD: string): Money {
    return new Money({
      value: this.value,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formattedUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Convert to plain object (for backward compatibility)
   */
  toObject(): MoneyData {
    return {
      value: this.value,
      decimals: this.decimals,
      address: this.address,
      symbol: this.symbol,
      formatted: this.formatted,
      formattedUSD: this.formattedUSD,
      networkId: this.networkId,
    };
  }

  /**
   * Format for display with currency symbol
   */
  toDisplayString(includeUSD: boolean = false): string {
    const base = `${this.formatted} ${this.symbol}`;
    if (includeUSD && this.formattedUSD) {
      return `${base} ($${this.formattedUSD})`;
    }
    return base;
  }

  /**
   * Get the raw bigint value
   */
  get raw(): bigint {
    return this.value;
  }
}

/**
 * Type guard to check if an object is a Money instance
 */
export function isMoney(obj: unknown): obj is Money {
  return obj instanceof Money;
}
