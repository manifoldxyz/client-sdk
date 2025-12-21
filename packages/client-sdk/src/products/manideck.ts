import type {
  AllocationParams,
  AllocationResponse,
  ProductMetadata,
  ProductRule,
  ProductProvenance,
  Media,
  InstanceData,
  AudienceRestriction,
  ManiDeckPublicData,
  ManiDeckOnchainData,
  ManiDeckStatus,
  ManiDeckInventory,
  ManiDeckTokenVariation,
  ManiDeckTier,
  ManiDeckClaimableToken,
  ManiDeckTierProbability,
  ManiDeckProduct as IManiDeckProduct,
  Contract,
  ManiDeckPublicDataResponse,
  IPublicProvider,
  PurchaseParams,
  Receipt,
  PreparePurchaseParams,
  BlindMintPayload,
  PreparedPurchase,
} from '../types';
import type { Address } from '../types/common';
import { AppType, AppId } from '../types/common';
import type { Network } from '@manifoldxyz/js-ts-utils';
import { Currency } from '@manifoldxyz/js-ts-utils';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client-public';
import { Money } from '../libs/money';
import { convertManifoldContractToContract } from '../utils/common';
import { ethers } from 'ethers';
import { GachaponPublicClient } from '@manifoldxyz/gachapon-client-public';
/**
 * ManiDeck product implementation for mystery/gacha-style NFT mints.
 *
 * ManiDeck products allow creators to offer randomized NFTs with different
 * rarity tiers and probabilities. Buyers receive a random NFT from the pool
 * when they mint, with the actual reveal happening either immediately or
 * at a specified time.
 *
 * @remarks
 * - Follows technical spec CON-2729
 * - Uses gachapon-widgets pattern for getClaim parsing
 * - Supports tier-based probability systems
 * - Handles both immediate and delayed reveals
 *
 * @public
 */
export class ManiDeckProduct implements IManiDeckProduct {
  /**
   * Unique instance ID for this product.
   */
  readonly id: number;

  /**
   * Product type identifier (always MANI_DECK)
   */
  readonly type = AppType.MANI_DECK;

  /**
   * Off-chain product data including metadata and configuration.
   */
  readonly data: InstanceData<ManiDeckPublicData>;

  /**
   * Preview data for display purposes.
   */
  readonly previewData: InstancePreview;

  /**
   * On-chain data (pricing, supply, etc.). Populated after calling fetchOnchainData().
   */
  onchainData?: ManiDeckOnchainData;

