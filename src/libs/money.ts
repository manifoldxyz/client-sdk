import { ethers } from 'ethers';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { Currency } from '@manifoldxyz/js-ts-utils';
import {
  getEthToUsdRate,
  getERC20ToUSDRate,
  getNativeCurrencySymbol,
  calculateUSDValue,
} from '../api/coinbase';
import type { MoneyData } from '../types/money';

/**
 * Robust Money class for handling both native and ERC20 token amounts
 */
export class Money implements MoneyData {
  readonly value: ethers.BigNumber;
  readonly decimals: number;
  readonly erc20: string;
  readonly symbol: string;
  readonly formatted: string;
  readonly formattedUSD?: string;
  readonly networkId: number;

  private constructor(params: {
    value: ethers.BigNumber;
    decimals: number;
    erc20: string;
    symbol: string;
    formattedUSD?: string;
    networkId: number;
  }) {
    this.value = params.value;
    this.decimals = params.decimals;
    this.erc20 = params.erc20;
    this.symbol = params.symbol;
    this.formatted = ethers.utils.formatUnits(params.value, params.decimals);
    this.formattedUSD = params.formattedUSD;
    this.networkId = params.networkId;
  }

  /**
   * Create a Money instance - automatically fetches metadata
   */
  static async create(params: {
    value: ethers.BigNumber | string | number;
    networkId: number;
    erc20?: string;
    provider?:
      | ethers.providers.JsonRpcProvider
      | ethers.providers.Web3Provider
      | ethers.providers.JsonRpcSigner;
    fetchUSD?: boolean;
  }): Promise<Money> {
    const {
      value,
      networkId,
      erc20 = ethers.constants.AddressZero,
      provider,
      fetchUSD = true,
    } = params;

    const bigNumberValue = ethers.BigNumber.from(value.toString());
    const isNative = erc20 === ethers.constants.AddressZero;

    let symbol: string;
    let decimals: number;
    let formattedUSD: string | undefined;

    if (isNative) {
      // Native token
      symbol = getNativeCurrencySymbol(networkId);
      decimals = 18; // Native tokens always have 18 decimals

      if (fetchUSD) {
        try {
          const usdRate = await getEthToUsdRate(symbol);
          if (usdRate) {
            formattedUSD = calculateUSDValue(BigInt(bigNumberValue.toString()), decimals, usdRate);
          }
        } catch (error) {
          console.debug('Failed to fetch USD rate for native token:', error);
        }
      }
    } else {
      // ERC20 token
      const metadata = await Currency.getERC20Metadata(networkId, erc20, provider);
      symbol = metadata.symbol;
      decimals = metadata.decimals;

      if (fetchUSD) {
        try {
          const usdRate = await getERC20ToUSDRate(symbol, erc20);
          if (usdRate) {
            formattedUSD = calculateUSDValue(BigInt(bigNumberValue.toString()), decimals, usdRate);
          }
        } catch (error) {
          console.debug('Failed to fetch USD rate for ERC20:', error);
        }
      }
    }

    return new Money({
      value: bigNumberValue,
      decimals,
      erc20,
      symbol,
      formattedUSD,
      networkId,
    });
  }

  /**
   * Create a zero-value Money instance
   */
  static async zero(params: {
    networkId: number;
    erc20?: string;
    provider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider;
  }): Promise<Money> {
    return Money.create({
      value: 0,
      networkId: params.networkId,
      erc20: params.erc20,
      provider: params.provider,
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
      erc20: data.erc20,
      symbol: data.symbol,
      networkId: data.networkId,
      formattedUSD: 'formattedUSD' in data ? data.formattedUSD : undefined,
    });
  }

  /**
   * Check if this is an ERC20 token (vs native token)
   */
  isERC20(): boolean {
    return this.erc20 !== ethers.constants.AddressZero;
  }

  /**
   * Check if this is a native token
   */
  isNative(): boolean {
    return this.erc20 === ethers.constants.AddressZero;
  }

  /**
   * Check if this Money has the same currency as another
   */
  isSameCurrency(other: Money): boolean {
    return this.erc20 === other.erc20 && this.symbol === other.symbol;
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

    const newValue = this.value.add(other.value);
    const newUSD =
      this.formattedUSD && other.formattedUSD
        ? (parseFloat(this.formattedUSD) + parseFloat(other.formattedUSD)).toFixed(2)
        : this.formattedUSD || other.formattedUSD;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      erc20: this.erc20,
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

    if (other.value.gt(this.value)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Cannot subtract ${other.formatted} from ${this.formatted} - would result in negative`,
      );
    }

    const newValue = this.value.sub(other.value);
    const newUSD =
      this.formattedUSD && other.formattedUSD
        ? (parseFloat(this.formattedUSD) - parseFloat(other.formattedUSD)).toFixed(2)
        : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      erc20: this.erc20,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Multiply by a scalar value
   */
  multiply(scalar: number | string): Money {
    const multiplier = ethers.BigNumber.from(Math.floor(Number(scalar) * 1000));
    const newValue = this.value.mul(multiplier).div(1000);

    const newUSD = this.formattedUSD
      ? (parseFloat(this.formattedUSD) * Number(scalar)).toFixed(2)
      : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      erc20: this.erc20,
      symbol: this.symbol,
      formattedUSD: newUSD,
      networkId: this.networkId,
    });
  }

  /**
   * Multiply by an integer (more precise than multiply for whole numbers)
   */
  multiplyInt(scalar: number): Money {
    const newValue = this.value.mul(scalar);

    const newUSD = this.formattedUSD
      ? (parseFloat(this.formattedUSD) * scalar).toFixed(2)
      : undefined;

    return new Money({
      value: newValue,
      decimals: this.decimals,
      erc20: this.erc20,
      symbol: this.symbol,
      formattedUSD: newUSD,
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

    if (this.value.lt(other.value)) return -1;
    if (this.value.gt(other.value)) return 1;
    return 0;
  }

  /**
   * Check if equal to another Money amount
   */
  isEqualTo(other: Money): boolean {
    return this.isSameCurrency(other) && this.value.eq(other.value);
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
    return this.value.gt(other.value);
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
    return this.value.gte(other.value);
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
    return this.value.lt(other.value);
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
    return this.value.lte(other.value);
  }

  /**
   * Check if the value is zero
   */
  isZero(): boolean {
    return this.value.isZero();
  }

  /**
   * Check if the value is positive (greater than zero)
   */
  isPositive(): boolean {
    return this.value.gt(0);
  }

  /**
   * Clone with updated USD value
   */
  withUSD(formattedUSD: string): Money {
    return new Money({
      value: this.value,
      decimals: this.decimals,
      erc20: this.erc20,
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
      erc20: this.erc20,
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
   * Get the raw BigNumber value
   */
  get raw(): ethers.BigNumber {
    return this.value;
  }
}

/**
 * Type guard to check if an object is a Money instance
 */
export function isMoney(obj: unknown): obj is Money {
  return obj instanceof Money;
}
