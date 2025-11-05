'use client';

import { useEffect, useState } from 'react';
import { createClient, isEditionProduct } from '@manifoldxyz/client-sdk';
import type {  ProductInventory, ProductRule, ProductStatus } from '@manifoldxyz/client-sdk';
import { getPublicProvider } from '@/utils/common';

interface ProductDisplayProps {
  instanceId: string;
}

interface ProductInfo {
  // Basic info
  title: string;
  description?: string;
  status?: ProductStatus;
  
  // Media
  imageUrl?: string;
  animationUrl?: string;
  
  // On-chain data
  price?: string;
  platformFee?: string;
  totalSupply?: number | null;
  totalMinted?: number;
  remainingSupply?: number | null;
  walletMax?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  
  // Inventory
  inventory?: ProductInventory;
  
  // Rules
  rules?: ProductRule;
}

export function ProductDisplay({ instanceId }: ProductDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    fetchProductInfo();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [instanceId]);

  const updateTimeLeft = () => {
    if (!productInfo?.startDate || !productInfo?.endDate) return;
    
    const now = new Date().getTime();
    const start = productInfo.startDate.getTime();
    const end = productInfo.endDate.getTime();
    
    if (now < start) {
      const diff = start - now;
      setTimeLeft(`Starts in ${formatTimeDiff(diff)}`);
    } else if (now < end) {
      const diff = end - now;
      setTimeLeft(`Ends in ${formatTimeDiff(diff)}`);
    } else {
      setTimeLeft('Sale ended');
    }
  };

  const formatTimeDiff = (diff: number): string => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const fetchProductInfo = async () => {
    try {
      setLoading(true);
      setError('');

      // Create Manifold SDK client
      const client = createClient({ publicProvider: getPublicProvider() });
      
      // Get product details
      const product = await client.getProduct(instanceId);
      
      if (!isEditionProduct(product)) {
        throw new Error('Product is not an Edition type');
      }

      // Fetch all product data
      const [status, onchainData, inventory, rules, metadata] = await Promise.all([
        product.getStatus(),
        product.fetchOnchainData(),
        product.getInventory(),
        product.getRules(),
        product.getMetadata(),
      ]);

      // Extract image URLs from asset
      const asset = product.data.publicData?.asset;
      const imageUrl = asset?.image || asset?.image_url || asset?.image_preview;
      const animationUrl = asset?.animation || asset?.animation_preview;

      // Calculate remaining supply
      let remainingSupply: number | null = null;
      if (onchainData.totalMax !== null && onchainData.total !== null) {
        remainingSupply = onchainData.totalMax - onchainData.total;
      }

      setProductInfo({
        title: metadata.name || product.data.publicData?.title || 'Untitled',
        description: metadata.description || product.data.publicData?.description,
        status,
        imageUrl,
        animationUrl,
        price: onchainData.cost?.formatted,
        platformFee: onchainData.platformFee?.formatted,
        totalSupply: onchainData.totalMax,
        totalMinted: onchainData.total,
        remainingSupply,
        walletMax: onchainData.walletMax,
        startDate: onchainData.startDate,
        endDate: onchainData.endDate,
        inventory,
        rules,
      });

    } catch (err: any) {
      console.error('Error fetching product info:', err.details);
      setError(err.message || 'Failed to load product information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#64748b' }}>Loading product information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#ef4444' }}>Error: {error}</p>
      </div>
    );
  }

  if (!productInfo) {
    return null;
  }

  const getStatusColor = (status?: ProductStatus) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'sold-out': return '#6b7280';
      case 'ended': return '#6b7280';
      case 'upcoming': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status?: ProductStatus) => {
    switch (status) {
      case 'active': return 'Live';
      case 'paused': return 'Paused';
      case 'sold-out': return 'Sold Out';
      case 'ended': return 'Ended';
      case 'upcoming': return 'Upcoming';
      default: return 'Unknown';
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem',
    }}>
      {/* Left Column - Product Image */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {productInfo.imageUrl && (
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '100%',
            backgroundColor: '#f1f5f9',
            borderRadius: '1rem',
            overflow: 'hidden',
          }}>
            <img
              src={productInfo.imageUrl}
              alt={productInfo.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}
        
        {productInfo.animationUrl && (
          <div style={{
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: '#64748b',
          }}>
            ✨ This NFT includes animation
          </div>
        )}
      </div>

      {/* Right Column - Product Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Title and Status */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '0.5rem',
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              margin: 0,
            }}>
              {productInfo.title}
            </h2>
            <span style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: getStatusColor(productInfo.status),
              color: 'white',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
            }}>
              {getStatusText(productInfo.status)}
            </span>
          </div>
          
          {productInfo.description && (
            <p style={{
              color: '#64748b',
              marginTop: '0.5rem',
              lineHeight: '1.5',
            }}>
              {productInfo.description}
            </p>
          )}
        </div>

        {/* Price Information */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.75rem',
        }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#64748b',
            marginBottom: '0.5rem',
          }}>
            PRICE
          </h3>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#0f172a',
          }}>
            {productInfo.price || 'Free'}
          </div>
          {productInfo.platformFee && (
            <div style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '0.25rem',
            }}>
              + {productInfo.platformFee} platform fee
            </div>
          )}
        </div>

        {/* Supply Information */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '0.5rem',
            }}>
              SUPPLY
            </h4>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#0f172a',
            }}>
              {productInfo.totalSupply === null ? 'Unlimited' : productInfo.totalSupply?.toLocaleString() || '0'}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.75rem',
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '0.5rem',
            }}>
              MINTED
            </h4>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#0f172a',
            }}>
              {productInfo.totalMinted?.toLocaleString() || '0'}
            </div>
          </div>
        </div>

        {/* Progress Bar for Limited Supply */}
        {productInfo.totalSupply !== null && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
            }}>
              <span style={{ color: '#64748b' }}>
                {productInfo.remainingSupply?.toLocaleString() || '0'} remaining
              </span>
              <span style={{ color: '#64748b' }}>
                {Math.round((productInfo.totalMinted || 0) / (productInfo.totalSupply || 1) * 100)}% sold
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min((productInfo.totalMinted || 0) / (productInfo.totalSupply || 1) * 100, 100)}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Time Information */}
        {(productInfo.startDate || productInfo.endDate) && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.75rem',
            border: '1px solid #fde68a',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#92400e',
              fontWeight: '600',
            }}>
              ⏰ {timeLeft}
            </div>
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#78350f',
            }}>
              {productInfo.startDate && (
                <div>Start: {productInfo.startDate.toLocaleString()}</div>
              )}
              {productInfo.endDate && (
                <div>End: {productInfo.endDate.toLocaleString()}</div>
              )}
            </div>
          </div>
        )}

        {/* Wallet Limit */}
        {productInfo.walletMax !== null && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            borderRadius: '0.5rem',
            border: '1px solid #dbeafe',
            fontSize: '0.875rem',
            color: '#1e40af',
          }}>
            ℹ️ Maximum {productInfo.walletMax} per wallet
          </div>
        )}
      </div>
    </div>
  );
}