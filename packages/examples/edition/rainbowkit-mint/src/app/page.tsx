'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MintButton } from '@/components/MintButton';
import { ProductDisplay } from '@/components/ProductDisplay';

// Example Edition product instance ID - replace with your own
const INSTANCE_ID = process.env.NEXT_PUBLIC_INSTANCE_ID || '4133757168';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3rem',
          padding: '0 2rem',
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold',
            margin: 0,
          }}>
            Manifold SDK + RainbowKit
          </h1>
          <ConnectButton />
        </div>

        {/* Product Display Section */}
        <ProductDisplay instanceId={INSTANCE_ID} />

        {/* Mint Button Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '3rem',
          paddingBottom: '2rem',
        }}>
          <MintButton instanceId={INSTANCE_ID} />
        </div>
      </div>
    </main>
  );
}