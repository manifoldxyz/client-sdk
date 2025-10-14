'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MintButton } from '@/components/MintButton';

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ 
        fontSize: '2rem', 
        marginBottom: '2rem',
        fontWeight: 'bold',
      }}>
        Manifold SDK + RainbowKit
      </h1>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem',
        alignItems: 'center',
      }}>
        <ConnectButton />
        <MintButton />
      </div>
    </main>
  );
}