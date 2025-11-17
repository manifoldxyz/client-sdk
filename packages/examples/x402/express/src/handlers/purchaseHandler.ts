import type { Request, Response } from 'express';
import type { Product } from '@manifoldxyz/client-sdk';
import { ClientSDKError, createAccountViem } from '@manifoldxyz/client-sdk';
import { createClient as createRelayClient, MAINNET_RELAY_API } from '@reservoir0x/relay-sdk';
import { exact } from 'x402/schemes';
import type { PaymentPayload, Resource } from 'x402/types';
import { settleResponseHeader } from 'x402/types';
import { formatUnits, isAddress } from 'viem';
import {
  createAdminWalletClient,
  getSupportedERC20Tokens,
  parseChainName,
} from '../utils/viemClients';
import type { ErrorResponse, MintResponse } from '../types';
import { ErrorCodes } from '../types';
import { convertCostToUSDC, createPaymentRequirements, settle, verify } from '../utils/payment';
import { fetchManifoldProduct } from '../utils/manifold';
import {
  isTestnet,
  SUPPORTED_PAYMENT_NETWORKS,
  SUPPORTED_PRODUCT_NETWORKS,
  TESTNET_NETWORKS,
} from '../utils/common';
import { facilitator } from '@coinbase/x402';

const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS;
const x402Version = 1;

// Initialize Relay SDK
createRelayClient({
  baseApiUrl: MAINNET_RELAY_API,
  source: 'manifold.x402.endpoint',
});

export async function handleManifoldPurchase(req: Request, res: Response) {
  const { id: instanceId, chainName } = req.params;
  const quantity = parseInt((req.query.quantity as string) || '1');
  const recipientAddress = req.query.recipientAddress as string | undefined;
  if (recipientAddress && !isAddress(recipientAddress)) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: 'Invalid recipient address',
      errorCode: ErrorCodes.INVALID_INPUT,
    };
    return res.status(400).json(errorResponse);
  }
  // Parse chain name to network ID
  let paymentNetworkId: number;
  try {
    paymentNetworkId = parseChainName(chainName || '');
  } catch (error: any) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: error.message,
      errorCode: ErrorCodes.UNSUPPORTED_NETWORK,
    };
    return res.status(400).json(errorResponse);
  }

  if (!SUPPORTED_PAYMENT_NETWORKS.includes(paymentNetworkId)) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: `Unsupported payment network. Only ${SUPPORTED_PAYMENT_NETWORKS.join(', ')} are supported`,
      errorCode: ErrorCodes.UNSUPPORTED_NETWORK,
    };
    return res.status(400).json(errorResponse);
  }

  if (!instanceId) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: 'Instance ID is required',
      errorCode: ErrorCodes.PRODUCT_NOT_FOUND,
    };
    return res.status(400).json(errorResponse);
  }

  // 1. Fetch product details using Manifold Client SDK
  const product = await fetchManifoldProduct(instanceId);
  // 2. Validate product type and network support
  const productChainId = product.data.publicData.network;
  if (!SUPPORTED_PRODUCT_NETWORKS.includes(productChainId)) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: `Unsupported network. Only ${SUPPORTED_PRODUCT_NETWORKS.join(', ')} are supported`,
      errorCode: ErrorCodes.UNSUPPORTED_NETWORK,
    };
    return res.status(400).json(errorResponse);
  }

  // 3. Check product status
  const productStatus = await product.getStatus();
  if (productStatus !== 'active') {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: `Product is ${productStatus}`,
      errorCode: ErrorCodes.PRODUCT_NOT_ACTIVE,
    };
    return res.status(400).json(errorResponse);
  }

  // Ensure no mixing of testnet and mainnet networks
  if (!isTestnet(productChainId) || !isTestnet(paymentNetworkId)) {
    if (
      [productChainId, paymentNetworkId].some((networkId) => TESTNET_NETWORKS.includes(networkId))
    ) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: 'Mixing testnet and mainnet networks is not supported',
        errorCode: ErrorCodes.UNSUPPORTED_NETWORK,
      };
      return res.status(400).json(errorResponse);
    }
  }

  try {
    // Phase 1: Cost Calculation if no payment header
    const paymentHeader = req.header('X-PAYMENT');
    if (!paymentHeader) {
      return await handleCostCalculation(
        product,
        req,
        res,
        quantity,
        recipientAddress,
        paymentNetworkId,
      );
    }

    // Phase 2: Payment Verification and NFT Minting
    return await handleMintExecution(
      product,
      req,
      res,
      quantity,
      recipientAddress,
      paymentNetworkId,
    );
  } catch (error: any) {
    console.error('Error in purchase handler:', error);
    const errorResponse: ErrorResponse = {
      x402Version,
      error: error.message || 'Internal server error',
      errorCode: ErrorCodes.MINT_FAILED,
      details: error,
    };
    return res.status(500).json(errorResponse);
  }
}

