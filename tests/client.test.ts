import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorCode } from '../src/types/errors';

// Move mocks before any imports that use them
vi.mock('../src/utils', () => {
  const createProviderMock = vi.fn();
  return {
    createProvider: createProviderMock,
  };
});

vi.mock('../src/api/manifold-api', () => {
  const getCompleteInstanceDataMock = vi.fn();
  return {
    default: {
      getCompleteInstanceData: getCompleteInstanceDataMock,
    },
  };
});

vi.mock('../src/products/blindmint', () => {
  const BlindMintProductMock = vi.fn().mockImplementation(function (
    instanceData: unknown,
    previewData: unknown,
    options: unknown,
  ) {
    // @ts-ignore
    this.instanceData = instanceData;
    // @ts-ignore
    this.previewData = previewData;
    // @ts-ignore
    this.options = options;
    // @ts-ignore
    this.type = 'blind-mint';
  });
  
  return {
    BlindMintProduct: BlindMintProductMock,
    isBlindMintProduct: (product: { type?: string } | null) => product?.type === 'blind-mint',
  };
});

import { createClient } from '../src/client';

// Get references to mocked functions
const { createProvider: createProviderMock } = await import('../src/utils');
const manifoldApiClient = (await import('../src/api/manifold-api')).default as any;
const { BlindMintProduct: BlindMintProductMock } = await import('../src/products/blindmint');
const getCompleteInstanceDataMock = manifoldApiClient.getCompleteInstanceData;

describe('createClient', () => {
  beforeEach(() => {
    createProviderMock.mockReset();
    getCompleteInstanceDataMock.mockReset();
    BlindMintProductMock.mockClear();
  });

  it('returns empty providers when no RPCs supplied', () => {
    const client = createClient();
    expect(client.providers).toEqual({});
    expect(createProviderMock).not.toHaveBeenCalled();
  });

  it('creates providers for supplied httpRPCs', () => {
    const providers = [{ mock: 1 }, { mock: 2 }];
    createProviderMock
      .mockImplementationOnce(() => providers[0])
      .mockImplementationOnce(() => providers[1]);

    const client = createClient({
      httpRPCs: {
        1: 'https://mainnet.rpc',
        10: 'https://optimism.rpc',
      },
    });

    expect(createProviderMock).toHaveBeenCalledTimes(2);
    expect(createProviderMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ networkId: 1, useBridge: false }),
    );
    expect(createProviderMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ networkId: 10, useBridge: false }),
    );
    expect(client.providers[1]).toBe(providers[0]);
    expect(client.providers[10]).toBe(providers[1]);
  });

  it('rejects malformed instance ids', async () => {
    const client = createClient();

    await expect(client.getProduct('not-a-valid-id')).rejects.toMatchObject({
      code: ErrorCode.INVALID_INPUT,
    });
  });

  it('parses product URLs and throws on unsupported product types', async () => {
    getCompleteInstanceDataMock.mockResolvedValueOnce({
      instanceData: {
        appId: 12345,
      },
      previewData: {},
    });

    const client = createClient();
    await expect(client.getProduct('https://manifold.xyz/@creator/id/12345')).rejects.toMatchObject(
      {
        code: ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
      },
    );
    expect(getCompleteInstanceDataMock).toHaveBeenCalledWith('12345', {
      maxMediaWidth: 1024,
    });
  });

  it('creates blind mint products when instance data matches', async () => {
    const instanceData = {
      id: 2526777015,
      appId: 2526777015,
      publicData: { network: 1 },
    };
    const previewData = { title: 'Preview' };

    getCompleteInstanceDataMock.mockResolvedValueOnce({
      instanceData,
      previewData,
    });

    const client = createClient({ httpRPCs: { 1: 'https://mainnet.rpc' } });
    const product = await client.getProduct('https://manifold.xyz/@creator/id/2526777015');

    expect(BlindMintProductMock).toHaveBeenCalledWith(instanceData, previewData, {
      httpRPCs: { 1: 'https://mainnet.rpc' },
    });
    expect(getCompleteInstanceDataMock).toHaveBeenCalledWith('2526777015', {
      maxMediaWidth: 1024,
    });
    expect(product).toHaveProperty('type', 'blind-mint');
  });

  it('creates edition products when instance data matches', async () => {
    const instanceData = {
      id: 2522713783,
      appId: 2522713783, // AppId.EDITION
      publicData: { 
        title: 'Test Edition',
        network: 1,
        contract: { id: 1, name: 'Test', symbol: 'TEST', contractAddress: '0x123', networkId: 1, spec: 'erc721' },
        extensionAddress: '0x456',
        asset: { name: 'Test Asset', animation_preview: '' }
      },
      creator: { id: 1, name: 'Test Creator' }
    };
    const previewData = { title: 'Edition Preview' };

    getCompleteInstanceDataMock.mockResolvedValueOnce({
      instanceData,
      previewData,
    });

    const client = createClient();
    const product = await client.getProduct('https://manifold.xyz/@creator/id/2522713783');

    expect(product).toHaveProperty('type', 'edition');
    expect(product).toHaveProperty('id', 2522713783);
    expect(getCompleteInstanceDataMock).toHaveBeenCalledWith('2522713783', {
      maxMediaWidth: 1024,
    });
  });

  it('validates workspace limit bounds', async () => {
    const client = createClient();

    await expect(
      client.getProductsByWorkspace('workspace-id', { limit: 200 }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_INPUT,
    });
  });

  it('marks workspace fetch as not implemented', async () => {
    const client = createClient();

    await expect(client.getProductsByWorkspace('workspace-id')).rejects.toMatchObject({
      code: ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
    });
  });
});
