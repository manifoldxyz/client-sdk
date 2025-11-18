import type {
  PaymentPayload,
  PaymentRequirements,
  Resource,
  SettleResponse,
  VerifyResponse,
} from 'x402/types';
import axios from 'axios';
import { getChainConfig, getSupportedERC20Tokens } from '../utils/viemClients';
import { toJsonSafe } from 'x402/shared';
import { isTestnet } from './common';
import type { Money } from '@manifoldxyz/client-sdk';

export async function convertCostToUSDC(
  nativeCostWei: bigint,
  erc20Costs: Money[],
  productChainId: number,
  paymentNetworkId: number,
  adminWalletAddress: string,
): Promise<string> {
  const productChainConfig = getChainConfig(productChainId);
  const paymentChainConfig = getChainConfig(paymentNetworkId);
  let totalUSDC = BigInt(0);

  // Use Relay for mainnet conversion
  const relayClient = (await import('@reservoir0x/relay-sdk')).getClient();
  if (!relayClient) {
    throw new Error('Relay client not initialized');
  }

  if (erc20Costs.length > 0) {
    for (const erc20Cost of erc20Costs) {
      if (!getSupportedERC20Tokens(productChainId).includes(erc20Cost.address.toLowerCase())) {
        throw new Error(`Unsupported ERC20 token: ${erc20Cost.address}`);
      }
      // If there are USDC costs, add them directly
      if (erc20Cost.address.toLowerCase() === productChainConfig?.usdcAddress.toLowerCase()) {
        totalUSDC += erc20Cost.raw;
        console.log(`Added USDC cost: ${erc20Cost.raw}`);
      } else {
        const quote = await relayClient.actions.getQuote({
          chainId: productChainId, // Use payment network for conversion
          toChainId: paymentNetworkId,
          currency: erc20Cost.address,
          toCurrency: paymentChainConfig.usdcAddress, // x402 expects USDC on the payment network
          amount: erc20Cost.raw.toString(),
          tradeType: 'EXACT_INPUT',
        });
        if (quote && quote.details?.currencyOut?.amount) {
          const convertedUSDC = BigInt(quote.details.currencyOut.amount);
          totalUSDC += convertedUSDC;
          console.log(`Added converted USDC cost: ${convertedUSDC}`);
        } else {
          throw new Error('Failed to get quote for ETH to USDC conversion');
        }
      }
    }
  }

  if (nativeCostWei > 0n) {
    // Check if we're on a testnet (Base Sepolia or Sepolia)
    const isTestNetwork = isTestnet(paymentNetworkId);

    if (isTestNetwork) {
      // Use hardcoded conversion for testnets: 1 USDC = 0.0005 ETH
      const convertedUSDC = (nativeCostWei * 2000n) / 10n ** 12n;

      totalUSDC += convertedUSDC;

      console.log(
        `Testnet conversion: ${nativeCostWei} wei -> ${convertedUSDC} USDC (before buffer)`,
      );
    } else {
      try {
        const quote = await relayClient.actions.getQuote({
          chainId: productChainId, // Use payment network for conversion
          toChainId: paymentNetworkId,
          currency: '0x0000000000000000000000000000000000000000', // ETH
          toCurrency: paymentChainConfig.usdcAddress,
          amount: nativeCostWei.toString(),
          tradeType: 'EXACT_INPUT',
          user: adminWalletAddress,
          recipient: adminWalletAddress,
        });

        if (quote && quote.details?.currencyOut?.amount) {
          const convertedUSDC = BigInt(quote.details.currencyOut.amount);
          totalUSDC += convertedUSDC;
          console.log(`Added converted USDC cost: ${convertedUSDC}`);
        } else {
          throw new Error('Failed to get quote for ETH to USDC conversion');
        }
      } catch (error) {
        console.error('Relay quote error:', error);
        throw new Error('Failed to convert ETH to USDC');
      }
    }
  }

  return totalUSDC.toString();
}

export function createPaymentRequirements(
  amountInUSDC: string,
  chainId: number,
  resource: Resource,
  adminWalletAddress: string,
  productName?: string,
): PaymentRequirements {
  const chainConfig = getChainConfig(chainId);
  const network = chainId === 8453 ? 'base' : 'base-sepolia';

  return {
    scheme: 'exact',
    network: network as any,
    maxAmountRequired: amountInUSDC,
    resource,
    description: `NFT Purchase: ${productName || 'Manifold NFT'}`,
    mimeType: 'application/json',
    payTo: adminWalletAddress,
    maxTimeoutSeconds: 300,
    asset: chainConfig.usdcAddress,
    outputSchema: {
        input: {
          type: "http",
          method:"GET",
          queryParams: {
            quantity: {
              type: "number",
              description: "Number of NFTs to mint",
              required: false,
            },
            recipientAddress: {
              type: "string",
              description: "Recipient wallet address to mint the NFT to",
              required: false,
            },
          },
        },
        output: {
          success: "boolean",
          transactionHash: "string",
          blockNumber: "number",
          recipient: "string",
          product: {
            id: "string",
            name: "string",
            type: "string",
          },
          tokens: [
            {
              tokenId: "string",
              quantity: "number",
              contractAddress: "string",
              explorerUrl: "string",
            }
          ],
          totalCost: {
              usdc: "string",
              formatted: "string",
          }
      },
    },
    extra: { name: isTestnet(chainId) ? 'USDC' : 'USD Coin', version: '2' },
  };
}

export async function verify(
  {
    url,
    createAuthHeaders,
  }: {
    url: string;
    createAuthHeaders?: () => Promise<{
      settle: Record<string, string>;
      verify: Record<string, string>;
    }>;
  },
  decodedPayment: PaymentPayload,
  paymentRequirements: PaymentRequirements,
) {
  let headers = { 'Content-Type': 'application/json' };
  if (createAuthHeaders) {
    const authHeaders = await createAuthHeaders();
    headers = { ...headers, ...authHeaders.verify };
  }

  const bodyData = {
    x402Version: decodedPayment.x402Version,
    paymentPayload: toJsonSafe(decodedPayment),
    paymentRequirements: toJsonSafe(paymentRequirements),
  };

  const response = await axios.post(`${url}/verify`, bodyData, {
    headers,
  });
  return response.data as VerifyResponse;
}

export async function settle(
  {
    url,
    createAuthHeaders,
  }: {
    url: string;
    createAuthHeaders?: () => Promise<{ settle: Record<string, string> }>;
  },
  decodedPayment: PaymentPayload,
  paymentRequirements: PaymentRequirements,
) {
  let headers = { 'Content-Type': 'application/json' };
  if (createAuthHeaders) {
    const authHeaders = await createAuthHeaders();
    headers = { ...headers, ...authHeaders.settle };
  }

  const bodyData = {
    x402Version: decodedPayment.x402Version,
    paymentPayload: toJsonSafe(decodedPayment),
    paymentRequirements: toJsonSafe(paymentRequirements),
  };

  const response = await axios.post(`${url}/settle`, bodyData, {
    headers,
  });

  return response.data as SettleResponse;
}
