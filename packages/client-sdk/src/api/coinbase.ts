/**
 * Coinbase API integration for fetching cryptocurrency to USD exchange rates
 */

/**
 * Fetch ETH or other native currency to USD exchange rate from Coinbase
 * @param currency - The currency symbol (e.g., 'ETH', 'MATIC')
 * @returns The current USD price or undefined if fetch fails
 */
export async function getEthToUsdRate(currency = 'ETH'): Promise<number | undefined> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`https://api.coinbase.com/v2/prices/${currency}-USD/spot`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Coinbase API error: ${response.status}`);
    }

    const data: {
      data: {
        amount: string;
      };
    } = (await response.json()) as {
      data: {
        amount: string;
      };
    };
    return parseFloat(data.data.amount);
  } catch (error) {
    console.warn(`Failed to fetch ${currency}/USD rate:`, error);
    return undefined;
  }
}

/**
 * Fetch ERC20 token to USD exchange rate from CoinGecko
 * @param tokenSymbol - The token symbol (e.g., 'USDC', 'DAI')
 * @param tokenAddress - Optional token contract address for more accurate lookup
 * @returns The current USD price or undefined if fetch fails
 */
export async function getERC20ToUSDRate(
  tokenSymbol: string,
  tokenAddress?: string,
): Promise<number | undefined> {
  try {
    // First try Coinbase for common tokens
    if (isCommonToken(tokenSymbol)) {
      const coinbaseRate = await getEthToUsdRate(tokenSymbol);
      if (coinbaseRate) return coinbaseRate;
    }

    // Fallback to CoinGecko for other tokens
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try to get by contract address if provided (more accurate)
    let url: string;
    if (tokenAddress) {
      url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`;
    } else {
      // Fallback to symbol-based lookup
      const coinId = getCoinGeckoId(tokenSymbol);
      url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: {
      [key: string]: { usd: string };
    } = (await response.json()) as {
      [key: string]: { usd: string };
    };

    if (tokenAddress) {
      // Response format for contract address lookup
      const price = data[tokenAddress.toLowerCase()]?.usd;
      return price ? parseFloat(price) : undefined;
    } else {
      // Response format for coin ID lookup
      const coinId = getCoinGeckoId(tokenSymbol);
      const price = data[coinId]?.usd;
      return price ? parseFloat(price) : undefined;
    }
  } catch (error) {
    console.warn(`Failed to fetch ${tokenSymbol}/USD rate:`, error);
    return undefined;
  }
}

/**
 * Calculate USD value for a given amount and rate
 * @param amount - The amount in wei or token units
 * @param decimals - The token decimals
 * @param rate - The USD exchange rate
 * @returns Formatted USD string
 */
export function calculateUSDValue(
  amount: bigint,
  decimals: number,
  rate: number,
  decimalPlaces = 2,
): string {
  if (!rate || rate === 0) return '0';

  // Convert from smallest unit to decimal
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  // Calculate decimal value
  const decimalValue = Number(wholePart) + Number(fractionalPart) / Number(divisor);
  const usdValue = decimalValue * rate;

  // Format to decimal places
  return usdValue.toFixed(decimalPlaces);
}

// Helper function to check if token is commonly traded on Coinbase
function isCommonToken(symbol: string): boolean {
  const commonTokens = ['USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'COMP', 'MKR', 'SNX'];
  return commonTokens.includes(symbol.toUpperCase());
}

// Helper function to map token symbols to CoinGecko IDs
function getCoinGeckoId(symbol: string): string {
  const symbolToId: Record<string, string> = {
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    WETH: 'weth',
    WBTC: 'wrapped-bitcoin',
    LINK: 'chainlink',
    UNI: 'uniswap',
    AAVE: 'aave',
    COMP: 'compound-governance-token',
    MKR: 'maker',
    SNX: 'synthetix-network-token',
    // Add more mappings as needed
  };

  return symbolToId[symbol.toUpperCase()] || symbol.toLowerCase();
}