  /**
   * Creates a new ManiDeckProduct instance.
   *
   * @param instanceData - Product instance data from the API
   * @param previewData - Preview data for the product
   * @param publicProvider - Public provider for blockchain interactions
   *
   * @throws {ClientSDKError} If the app ID doesn't match MANI_DECK
   *
   * @internal
   */
  constructor(
    instanceData: PublicInstance<ManiDeckPublicDataResponse>,
    previewData: InstancePreview,
    _: IPublicProvider,
  ) {
    // Validate app ID
    if (instanceData.appId !== (AppId.MANI_DECK as number)) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Invalid app ID for ManiDeck. Expected ${AppId.MANI_DECK}, received ${instanceData.appId}`,
        { instanceId: String(instanceData.id) },
      );
    }

    // Store instance data with properly typed publicData
    this.data = {
      ...instanceData,
      publicData: {
        ...instanceData.publicData,
        contract: convertManifoldContractToContract(
          instanceData.publicData.contract,
          instanceData.creator.slug || '',
        ),
      },
    };
    this.previewData = previewData;
    this.id = instanceData.id;
  }

  // =============================================================================
  // ONCHAIN DATA FETCHING
  // =============================================================================

  /**
   * Fetches and caches on-chain data for the ManiDeck product.
   *
   * Retrieves information including:
   * - Total supply and minted count
   * - Pricing information
   * - Start and end dates
   * - Token variations and probabilities
   *
   * Note: Cost, startDate, and endDate are retrieved from publicData.
   * Only totalMinted and tokenVariations are fetched on-chain.
   *
   * @param force - Force refresh even if data is already cached (default: false)
   * @returns Promise resolving to on-chain data
   *
   * @throws {ClientSDKError} If fetching on-chain data fails
   *
   * @example
   * ```typescript
   * const onchainData = await product.fetchOnchainData();
   * console.log(`Total supply: ${onchainData.totalSupply}`);
   * console.log(`Price: ${onchainData.cost.formatted}`);
   * ```
   *
   * @public
   */
  async fetchOnchainData(force = false): Promise<ManiDeckOnchainData> {
    if (this.onchainData && !force) {
      return this.onchainData;
    }
    const publicData = this.data.publicData;
    const networkId = publicData.network;

    try {
      // Fetch on-chain data for totalMinted and tokenVariations
      const currency = publicData.price?.currency
        ? Currency.getSupportedCurrencyInfo(publicData.price.currency)
        : undefined;
      // Get cost from publicData.price
      let costMoney: Money;
      if (publicData.price) {
        costMoney = await Money.create({
          value: BigInt(publicData.price.value),
          networkId,
          address:
            publicData.price.erc20 ||
            currency?.erc20[networkId as unknown as Network.NetworkId].address ||
            ethers.constants.AddressZero,
          fetchUSD: true,
        });
      } else {
        costMoney = await Money.zero({ networkId });
      }

      // fetch gachapon-server for total minted
      const gachaClient = new GachaponPublicClient({
        baseUrl: 'https://gacha.api.manifoldxyz.dev',
      });
      const data = await gachaClient.getInstanceStatus(this.id.toString());
      // Build on-chain data using publicData for cost, startDate, endDate
      // Note: totalSupply, startDate, endDate come from publicData; totalMinted from on-chain
      const onchainData: ManiDeckOnchainData = {
        totalSupply: publicData.totalSupply || 0,
        totalMinted: data.totalMinted,
        startDate: publicData.startDate ? new Date(publicData.startDate) : undefined,
        endDate: publicData.endDate ? new Date(publicData.endDate) : undefined,
        audienceType: 'None',
        cost: costMoney,
        tokenVariations: publicData.pool.length,
      };

      // Cache the result
      this.onchainData = onchainData;
      return onchainData;
    } catch (error) {
      throw new ClientSDKError(ErrorCode.API_ERROR, 'Failed to fetch onchain data', {
        error,
      });
    }
  }

  /**
   * Prepares a purchase transaction for the ManiDeck product.
   *
   * @throws {ClientSDKError} This method is not yet supported for ManiDeck products
   *
   * @public
   */
  async preparePurchase(
    _params: PreparePurchaseParams<BlindMintPayload>,
  ): Promise<PreparedPurchase> {
    throw new ClientSDKError(
      ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
      'preparePurchase is not yet supported for ManiDeck products',
      { instanceId: String(this.id) },
    );
  }

  /**
   * Executes a purchase for the ManiDeck product.
   *
   * @throws {ClientSDKError} This method is not yet supported for ManiDeck products
   *
   * @public
   */
  async purchase(_params: PurchaseParams): Promise<Receipt> {
    throw new ClientSDKError(
      ErrorCode.UNSUPPORTED_PRODUCT_TYPE,
      'purchase is not yet supported for ManiDeck products',
      { instanceId: String(this.id) },
    );
  }

  private _getContractInfo(): Contract {
    const contractData = this.data.publicData.contract;
    const explorer = (contractData as unknown as { explorer?: Contract['explorer'] }).explorer || {
      etherscanUrl: '',
    };
    const spec = contractData.spec as string | undefined;
    const normalizedSpec = spec?.toLowerCase() === 'erc721' ? 'erc721' : 'erc1155';

    return {
      name: contractData.name,
      symbol: contractData.symbol,
      contractAddress: contractData.contractAddress,
      networkId: contractData.networkId,
      spec: normalizedSpec as Contract['spec'],
      explorer,
    };
  }

  // =============================================================================
  // PRODUCT INTERFACE IMPLEMENTATION
  // =============================================================================

  async getStatus(): Promise<ManiDeckStatus> {
    const onchainData = await this.fetchOnchainData();
    const now = Date.now();
    if (onchainData.startDate && now < onchainData.startDate.getTime()) {
      return 'upcoming';
    }
    if (onchainData.endDate && now > onchainData.endDate.getTime()) {
      return 'ended';
    }
    // if (onchainData.totalSupply && onchainData.totalMinted >= onchainData.totalSupply) {
    //   return 'sold-out';
    // }
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    const { recipientAddress } = params;
    if (!validateAddress(recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address', {
        walletAddress: recipientAddress,
      });
    }

    const onchainData = await this.fetchOnchainData();

    // Calculate available quantity
    let quantity = Number.MAX_SAFE_INTEGER;
    if (onchainData.totalSupply) {
      const remaining = onchainData.totalSupply - onchainData.totalMinted;
      quantity = Math.min(quantity, remaining);
    }

    return { isEligible: true, quantity };
  }

  // =============================================================================
  // OTHER PRODUCT METHODS
  // =============================================================================

  async getInventory(): Promise<ManiDeckInventory> {
    const onchainData = await this.fetchOnchainData();
    return {
      totalSupply:
        onchainData.totalSupply === Number.MAX_SAFE_INTEGER ? -1 : onchainData.totalSupply,
      totalPurchased: onchainData.totalMinted,
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();
    return {
      startDate: onchainData.startDate,
      endDate: onchainData.endDate,
      audienceRestriction: onchainData.audienceType as AudienceRestriction,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    const publicData = this.data.publicData;
    return {
      creator: {
        id: this.data.creator.id.toString(),
        slug: this.data.creator.slug || '',
        address: this.data.creator.address || '',
        name: this.data.creator.name,
      },
      contract: this._getContractInfo(),
      networkId: publicData.network,
    };
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.name || this.previewData.title || '',
      description: this.data.publicData.description || this.previewData.description || '',
    };
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    const image = this.previewData.thumbnail;
    const imagePreview = this.previewData.thumbnail;

    return {
      image,
      imagePreview,
    };
  }

  // =============================================================================
  // MANIDECK-SPECIFIC METHODS
  // =============================================================================

  async getTokenVariations(): Promise<ManiDeckTokenVariation[]> {
    const publicData = this.data.publicData;

    return publicData.pool.map((item) => ({
      tokenId: item.seriesIndex, // seriesIndex is 1-based
      metadata: item.metadata,
      tier: this._getTierForIndex(item.seriesIndex - 1, publicData.tierProbabilities),
      rarityScore: this._calculateRarityScore(item.seriesIndex - 1),
    }));
  }

  async getTierProbabilities(): Promise<ManiDeckTier[]> {
    const publicData = this.data.publicData;
    if (!publicData.tierProbabilities || publicData.tierProbabilities.length === 0) {
      return [];
    }

    // Convert array format to ManiDeckTier[]
    return publicData.tierProbabilities.map((tier) => ({
      id: tier.group,
      name: tier.group,
      probability: tier.rate,
      tokenIds: tier.indices,
      metadata: {},
    }));
  }

  async getClaimableTokens(walletAddress: Address): Promise<ManiDeckClaimableToken[]> {
    // Check if wallet has any claimable tokens
    const allocations = await this.getAllocations({ recipientAddress: walletAddress });
    if (!allocations.isEligible) {
      return [];
    }

    // For ManiDeck, all tokens in pool are potentially claimable
    const variations = await this.getTokenVariations();
    return variations.map((v) => ({
      tokenId: v.tokenId,
      metadata: v.metadata,
      tier: v.tier,
      isClaimable: true,
      proofs: [], // No merkle proofs for standard ManiDeck
    }));
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private _getTierForIndex(index: number, tierProbs: ManiDeckTierProbability[]): string {
    if (tierProbs && tierProbs.length > 0) {
      for (const tierProb of tierProbs) {
        if (tierProb.indices.includes(index)) {
          return tierProb.group;
        }
      }
    }
    return 'Common';
  }

  private _calculateRarityScore(_index: number): number {
    // Simple rarity calculation
    return Math.floor(Math.random() * 100);
  }
}

// Type guard
export function isManiDeckProduct(product: unknown): product is IManiDeckProduct {
  return (product as IManiDeckProduct)?.type === AppType.MANI_DECK;
}
