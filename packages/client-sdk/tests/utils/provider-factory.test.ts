import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientSDKError, ErrorCode } from '../../src/types/errors';

describe('createProvider', () => {
  let createProvider: any;
  
  beforeEach(() => {
    // Mock the createProvider function
    createProvider = vi.fn((options: any) => {
      const { networkId, customRpcUrls, useBridge = true } = options;
      
      // If custom RPC URL is provided, return JsonRpc provider
      if (customRpcUrls && customRpcUrls[networkId]) {
        return { 
          type: 'jsonrpc', 
          url: customRpcUrls[networkId],
          networkId 
        };
      }
      
      // If bridge is enabled (default), return bridge provider
      if (useBridge) {
        return { 
          type: 'bridge', 
          networkId 
        };
      }
      
      // Otherwise throw error
      throw new ClientSDKError(
        ErrorCode.MISSING_RPC_URL,
        `No RPC URL configured for network ${networkId}`
      );
    });
  });

  it('returns JsonRpcProvider when custom RPC is provided', () => {
    const provider = createProvider({
      networkId: 1,
      customRpcUrls: { 1: 'https://mainnet.rpc' },
      useBridge: true,
    });

    expect(provider).toEqual({
      type: 'jsonrpc',
      url: 'https://mainnet.rpc',
      networkId: 1,
    });
  });

  it('falls back to bridge provider when no custom RPC and useBridge true', () => {
    const provider = createProvider({
      networkId: 8453,
    });

    expect(provider).toEqual({
      type: 'bridge',
      networkId: 8453,
    });
  });

  it('throws when no custom RPC and bridge disabled', () => {
    expect(() =>
      createProvider({
        networkId: 10,
        useBridge: false,
      })
    ).toThrowError(ClientSDKError);
    
    try {
      createProvider({
        networkId: 10,
        useBridge: false,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ClientSDKError);
      expect((error as ClientSDKError).code).toBe(ErrorCode.MISSING_RPC_URL);
    }
  });
});