async function handleCostCalculation(
  product: Product,
  req: Request,
  res: Response,
  quantity: number,
  recipientAddress: string | undefined,
  paymentNetworkId: number,
) {
  const productChainId = product.data.publicData.network;
  try {
    // 4. Prepare purchase to get cost details
    const adminAddress = adminWalletAddress;
    if (!adminAddress) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: 'Admin wallet address not configured or user address not provided',
        errorCode: ErrorCodes.MINT_FAILED,
      };
      return res.status(500).json(errorResponse);
    }

    const preparedPurchase = await product.preparePurchase({
      userAddress: adminAddress,
      recipientAddress,
      payload: { quantity },
      gasBuffer: { multiplier: 1.2 }, // 20% gas buffer
    });

    // 5. Calculate total cost components
    const totalCostWei = preparedPurchase.cost.total.native.raw;
    const erc20Costs = preparedPurchase.cost.total.erc20s || [];

    // Check if product uses unsupported tokens
    const hasUnsupportedTokens = erc20Costs.some(
      (token) => !getSupportedERC20Tokens(productChainId).includes(token.address.toLowerCase()),
    );

    if (hasUnsupportedTokens) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: `Product uses unsupported payment tokens. Supported tokens: ${getSupportedERC20Tokens(productChainId).join(', ')}`,
        errorCode: ErrorCodes.UNSUPPORTED_CURRENCY,
      };
      return res.status(400).json(errorResponse);
    }

    // 6. Convert total cost to USDC using Relay SDK
    const totalCostInUSDC = await convertCostToUSDC(
      totalCostWei,
      erc20Costs,
      productChainId,
      paymentNetworkId,
      adminAddress,
    );

    // 7. Generate payment requirements
    const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
    const paymentRequirements = createPaymentRequirements(
      totalCostInUSDC,
      paymentNetworkId, // Use payment network ID instead of product chain ID
      resource,
      adminAddress,
      product.previewData.title,
    );

    // 8. Return 402 response with payment requirements
    return res.status(402).json({
      x402Version,
      accepts: [paymentRequirements],
    });
  } catch (error: any) {
    console.error('Cost calculation error:', error);
    const errorResponse: ErrorResponse = {
      x402Version,
      error: error.message || 'Failed to calculate cost',
      errorCode: ErrorCodes.PAYMENT_VERIFICATION_FAILED,
      details: error,
    };
    return res.status(500).json(errorResponse);
  }
}

