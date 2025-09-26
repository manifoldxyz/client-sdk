import type {
  BlindMintPublicData,
  BlindMintOnchainData,
  BlindMintStatus,
  BlindMintInventory,
  InternalClaimData,
  TokenVariation,
  GachaConfig,
  GachaTier,
  ClaimableToken,
  MintValidationParams,
  MintValidation,
  ValidationError,
  ValidationWarning,
  FloorPriceData,
  MintHistoryItem,
  BlindMintTierProbability,
} from '../types/blindmint';
import type {
  Product,
  BlindMintProduct as IBlindMintProduct,
  AllocationParams,
  AllocationResponse,
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  ProductMetadata,
  ProductRule,
  ProductProvenance,
  Media,
  TransactionStep,
  Contract,
  InstanceData,
} from '../types/product';
import type { BlindMintPayload } from '../types/purchase';
import type { Address } from '../types/common';
import { AppType, AppId } from '../types/common';
import type { BlindMintClaimContract } from '../utils/contract-factory';
import * as ethers from 'ethers';

import { createProvider } from '../utils/provider-factory';
import { ContractFactory as ContractFactoryClass } from '../utils/contract-factory';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client';
import { Currency } from '@manifoldxyz/js-ts-utils';
import {
  getEthToUsdRate,
  getERC20ToUSDRate,
  getNativeCurrencySymbol,
  calculateUSDValue,
} from '../api/coinbase';

/**
 * BlindMintProduct implementation following technical spec CON-2729
 * and gachapon-widgets pattern for getClaim parsing
 */
export class BlindMintProduct implements IBlindMintProduct {
  readonly id: number;
  readonly type = AppType.BLIND_MINT;
  readonly data: InstanceData<BlindMintPublicData> & { publicData: BlindMintPublicData };
  readonly previewData: InstancePreview;

  // Onchain data (fetched lazily)
  onchainData?: BlindMintOnchainData;

  // Internal state
  private _creatorContract: Address;
  private _claimIndex: number;
  private _extensionAddress: Address;
  private _platformFee?: ethers.BigNumber;
  private _httpRPCs?: Record<number, string>;

