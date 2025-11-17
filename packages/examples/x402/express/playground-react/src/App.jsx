import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useWalletClient, useChainId } from 'wagmi';
import { withPaymentInterceptor } from 'x402-axios';
import axios from 'axios';
import { formatUnits } from 'viem';
import { baseSepolia, base } from 'wagmi/chains';

const App = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  
  const [formData, setFormData] = useState({
    instanceId: import.meta.env.VITE_INSTANCE_ID || '4113236208',
    quantity: 1,
    serverUrl: import.meta.env.VITE_SERVER_URL || 'http://localhost:4022'
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get the network name based on chain ID
  const getNetworkName = () => {
    if (chainId === base.id) return 'base';
    if (chainId === baseSepolia.id) return 'base-sepolia';
    return 'unknown';
  };

  // Get USDC address for current chain
  const getUsdcAddress = () => {
    if (chainId === base.id) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    if (chainId === baseSepolia.id) return '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    return null;
  };

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address: address,
    token: getUsdcAddress(),
    enabled: isConnected && !!getUsdcAddress(),
  });

  // Clear status when wallet changes
  useEffect(() => {
    if (address) {
      setStatus(null);
    }
  }, [address]);

  // Purchase NFT with x402 payment
  const purchaseNFT = async () => {
    if (!isConnected || !walletClient) {
      setStatus({ type: 'error', message: 'Please connect your wallet first' });
      return;
    }

    const network = getNetworkName();
    if (network === 'unknown') {
      setStatus({ 
        type: 'error', 
        message: 'Please switch to Base or Base Sepolia network' 
      });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: 'loading', message: 'Initiating NFT purchase...' });

      // Create x402-axios instance with payment interceptor using wagmi wallet client
      const api = withPaymentInterceptor(
        axios.create({
          baseURL: formData.serverUrl,
        }),
        walletClient
      );

      // Construct the endpoint URL
      const endpoint = `/manifold/${network}/id/${formData.instanceId}/purchase`;
      const fullUrl = `${endpoint}`;

      console.log('Making request to:', formData.serverUrl + fullUrl);

      // Make the request - x402-axios will handle the payment automatically
      const response = await api.get(fullUrl);

      // Check for payment response header
      const paymentResponseHeader = response.headers['x-payment-response'];
      
      // Parse the response
      const data = response.data;

      if (data.success) {
        setStatus({
          type: 'success',
          message: 'NFT Purchased Successfully!',
          data: {
            transactionHash: data.transactionHash,
            recipient: data.recipient,
            tokens: data.tokens,
            totalCost: data.totalCost,
            paymentResponse: paymentResponseHeader
          }
        });
      } else {
        setStatus({
          type: 'error',
          message: 'Purchase failed',
          data: data
        });
      }

    } catch (error) {
      console.error('Purchase error:', error);
      
      // Handle 402 errors specifically
      if (error.response?.status === 402) {
        const accepts = error.response.data.accepts;
        if (accepts && accepts.length > 0) {
          const requirement = accepts[0];
          setStatus({
            type: 'error',
            message: 'Payment Required',
            data: {
              network: requirement.network,
              amount: `${formatUnits(BigInt(requirement.maxAmountRequired), 6)} USDC`,
              payTo: requirement.payTo,
              description: requirement.description,
              error: error.response.data.error
            }
          });
        } else {
          setStatus({
            type: 'error',
            message: `Payment error: ${error.response.data.error || 'Unknown error'}`
          });
        }
      } else {
        setStatus({
          type: 'error',
          message: `Error: ${error.message}`,
          data: error.response?.data
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Update form data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) : value
    }));
  };

  return (
    <div className="container">
      <h1>🎨 X402 Manifold NFT Playground</h1>
      
      <div className="wallet-section">
        <ConnectButton />
        
        {isConnected && address && (
          <div className="wallet-info" style={{ marginTop: '1rem' }}>
            <div className="balance">
              Network: {chainId === base.id ? 'Base' : chainId === baseSepolia.id ? 'Base Sepolia' : 'Unknown'}
            </div>
            {usdcBalance && (
              <div className="balance">
                USDC Balance: {formatUnits(usdcBalance.value, usdcBalance.decimals)} USDC
              </div>
            )}
          </div>
        )}
      </div>

      {isConnected && (
        <>
          <div className="form-group">
            <label htmlFor="serverUrl">Server URL</label>
            <input
              type="text"
              id="serverUrl"
              name="serverUrl"
              value={formData.serverUrl}
              onChange={handleInputChange}
              placeholder="http://localhost:4022"
            />
          </div>

          <div className="form-group">
            <label htmlFor="network">Current Network</label>
            <input
              type="text"
              id="network"
              value={getNetworkName()}
              disabled
              style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#6c757d', fontSize: '0.8rem', display: 'block', marginTop: '0.5rem' }}>
              Use the wallet to switch networks
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="instanceId">Manifold Instance ID</label>
            <input
              type="text"
              id="instanceId"
              name="instanceId"
              value={formData.instanceId}
              onChange={handleInputChange}
              placeholder="Enter Manifold Instance ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              min="1"
              max="10"
            />
          </div>

          <button 
            className="btn" 
            onClick={purchaseNFT}
            disabled={loading || !walletClient || getNetworkName() === 'unknown'}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span> Processing...
              </>
            ) : (
              'Purchase NFT'
            )}
          </button>

          {(!walletClient || getNetworkName() === 'unknown') && (
            <small style={{ 
              color: '#dc3545', 
              fontSize: '0.8rem', 
              display: 'block', 
              marginTop: '0.5rem',
              textAlign: 'center'
            }}>
              {getNetworkName() === 'unknown' 
                ? '⚠️ Please switch to Base or Base Sepolia network'
                : '⚠️ Wallet client not available'}
            </small>
          )}
        </>
      )}

      {status && (
        <div className={`status ${status.type}`}>
          <h3>{status.message}</h3>
          {status.data && (
            <div className="transaction-details">
              {status.type === 'success' && status.data.transactionHash && (
                <>
                  <h4>Transaction Details</h4>
                  <div className="detail-item">
                    <span className="detail-label">Transaction Hash:</span>
                    <span className="detail-value">
                      {status.data.transactionHash.slice(0, 10)}...{status.data.transactionHash.slice(-8)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Recipient:</span>
                    <span className="detail-value">
                      {status.data.recipient.slice(0, 10)}...{status.data.recipient.slice(-8)}
                    </span>
                  </div>
                  {status.data.totalCost && (
                    <div className="detail-item">
                      <span className="detail-label">Total Cost:</span>
                      <span className="detail-value">{status.data.totalCost.formatted}</span>
                    </div>
                  )}
                  {status.data.tokens && status.data.tokens.length > 0 && (
                    <>
                      <h4 style={{ marginTop: '1rem' }}>Minted Tokens</h4>
                      {status.data.tokens.map((token, index) => (
                        <div key={index}>
                          <div className="detail-item">
                            <span className="detail-label">Token ID:</span>
                            <span className="detail-value">{token.tokenId}</span>
                          </div>
                          {token.contractAddress && (
                            <div className="detail-item">
                              <span className="detail-label">Contract:</span>
                              <span className="detail-value">
                                {token.contractAddress.slice(0, 10)}...{token.contractAddress.slice(-8)}
                              </span>
                            </div>
                          )}
                          {token.explorerUrl && (
                            <div className="detail-item">
                              <span className="detail-label">View on Explorer:</span>
                              <a href={token.explorerUrl} target="_blank" rel="noopener noreferrer">
                                View NFT
                              </a>
                            </div>
                          )}
                          {token.imageUrl && (
                            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                              <img 
                                src={token.imageUrl} 
                                alt={`Token ${token.tokenId}`}
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '200px',
                                  borderRadius: '8px'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
              {status.type === 'error' && status.data && (
                <>
                  {status.data.network && (
                    <div className="detail-item">
                      <span className="detail-label">Network:</span>
                      <span className="detail-value">{status.data.network}</span>
                    </div>
                  )}
                  {status.data.amount && (
                    <div className="detail-item">
                      <span className="detail-label">Required Amount:</span>
                      <span className="detail-value">{status.data.amount}</span>
                    </div>
                  )}
                  {status.data.payTo && (
                    <div className="detail-item">
                      <span className="detail-label">Pay To:</span>
                      <span className="detail-value">
                        {status.data.payTo.slice(0, 10)}...{status.data.payTo.slice(-8)}
                      </span>
                    </div>
                  )}
                  {status.data.error && (
                    <div className="detail-item">
                      <span className="detail-label">Error:</span>
                      <span className="detail-value">{status.data.error}</span>
                    </div>
                  )}
                  {status.data.errorCode && (
                    <div className="detail-item">
                      <span className="detail-label">Error Code:</span>
                      <span className="detail-value">{status.data.errorCode}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;