async function handleMintExecution(
  product: Product,
  req: Request,
  res: Response,
  quantity: number,
  recipientAddress: string | undefined,
  paymentNetworkId: number,
) {
  const paymentHeader = req.header('X-PAYMENT');
  if (!paymentHeader) {
    const errorResponse: ErrorResponse = {
      x402Version,
      error: 'X-PAYMENT header is required',
      errorCode: ErrorCodes.PAYMENT_VERIFICATION_FAILED,
    };
    return res.status(402).json(errorResponse);
  }

  try {
    // 1. Decode payment
    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(paymentHeader);
      decodedPayment.x402Version = x402Version;
    } catch (error) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: 'Invalid or malformed payment header',
        errorCode: ErrorCodes.PAYMENT_VERIFICATION_FAILED,
      };
      return res.status(402).json(errorResponse);
    }

    let mintToAddress = recipientAddress;
    if (!mintToAddress) {
      // If no recipient address is provided, use the from address from the authorization
      mintToAddress = (decodedPayment.payload as any).authorization.from;
    }
    if (!mintToAddress || !isAddress(mintToAddress)) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: 'Invalid recipient address',
        errorCode: ErrorCodes.INVALID_INPUT,
      };
      return res.status(400).json(errorResponse);
    }
    const productChainId = product.data.publicData.network;

    // Recreate payment requirements for verification
    const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
    const adminAddress = adminWalletAddress!;

    // 3. Prepare purchase with admin wallet paying but user receiving
    const preparedPurchase = await product.preparePurchase({
      userAddress: adminAddress,
      recipientAddress: mintToAddress,
      payload: { quantity },
      gasBuffer: { multiplier: 1.2 },
    });

    // Recalculate cost for verification
    const totalCostWei = preparedPurchase.cost.total.native.raw;
    const erc20Costs = preparedPurchase.cost.total.erc20s || [];
    const totalCostInUSDC = await convertCostToUSDC(
      totalCostWei,
      erc20Costs,
      productChainId,
      paymentNetworkId,
      adminAddress,
    );

    const paymentRequirements = createPaymentRequirements(
      totalCostInUSDC,
      paymentNetworkId, // Use payment network ID instead of product chain ID
      resource,
      adminAddress,
      product.previewData.title,
    );

    // 4. Verify payment
    const verification = await verify(facilitator, decodedPayment, paymentRequirements);
    if (!verification.isValid) {
      console.log('payment verification failed', JSON.stringify(verification, null, 2));
      const errorResponse: ErrorResponse = {
        x402Version,
        error: verification.invalidReason || 'Payment verification failed',
        errorCode: ErrorCodes.PAYMENT_VERIFICATION_FAILED,
      };
      return res.status(402).json(errorResponse);
    }

    // validate recipient address
    const payer = verification.payer ? verification.payer.toLowerCase() : undefined;
    if (!recipientAddress && payer && payer !== mintToAddress.toLowerCase()) {
      const errorResponse: ErrorResponse = {
        x402Version,
        error: 'Recipient address mismatch',
        errorCode: ErrorCodes.INVALID_INPUT,
      };
      return res.status(400).json(errorResponse);
    }

    try {
      // 5. Settle payment
      const settleResponse = await settle(facilitator, decodedPayment, paymentRequirements);
      const responseHeader = settleResponseHeader(settleResponse);
      res.setHeader('X-PAYMENT-RESPONSE', responseHeader);
    } catch (error: any) {
      return res.status(402).json({
        x402Version,
        error,
        accepts: paymentRequirements,
      });
    }

    /*
     * 6. Execute mint transaction
     * We perform the mint after settlement to ensure funds is deposited to the admin wallet before the mint is executed.
     * NOte: for production, we should have a way to handle the case where the settlement success and mint fails, we should either retry the mint or refund the payment.
     */
    const adminWalletClient = createAdminWalletClient(productChainId);
    const account = createAccountViem({ walletClient: adminWalletClient as any });

    const order = await product.purchase({
      account,
      preparedPurchase,
      confirmations: 1,
    });

    // 7. Return success response
    const mintResponse: MintResponse = {
      success: true,
      transactionHash: order.transactionReceipt.txHash,
      blockNumber: order.transactionReceipt.blockNumber,
      recipient: mintToAddress,
      product: {
        id: product.id.toString(),
        name: product.previewData.title || 'Manifold NFT',
        type: product.previewData.title || 'Edition',
      },
      tokens:
        order.order?.items?.map((item) => ({
          tokenId: item.token.tokenId,
          imageUrl: item.token.media.imagePreview,
          quantity: item.quantity,
          contractAddress: item.token.contract.contractAddress,
          explorerUrl: item.token.explorerUrl?.etherscanUrl,
        })) || [],
      totalCost: {
        usdc: totalCostInUSDC,
        formatted: `${formatUnits(BigInt(totalCostInUSDC), 6)} USDC`,
      },
    };

    return res.json(mintResponse);
  } catch (error: any) {
    console.error('Mint execution error:', error);
    if (error instanceof ClientSDKError) {
      console.log('client sdk error', JSON.stringify(error?.details, null, 2));
    }
    const errorResponse: ErrorResponse = {
      x402Version,
      error: error.message || 'Failed to execute mint',
      errorCode: ErrorCodes.MINT_FAILED,
      details: error,
    };
    return res.status(500).json(errorResponse);
  }
}
