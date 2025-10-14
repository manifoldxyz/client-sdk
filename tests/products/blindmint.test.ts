import { describe, it, expect } from 'vitest';
import { BlindMintProduct, isBlindMintProduct } from '../../src/products/blindmint';
import { AppId, AppType } from '../../src/types/common';
import { ClientSDKError } from '../../src/types/errors';
import type { InstanceData } from '../../src/types/product';
import type { BlindMintPublicData } from '../../src/types/blindmint';

const baseInstanceData = {
  id: 4150231280,
  appId: AppId.BLIND_MINT_1155,
  publicData: {
    name: 'Mystery Mint',
    description: 'Mint a surprise NFT',
    network: 1,
    contract: {
      id: 123,
      name: 'Creator Contract',
      symbol: 'CRTR',
      contractAddress: '0x0000000000000000000000000000000000000002',
      networkId: 1,
      spec: 'ERC1155',
    },
    extensionAddress1155: {
      value: '0x0000000000000000000000000000000000000003',
      version: 1,
    },
    tierProbabilities: [
      {
        group: 'Legendary',
        indices: [0, 1],
        rate: 10,
      },
      {
        group: 'Common',
        indices: [2, 3],
        rate: 90,
      },
    ],
    pool: [
      {
        seriesIndex: 1,
        metadata: {
          name: 'Token 1',
          animation_preview: '',
        },
      },
    ],
    thumbnail: 'https://example.com/thumbnail.png',
  },
  creator: {
    id: 42,
    slug: 'creator',
    address: '0x0000000000000000000000000000000000000004',
    name: 'Creator Name',
  },
} as unknown as InstanceData<BlindMintPublicData>;

type PreviewData = {
  title: string;
  description: string;
  thumbnail: string;
};

const basePreviewData: PreviewData = {
  title: 'Preview Title',
  description: 'Preview Description',
  thumbnail: 'https://example.com/preview.png',
};

function createProduct(
  overrides: Partial<InstanceData<BlindMintPublicData>> = {},
  publicDataOverrides: Partial<BlindMintPublicData> = {},
  previewOverrides: Partial<PreviewData> = {},
) {
  const instanceData = JSON.parse(
    JSON.stringify(baseInstanceData),
  ) as InstanceData<BlindMintPublicData>;
  Object.assign(instanceData, overrides);
  instanceData.publicData = {
    ...instanceData.publicData,
    ...publicDataOverrides,
  };
  const previewData: PreviewData = {
    ...basePreviewData,
    ...previewOverrides,
  };
  return new BlindMintProduct(instanceData, previewData as unknown as any);
}

describe('BlindMintProduct', () => {
  it('throws when constructed with non blind-mint app id', () => {
    const invalidInstanceData = JSON.parse(
      JSON.stringify(baseInstanceData),
    ) as InstanceData<BlindMintPublicData>;
    invalidInstanceData.appId = AppId.EDITION;

    expect(
      () =>
        new BlindMintProduct(
          invalidInstanceData,
          basePreviewData as unknown as any,
        ),
    ).toThrow(ClientSDKError);
  });

  it('isBlindMintProduct identifies blind mint products', () => {
    expect(isBlindMintProduct({ type: AppType.BLIND_MINT } as any)).toBe(true);
    expect(isBlindMintProduct({ type: AppType.EDITION } as any)).toBe(false);
    expect(isBlindMintProduct(null as any)).toBe(false);
  });

  it('returns metadata from public data with preview fallback', async () => {
    const product = createProduct();
    await expect(product.getMetadata()).resolves.toEqual({
      name: 'Mystery Mint',
      description: 'Mint a surprise NFT',
    });

    const withoutDescription = createProduct(
      {},
      { description: undefined },
      { description: 'Fallback Description' },
    );

    const metadata = await withoutDescription.getMetadata();
    expect(metadata.description).toBe('Fallback Description');
  });

  it('returns preview media derived from preview data', async () => {
    const product = createProduct();
    await expect(product.getPreviewMedia()).resolves.toEqual({
      image: basePreviewData.thumbnail,
      imagePreview: basePreviewData.thumbnail,
    });
  });

  it('returns provenance information from instance data', async () => {
    const product = createProduct();
    await expect(product.getProvenance()).resolves.toEqual({
      creator: {
        id: baseInstanceData.creator.id.toString(),
        slug: baseInstanceData.creator.slug,
        address: baseInstanceData.creator.address,
        name: baseInstanceData.creator.name,
      },
      contract: {
        id: baseInstanceData.publicData.contract.id,
        networkId: baseInstanceData.publicData.contract.networkId,
        contractAddress: baseInstanceData.publicData.contract.contractAddress,
        name: baseInstanceData.publicData.contract.name,
        symbol: baseInstanceData.publicData.contract.symbol,
        spec: baseInstanceData.publicData.contract.spec,
      },
      networkId: baseInstanceData.publicData.network,
    });
  });

  it('maps tier probabilities to gacha tiers', async () => {
    const product = createProduct();
    const tiers = await product.getTierProbabilities();

    expect(tiers).toEqual([
      {
        id: 'Legendary',
        name: 'Legendary',
        probability: 10,
        tokenIds: [0, 1],
        metadata: {},
      },
      {
        id: 'Common',
        name: 'Common',
        probability: 90,
        tokenIds: [2, 3],
        metadata: {},
      },
    ]);

    const withoutTiers = createProduct({}, { tierProbabilities: [] });
    await expect(withoutTiers.getTierProbabilities()).resolves.toEqual([]);
  });
});