  constructor(
    instanceData: InstanceData<BlindMintPublicData>,
    previewData: InstancePreview,
    options: {
      httpRPCs?: Record<number, string>;
    } = {},
  ) {
    const { httpRPCs } = options;
    this._httpRPCs = httpRPCs;

    // Validate app ID
    if (instanceData.appId !== AppId.BLIND_MINT_1155) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Invalid app ID for BlindMint. Expected ${AppId.BLIND_MINT_1155}, received ${instanceData.appId}`,
      );
    }

    const publicData = instanceData.publicData;

    // Store instance data with properly typed publicData
    this.data = instanceData;
    this.previewData = previewData;

    this.id = instanceData.id;

    this._creatorContract = publicData.contract.address as Address;
    this._extensionAddress = publicData.extensionAddress;
    this._claimIndex = 0; // Default to index 0 for BlindMint
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private _getClaimContract(): BlindMintClaimContract {
    const networkId = this.data.publicData.network || 1;

    // Use configured providers (READ operations)
    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });

    const factory = new ContractFactoryClass({ provider, networkId });
    return factory.createBlindMintContract(this._extensionAddress);
  }

  // =============================================================================
  // ONCHAIN DATA FETCHING (following gachapon-widgets pattern)
  // =============================================================================

  async fetchOnchainData(force = false): Promise<BlindMintOnchainData> {
    if (this.onchainData && !force) {
      return this.onchainData;
    }

    const contract = this._getClaimContract();

    try {
      // Use getClaim method like gachapon-widgets
      const claimData = await contract.getClaim(this._creatorContract, this._claimIndex);

      // Process into BlindMintOnchainData format
      const onchainData = await this._processClaimData(claimData);

      // Fetch platform fee from contract
      this._platformFee = await contract.MINT_FEE();

      // Cache the result
      this.onchainData = onchainData;
      return onchainData;
    } catch (error) {
      throw new ClientSDKError(ErrorCode.API_ERROR, 'Failed to fetch onchain data', {
        error: (error as Error).message,
      });
    }
  }

  private async _processClaimData(claimData: InternalClaimData): Promise<BlindMintOnchainData> {
    const cost = claimData.cost;
    const erc20 = claimData.erc20;

    // Convert dates from unix seconds
    const convertDate = (unixSeconds: number) => {
      return unixSeconds === 0 ? new Date(0) : new Date(unixSeconds * 1000);
    };

    // Get proper token metadata
    const isNativeToken = erc20 === ethers.constants.AddressZero;
    const networkId = this.data.publicData.network;

    let tokenSymbol = getNativeCurrencySymbol(networkId);
    let tokenDecimals = 18;

    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });
    // Use Currency.getERC20Metadata to fetch proper token information
    const metadata = await Currency.getERC20Metadata(networkId, erc20, provider);
    tokenSymbol = metadata.symbol;
    tokenDecimals = metadata.decimals;

    // Format the cost with proper decimals
    const formatted = ethers.utils.formatUnits(cost, tokenDecimals);

    // Fetch USD conversion rate
    let formattedUSD;
    try {
      let usdRate: number | undefined;

      if (isNativeToken) {
        // Fetch native currency rate (ETH, MATIC, etc.)
        usdRate = await getEthToUsdRate(tokenSymbol);
      } else {
        // Fetch ERC20 token rate
        usdRate = await getERC20ToUSDRate(tokenSymbol, erc20);
      }

      if (usdRate) {
        formattedUSD = calculateUSDValue(BigInt(cost.toString()), tokenDecimals, usdRate);
      }
    } catch (error) {
      console.warn('Failed to fetch USD rate:', error);
    }

    return {
      totalSupply: claimData.totalMax.toNumber(),
      totalMinted: claimData.total.toNumber(),
      walletMax: claimData.walletMax.toNumber(),
      startDate: convertDate(claimData.startDate.toNumber()),
      endDate: convertDate(claimData.endDate.toNumber()),
      audienceType: 'None', // Will be updated based on merkle root if needed
      cost: {
        value: cost,
        decimals: tokenDecimals,
        erc20: erc20,
        symbol: tokenSymbol,
        formatted: formatted,
        formattedUSD: formattedUSD,
      },
      paymentReceiver: claimData.paymentReceiver as Address,
      tokenVariations: claimData.tokenVariations.toNumber(),
      startingTokenId: claimData.startingTokenId.toString(),
      // Note: storageProtocol and metadataLocation are internal only, not exposed
    };
  }

  // =============================================================================
  // PRODUCT INTERFACE IMPLEMENTATION
  // =============================================================================

  async getStatus(): Promise<BlindMintStatus> {
    const onchainData = await this.fetchOnchainData();
    const now = Date.now();

    if (onchainData.startDate && now < onchainData.startDate.getTime()) {
      return 'upcoming';
    }
    if (onchainData.endDate && now > onchainData.endDate.getTime()) {
      return 'completed';
    }
    if (onchainData.totalSupply && onchainData.totalMinted >= onchainData.totalSupply) {
      return 'completed';
    }
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    const { recipientAddress } = params;
    if (!validateAddress(recipientAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient address');
    }

    const onchainData = await this.fetchOnchainData();
    const contract = this._getClaimContract();

    // Get wallet minted count using getTotalMints (like gachapon-widgets)
    const walletMinted = await contract.getTotalMints(
      recipientAddress,
      this._creatorContract,
      this._claimIndex,
    );

    // Check eligibility
    const status = await this.getStatus();
    if (status === 'upcoming') {
      return { isEligible: false, reason: 'Sale has not started', quantity: 0 };
    }
    if (status === 'completed') {
      return { isEligible: false, reason: 'Sale has ended', quantity: 0 };
    }

    // Check wallet limit
    const mintedCount = walletMinted?.toNumber
      ? walletMinted.toNumber()
      : Number(walletMinted || 0);
    if (onchainData.walletMax > 0 && mintedCount >= onchainData.walletMax) {
      return { isEligible: false, reason: 'Wallet limit reached', quantity: 0 };
    }

    // Calculate available quantity
    let quantity = Number.MAX_SAFE_INTEGER;
    if (onchainData.walletMax > 0) {
      quantity = Math.min(quantity, onchainData.walletMax - mintedCount);
    }
    if (onchainData.totalSupply !== Number.MAX_SAFE_INTEGER) {
      const remaining = onchainData.totalSupply - onchainData.totalMinted;
      quantity = Math.min(quantity, remaining);
    }

    return { isEligible: true, quantity };
  }

  async preparePurchase(
    params: PreparePurchaseParams<BlindMintPayload>,
  ): Promise<PreparedPurchase> {
    const { address, payload } = params;
    // Now type-safe without casting
    const quantity = payload?.quantity || 1;

    if (!validateAddress(address)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid address');
    }

    // Check allocations
    const allocations = await this.getAllocations({ recipientAddress: address });
    if (!allocations.isEligible) {
      throw new ClientSDKError(ErrorCode.NOT_ELIGIBLE, allocations.reason || 'Not eligible');
    }
    if (quantity > allocations.quantity) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Quantity exceeds available allocation');
    }

    const onchainData = await this.fetchOnchainData();

    // Calculate total cost including platform fee
    const mintCostBN = ethers.BigNumber.from(onchainData.cost.value.toString()).mul(quantity);
    const platformFee = this._platformFee || ethers.BigNumber.from(0);
    const totalCost = mintCostBN.add(platformFee.mul(quantity));

    // Estimate gas - gas buffer will be handled by the calling code via params.gasBuffer
    await this._estimateGas(address, address, quantity, totalCost);

    // Create transaction step
    const step: TransactionStep = {
      id: 'mint',
      name: 'Mint BlindMint NFTs',
      type: 'mint',
      description: `Mint ${quantity} random NFT(s)`,
      execute: async () => {
        // Execute function needs to be called with account later
        throw new Error('Execute must be called with account from product.purchase');
      },
    };

    return {
      cost: {
        total: onchainData.cost,
        subtotal: onchainData.cost,
        fees: {
          ...onchainData.cost,
          value: BigInt(platformFee.mul(quantity).toString()),
          formatted: ethers.utils.formatUnits(platformFee.mul(quantity), onchainData.cost.decimals),
        },
      },
      steps: [step],
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const { account, preparedPurchase } = params;

    // Execute all steps
    const receipts: any[] = [];
    for (const step of preparedPurchase.steps) {
      if (step.execute) {
        // For BlindMint, execute the mint directly with the prepared values
        const totalValue = ethers.BigNumber.from(preparedPurchase.cost.total.value.toString());
        const receipt = await this._executeMint(account, account.address, 1, totalValue);
        receipts.push(receipt);
      }
    }

    return {
      receipts,
      status: 'confirmed',
      buyer: { walletAddress: account.address },
      total: preparedPurchase.cost,
      items: [],
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async _estimateGas(
    from: string,
    _to: string,
    quantity: number,
    value: ethers.BigNumber,
  ): Promise<ethers.BigNumber> {
    const contract = this._getClaimContract();

    try {
      // Use mintReserve for gas estimation (matches ABI: address, uint256, uint32)
      const gasEstimate = await contract.estimateGas?.mintReserve?.(
        this._creatorContract,
        this._claimIndex,
        quantity,
        { from, value },
      );

      return gasEstimate || ethers.BigNumber.from(200000);
    } catch (error) {
      // Fallback to default gas estimate
      return ethers.BigNumber.from(200000);
    }
  }

  private async _executeMint(
    account: any, // This is the wallet provider
    _recipient: string,
    quantity: number,
    value: ethers.BigNumber,
  ): Promise<any> {
    // Create contract with READ provider for setup
    const contract = this._getClaimContract();

    // CRITICAL: Use account (wallet) for WRITE operation
    const tx = await contract
      .connect(account)
      .mintReserve(this._creatorContract, this._claimIndex, quantity, { value });

    const receipt = await tx.wait();
    return {
      networkId: this.data.publicData.network,
      txHash: receipt.transactionHash,
      step: { id: 'mint', name: 'Mint BlindMint NFTs', type: 'mint' },
      txReceipt: receipt,
    };
  }

  // =============================================================================
  // OTHER PRODUCT METHODS (simplified for now)
  // =============================================================================

  async getInventory(): Promise<BlindMintInventory> {
    const onchainData = await this.fetchOnchainData();
    return {
      totalSupply:
        onchainData.totalSupply === Number.MAX_SAFE_INTEGER ? -1 : onchainData.totalSupply,
      totalPurchased: onchainData.totalMinted,
      totalMinted: onchainData.totalMinted,
      remainingSupply:
        onchainData.totalSupply === Number.MAX_SAFE_INTEGER
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, onchainData.totalSupply - onchainData.totalMinted),
      tierBreakdown: [],
      walletMinted: 0,
      walletRemaining: 0,
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();
    return {
      startDate: onchainData.startDate.getTime() === 0 ? undefined : onchainData.startDate,
      endDate: onchainData.endDate.getTime() === 0 ? undefined : onchainData.endDate,
      audienceRestriction: onchainData.audienceType as any,
      maxPerWallet: onchainData.walletMax || undefined,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    const publicData = this.data.publicData;
    return {
      creator: this.data.creator,
      contract: publicData.contract,
      networkId: publicData.network,
    };
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.previewData.title || '',
      description: this.previewData.description || '',
    };
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    // Use previewData for media
    if (this.previewData.thumbnail) {
      return {
        image: this.previewData.thumbnail,
        imagePreview: this.previewData.thumbnail,
      };
    }
    return undefined;
  }

  // =============================================================================
  // BLINDMINT-SPECIFIC METHODS
  // =============================================================================

  async getTokenVariations(): Promise<TokenVariation[]> {
    const onchainData = await this.fetchOnchainData();
    const publicData = this.data.publicData;

    return publicData.pool.map((item, index) => ({
      tokenId: onchainData.startingTokenId + index,
      metadata: item.metadata,
      tier: this._getTierForIndex(index, publicData.tierProbabilities),
      rarityScore: this._calculateRarityScore(index),
    }));
  }

  async getGachaConfig(): Promise<GachaConfig> {
    const publicData = this.data.publicData;
    const tiers = await this.getTierProbabilities();

    return {
      tiers,
      immediateReveal: true,
      revealDelay: 0,
      allowDuplicates: true,
      floorPriceHandling: undefined,
    };
  }

  async getTierProbabilities(): Promise<GachaTier[]> {
    const publicData = this.data.publicData;
    if (!publicData.tierProbabilities) {
      return [];
    }

    // Convert legacy format to GachaTier[]
    return [
      {
        id: publicData.tierProbabilities.group,
        name: publicData.tierProbabilities.group,
        probability: publicData.tierProbabilities.rate,
        tokenIds: publicData.tierProbabilities.indices,
        metadata: {},
      },
    ];
  }

  async getClaimableTokens(walletAddress: Address): Promise<ClaimableToken[]> {
    // Check if wallet has any claimable tokens
    const allocations = await this.getAllocations({ recipientAddress: walletAddress });
    if (!allocations.isEligible) {
      return [];
    }

    // For BlindMint, all tokens in pool are potentially claimable
    const variations = await this.getTokenVariations();
    return variations.map((v) => ({
      tokenId: v.tokenId,
      metadata: v.metadata,
      tier: v.tier,
      isClaimable: true,
      proofs: [], // No merkle proofs for standard BlindMint
    }));
  }

  async estimateMintGas(quantity: number, walletAddress: Address): Promise<bigint> {
    const onchainData = await this.fetchOnchainData();
    const totalValue = this._calculateTotalCost(quantity, onchainData);

    const gasEstimate = await this._estimateGas(
      walletAddress,
      walletAddress,
      quantity,
      ethers.BigNumber.from(totalValue.toString()),
    );

    return BigInt(gasEstimate.toString());
  }

  async validateMint(params: MintValidationParams): Promise<MintValidation> {
    const { walletAddress, quantity } = params;
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate address
    if (!validateAddress(walletAddress)) {
      errors.push({
        code: 'INVALID_ADDRESS',
        message: 'Invalid wallet address',
        field: 'walletAddress',
      });
    }

    // Check allocations
    const allocations = await this.getAllocations({ recipientAddress: walletAddress });
    if (!allocations.isEligible) {
      errors.push({
        code: 'NOT_ELIGIBLE',
        message: allocations.reason || 'Not eligible to mint',
      });
    }

    if (quantity > allocations.quantity) {
      errors.push({
        code: 'EXCEEDS_LIMIT',
        message: `Quantity ${quantity} exceeds available ${allocations.quantity}`,
        field: 'quantity',
      });
    }

    // Estimate costs
    const onchainData = await this.fetchOnchainData();
    const estimatedCost = this._calculateTotalCost(quantity, onchainData);
    const estimatedGas = await this.estimateMintGas(quantity, walletAddress);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      estimatedGas,
      estimatedCost: {
        total: onchainData.cost,
        subtotal: onchainData.cost,
        fees: {
          ...onchainData.cost,
          value: BigInt(this._platformFee?.mul(quantity).toString() || '0'),
        },
      },
    };
  }

  async getFloorPrices(): Promise<FloorPriceData[]> {
    // Would integrate with price oracle
    return [];
  }

  async getMintHistory(walletAddress?: Address): Promise<MintHistoryItem[]> {
    // Would query contract events
    return [];
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private _getTierForIndex(index: number, tierProb: BlindMintTierProbability): string {
    if (tierProb && tierProb.indices.includes(index)) {
      return tierProb.group;
    }
    return 'Common';
  }

  private _calculateRarityScore(index: number): number {
    // Simple rarity calculation
    return Math.floor(Math.random() * 100);
  }

  private _calculateTotalCost(quantity: number, onchainData: BlindMintOnchainData): bigint {
    const mintCost = BigInt(onchainData.cost.value.toString()) * BigInt(quantity);
    const platformFee = BigInt(this._platformFee?.toString() || '0') * BigInt(quantity);
    return mintCost + platformFee;
  }

  private _extractNetworkId(contract: Contract | undefined): number | undefined {
    if (!contract) return undefined;

    // Check for network in contract metadata
    if ((contract as any).networkId) {
      return (contract as any).networkId;
    }

    // Could also infer from contract address patterns
    // e.g., certain prefixes for testnet vs mainnet
    return undefined;
  }
}

// Type guard
export function isBlindMintProduct(product: Product): product is IBlindMintProduct {
  return product.type === AppType.BlindMint;
}
