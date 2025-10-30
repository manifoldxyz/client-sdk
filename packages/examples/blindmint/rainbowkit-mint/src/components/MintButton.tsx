'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { createClient, createAccountViem } from '@manifoldxyz/client-sdk';

const INSTANCE_ID = process.env.NEXT_PUBLIC_INSTANCE_ID || '4149776624';

export function MintButton() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleMint = async () => {
    if (!walletClient || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setStatus('Initializing...');
    setError('');

    try {
      // Create Manifold SDK client
      const client = createClient();
      const viemClient = walletClient;
      // Create viem adapter from wallet client
      const account = createAccountViem({
        walletClient: viemClient!,
      })

      // Get product details
      setStatus('Fetching product details...');
      const product = await client.getProduct(INSTANCE_ID);
      
      // Check product status
      const productStatus = await product.getStatus();
      if (productStatus !== 'active') {
        throw new Error(`Product is ${productStatus}`);
      }

      // Prepare purchase (simulate transaction)
      setStatus('Preparing purchase...');
      const preparedPurchase = await product.preparePurchase({
        userAddress: address,
        payload: {
          quantity: 1,
        },
        account,
      });

      // Display cost
      const nativeCost = preparedPurchase.cost.total.native;
      const erc20Costs = preparedPurchase.cost.total.erc20s;
      const costParts: string[] = [];
      if (nativeCost.isPositive()) {
        costParts.push(`${nativeCost.formatted} ${nativeCost.symbol}`);
      }
      erc20Costs.forEach((cost) => {
        costParts.push(`${cost.formatted} ${cost.symbol}`);
      });
      const costMessage = costParts.length > 0 ? costParts.join(' + ') : '0';
      setStatus(`Total cost: ${costMessage}. Confirm in wallet...`);

      // Execute purchase
      const receipt = await product.purchase({
        account,
        preparedPurchase,
      });

      // Success!
      const { txHash } = receipt.transactionReceipt;
      const mintedSummary =
        receipt.order?.items
          .map((item) => `${item.quantity}x token ${item.token.tokenId}`)
          .join(', ') || '';

      setStatus(
        `✅ Mint successful! TX: ${txHash.slice(0, 10)}...${
          mintedSummary ? ` (${mintedSummary})` : ''
        }`,
      );
      
    } catch (err: any) {
      console.error('Mint error:', err.details);
      setError(err.message || 'Failed to mint');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <button
        onClick={handleMint}
        disabled={loading}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: '600',
          backgroundColor: loading ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }
        }}
      >
        {loading ? 'Processing...' : `Mint NFT (Instance: ${INSTANCE_ID})`}
      </button>
      
      {status && (
        <p style={{ 
          color: '#64748b',
          fontSize: '0.875rem',
          textAlign: 'center',
        }}>
          {status}
        </p>
      )}
      
      {error && (
        <p style={{ 
          color: '#ef4444',
          fontSize: '0.875rem',
          textAlign: 'center',
        }}>
          ❌ {error}
        </p>
      )}
    </div>
  );
}
