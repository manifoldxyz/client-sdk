import type {
  BlindMintPublicData,
  BlindMintOnchainData,
  BlindMintStatus,
  BlindMintInventory,
  TokenVariation,
  GachaConfig,
  GachaTier,
  ClaimableToken,
  FloorPriceData,
  MintHistoryItem,
  BlindMintTierProbability,
  BlindMintProduct as IBlindMintProduct,
} from '../types/blindmint';
import type { IAccountAdapter, UniversalTransactionRequest } from '../types/account-adapter';
import type {
  Product,
  AllocationParams,
  AllocationResponse,
  PreparePurchaseParams,
  PurchaseParams,
  Order,
  ProductMetadata,
  ProductRule,
  ProductProvenance,
  Media,
  InstanceData,
  AudienceRestriction,
} from '../types/product';
import type {
  BlindMintPayload,
  PreparedPurchase,
  TransactionStep,
  GasBuffer,
} from '../types/purchase';
import type { Address } from '../types/common';
import { AppType, AppId } from '../types/common';
import type { BlindMintClaimContract } from '../utils/contract-factory';
import * as ethers from 'ethers';

import { createProvider } from '../utils/provider-factory';
import { ContractFactory as ContractFactoryClass } from '../utils/contract-factory';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { BlindMintError, BlindMintErrorCode } from '../types/enhanced-errors';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client';
import { estimateGas, checkERC20Balance, checkERC20Allowance } from '../utils/gas-estimation';
import { Money } from '../libs/money';
import type { Cost } from '../types/money';
import type { TransactionReceipt } from '../types/purchase';

/**
 * BlindMintProduct implementation following technical spec CON-2729
 * and gachapon-widgets pattern for getClaim parsing
 */
export class BlindMintProduct implements IBlindMintProduct {
  readonly id: number;
  readonly type = AppType.BLIND_MINT;
  readonly data: InstanceData<BlindMintPublicData>;
  readonly previewData: InstancePreview;

  // Onchain data (fetched lazily)
  onchainData?: BlindMintOnchainData;

  // Internal state
  private _creatorContract: Address;
  private _extensionAddress: Address;
  private _platformFee?: Money;
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
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_CONFIGURATION,
        `Invalid app ID for BlindMint. Expected ${AppId.BLIND_MINT_1155}, received ${instanceData.appId}`,
        { instanceId: String(instanceData.id) },
      );
    }

    const publicData = instanceData.publicData;

    // Store instance data with properly typed publicData
    this.data = instanceData;
    this.previewData = previewData;

    this.id = instanceData.id;

    this._creatorContract = publicData.contract.contractAddress;
    this._extensionAddress = publicData.extensionAddress1155.value;
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

    const factory = new ContractFactoryClass({
      provider: { current: provider } as { current: ethers.providers.Provider },
      networkId,
    });
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
      // Using id as claimIndex
      const claimData = await contract.getClaim(this._creatorContract, this.id);

      // Process into BlindMintOnchainData format
      const onchainData = await this._processClaimData(claimData);

      // Fetch platform fee from contract and create Money object
      const mintFee = await contract.MINT_FEE();
      const networkId = this.data.publicData.network;
      const provider = createProvider({
        networkId,
        customRpcUrls: this._httpRPCs,
      });

      this._platformFee = await Money.create({
        value: mintFee,
        networkId,
        provider,
        fetchUSD: true,
      });

      // Cache the result
      this.onchainData = onchainData;
      return onchainData;
    } catch (error) {
      throw new ClientSDKError(ErrorCode.API_ERROR, 'Failed to fetch onchain data', {
        error: (error as Error).message,
      });
    }
  }

  private async _processClaimData(claimData: {
    storageProtocol: number;
    total: number;
    totalMax: number;
    startDate: number;
    endDate: number;
    startingTokenId: ethers.BigNumber;
    tokenVariations: number;
    location: string;
    paymentReceiver: string;
    cost: ethers.BigNumber;
    erc20: string;
  }): Promise<BlindMintOnchainData> {
    // Handle the actual structure from ABIv2 getClaim
    const cost = ethers.BigNumber.from(claimData.cost);
    const erc20 = claimData.erc20;

    // Convert dates from unix seconds
    const convertDate = (unixSeconds: number): Date => {
      return unixSeconds === 0 ? new Date(0) : new Date(unixSeconds * 1000);
    };

    const networkId = this.data.publicData.network;
    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });

    // Create Money object which will fetch all metadata automatically
    const costMoney = await Money.create({
      value: cost,
      networkId,
      erc20,
      provider,
      fetchUSD: true,
    });

    return {
      totalSupply: claimData.totalMax || Number.MAX_SAFE_INTEGER,
      totalMinted: claimData.total || 0,
      walletMax: 0, // ABIv2 doesn't have walletMax in getClaim, need different approach
      startDate: convertDate(claimData.startDate || 0),
      endDate: convertDate(claimData.endDate || 0),
      audienceType: 'None', // Will be updated based on merkle root if needed
      cost: costMoney,
      paymentReceiver: claimData.paymentReceiver,
      tokenVariations: claimData.tokenVariations || 0,
      startingTokenId: claimData.startingTokenId ? claimData.startingTokenId.toString() : '0',
    };
  }

  // =============================================================================
  // PRODUCT INTERFACE IMPLEMENTATION
  // =============================================================================

  async getStatus(): Promise<BlindMintStatus> {
    const onchainData = await this.fetchOnchainData();
    const now = Date.now();
    console.log('endDate', onchainData.endDate);
    if (onchainData.startDate && now < onchainData.startDate.getTime()) {
      return 'upcoming';
    }
    if (onchainData.endDate && now > onchainData.endDate.getTime()) {
      return 'completed';
    }
    if (onchainData.totalSupply && onchainData.totalMinted >= onchainData.totalSupply) {
      return 'sold-out';
    }
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    const { recipientAddress } = params;
    if (!validateAddress(recipientAddress)) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_WALLET_ADDRESS,
        'Invalid recipient address',
        { walletAddress: recipientAddress },
      );
    }

    const onchainData = await this.fetchOnchainData();
    const contract = this._getClaimContract();

    // Get wallet minted count using getTotalMints (as per spec)
    const userMints = await contract.getUserMints(recipientAddress, this._creatorContract, this.id);
    const mintedCount = userMints.reservedCount + userMints.deliveredCount;
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
    const quantity = payload?.quantity || 1;
    const networkId = this.data.publicData.network;
    const walletAddress = address;

    if (!validateAddress(walletAddress)) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_WALLET_ADDRESS,
        'Invalid wallet address',
        {
          walletAddress,
        },
      );
    }

    // Check status first
    const status = await this.getStatus();
    if (status === 'upcoming') {
      throw new BlindMintError(BlindMintErrorCode.MINT_NOT_STARTED, 'Sale has not started', {
        instanceId: String(this.id),
        mintStatus: status,
      });
    }
    if (status === 'completed') {
      throw new BlindMintError(BlindMintErrorCode.MINT_ENDED, 'Sale has ended', {
        instanceId: String(this.id),
        mintStatus: status,
      });
    }
    if (status === 'sold-out') {
      throw new BlindMintError(BlindMintErrorCode.SOLD_OUT, 'Product is sold out', {
        instanceId: String(this.id),
        mintStatus: status,
      });
    }

    // Check allocations
    const allocations = await this.getAllocations({ recipientAddress: walletAddress });
    if (!allocations.isEligible) {
      throw new ClientSDKError(ErrorCode.NOT_ELIGIBLE, allocations.reason || 'Not eligible');
    }
    if (quantity > allocations.quantity) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Quantity exceeds available allocation');
    }

    const onchainData = await this.fetchOnchainData();
    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });

    // Calculate costs - onchainData.cost is already a Money instance from _processClaimData
    const productCost = onchainData.cost.multiplyInt(quantity);
    const platformFee = this._platformFee
      ? this._platformFee.multiplyInt(quantity)
      : await Money.zero({ networkId, provider });

    // Aggregate costs by currency type
    const costsByToken = new Map<string, Money>();

    // Helper to add cost to map
    const addCostToMap = (cost: Money) => {
      if (cost.isPositive()) {
        const key = cost.erc20;
        const existing = costsByToken.get(key);
        costsByToken.set(key, existing ? existing.add(cost) : cost);
      }
    };

    addCostToMap(productCost);
    addCostToMap(platformFee);

    // Build steps array
    const steps: TransactionStep[] = [];

    // Check balances and create approvals for each token type
    for (const [tokenAddress, totalCost] of Array.from(costsByToken)) {
      if (totalCost.isERC20()) {
        // Check ERC20 balance using provider
        const balance = await checkERC20Balance(tokenAddress, walletAddress, provider);

        if (balance.lt(totalCost.raw)) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${ethers.utils.formatUnits(balance, totalCost.decimals)}`,
          );
        }

        // Check approval
        const currentAllowance = await checkERC20Allowance(
          tokenAddress,
          walletAddress,
          this._extensionAddress,
          provider,
        );

        if (currentAllowance.lt(totalCost.raw)) {
          const approvalStep: TransactionStep = {
            id: `approve-${totalCost.symbol.toLowerCase()}`,
            name: `Approve ${totalCost.symbol} Spending`,
            type: 'approve',
            description: `Approve ${totalCost.formatted} ${totalCost.symbol}`,
            execute: async (accountAdapter: IAccountAdapter) => {
              const gasBuffer = params.gasBuffer || {};

              // Build universal transaction request
              const txRequest: UniversalTransactionRequest = {
                to: tokenAddress,
                data: this._buildApprovalData(this._extensionAddress, totalCost.raw.toString()),
                gasLimit: this._calculateGasLimitWithBuffer('200000', gasBuffer), // Standard ERC20 approval gas
              };

              try {
                const response = await accountAdapter.sendTransaction(txRequest);
                return {
                  networkId,
                  step: approvalStep.id,
                  txHash: response.hash,
                  blockNumber: response.blockNumber,
                  gasUsed: response.gasUsed ? BigInt(response.gasUsed) : undefined,
                  status: response.status || 'pending',
                };
              } catch (error) {
                throw new BlindMintError(
                  BlindMintErrorCode.TRANSACTION_FAILED,
                  `Approval transaction failed: ${(error as Error).message}`,
                  {
                    step: approvalStep.id,
                    tokenAddress,
                    originalError: error as Error,
                  },
                );
              }
            },
          };

          steps.push(approvalStep);
        }
      } else {
        // Check native balance using provider
        const nativeBalance = await provider.getBalance(walletAddress);

        if (nativeBalance.lt(totalCost.raw)) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${ethers.utils.formatUnits(nativeBalance, 18)}`,
          );
        }
      }
    }

    // Calculate native payment value for mint transaction
    const nativePaymentValue =
      costsByToken.get(ethers.constants.AddressZero)?.raw || ethers.BigNumber.from(0);

    // Build cost breakdown for mint step and enhanced cost
    const nativeCost = costsByToken.get(ethers.constants.AddressZero);
    const erc20Costs = Array.from(costsByToken.entries())
      .filter(([address]) => address !== ethers.constants.AddressZero)
      .map(([, cost]) => cost);

    // Build mint step
    const mintCost: { native?: Money; erc20s?: Money[] } = {};
    if (nativeCost) mintCost.native = nativeCost;
    if (erc20Costs.length > 0) mintCost.erc20s = erc20Costs;

    const mintStep: TransactionStep = {
      id: 'mint',
      name: 'Mint BlindMint NFTs',
      type: 'mint',
      description: `Mint ${quantity} random NFT(s)`,
      cost: mintCost,
      execute: async (accountAdapter: IAccountAdapter) => {
        // Validate network at execution time
        const adapterNetworkId = await accountAdapter.getConnectedNetworkId();
        if (adapterNetworkId !== networkId) {
          throw new BlindMintError(
            BlindMintErrorCode.NETWORK_MISMATCH,
            `Wallet connected to network ${adapterNetworkId}, but product requires network ${networkId}`,
            {
              expectedNetworkId: networkId,
              actualNetworkId: adapterNetworkId,
              instanceId: String(this.id),
            },
          );
        }

        const gasBuffer = params.gasBuffer || {};

        // Build universal transaction request
        const txRequest: UniversalTransactionRequest = {
          to: this._extensionAddress,
          data: this._buildMintData(this._creatorContract, this.id, quantity),
          value: nativePaymentValue.toString(),
          gasLimit: this._calculateGasLimitWithBuffer('300000', gasBuffer), // Estimated mint gas
        };

        try {
          const response = await accountAdapter.sendTransaction(txRequest);
          return {
            networkId,
            step: mintStep.id,
            txHash: response.hash,
            blockNumber: response.blockNumber,
            gasUsed: response.gasUsed ? BigInt(response.gasUsed) : undefined,
            status: response.status || 'pending',
          };
        } catch (error) {
          throw new BlindMintError(
            BlindMintErrorCode.TRANSACTION_FAILED,
            `Mint transaction failed: ${(error as Error).message}`,
            {
              step: mintStep.id,
              quantity,
              originalError: error as Error,
            },
          );
        }
      },
    };

    steps.push(mintStep);

    // Build Cost structure (reuse the already computed values)
    const cost: Cost = {
      total: {
        native: nativeCost || (await Money.zero({ networkId, provider })),
        erc20s: erc20Costs,
      },
      breakdown: {
        product: productCost,
        platformFee,
      },
    };

    return {
      cost,
      steps,
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const { accountAdapter, preparedPurchase } = params;
    const walletAddress = accountAdapter.address;

    // Execute all steps sequentially
    const receipts: TransactionReceipt[] = [];

    for (const step of preparedPurchase.steps) {
      try {
        const receipt = await step.execute(accountAdapter);
        receipts.push(receipt);
      } catch (error) {
        // If any step fails, throw error with context
        throw new ClientSDKError(
          ErrorCode.TRANSACTION_FAILED,
          `Transaction failed at step ${step.id}: ${(error as Error).message}`,
          {
            step: step.id,
            receipts, // Include successful receipts
            error: error as Error,
          },
        );
      }
    }

    return {
      receipts,
      status: 'completed' as const,
      buyer: { walletAddress },
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

    // Use proper mintReserve signature with indices and proofs
    const mintIndices: number[] = [];
    const merkleProofs: string[][] = [];

    return await estimateGas({
      contract,
      method: 'mintReserve',
      args: [this._creatorContract, this.id, quantity, mintIndices, merkleProofs],
      from,
      value,
      fallbackGas: ethers.BigNumber.from(200000),
    });
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
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();
    return {
      startDate: onchainData.startDate.getTime() === 0 ? undefined : onchainData.startDate,
      endDate: onchainData.endDate.getTime() === 0 ? undefined : onchainData.endDate,
      audienceRestriction: onchainData.audienceType as AudienceRestriction,
      maxPerWallet: onchainData.walletMax || undefined,
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
      contract: {
        id: publicData.contract.id,
        networkId: publicData.contract.networkId,
        contractAddress: publicData.contract.contractAddress,
        name: publicData.contract.name,
        symbol: publicData.contract.symbol,
        spec: publicData.contract.spec,
      },
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

    return publicData.pool.map((item) => ({
      tokenId: parseInt(onchainData.startingTokenId) + (item.seriesIndex - 1), // seriesIndex is 1-based
      metadata: item.metadata,
      tier: this._getTierForIndex(item.seriesIndex - 1, publicData.tierProbabilities),
      rarityScore: this._calculateRarityScore(item.seriesIndex - 1),
    }));
  }

  async getGachaConfig(): Promise<GachaConfig> {
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
    if (!publicData.tierProbabilities || publicData.tierProbabilities.length === 0) {
      return [];
    }

    // Convert array format to GachaTier[]
    return publicData.tierProbabilities.map((tier) => ({
      id: tier.group,
      name: tier.group,
      probability: tier.rate,
      tokenIds: tier.indices,
      metadata: {},
    }));
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

  async getFloorPrices(): Promise<FloorPriceData[]> {
    // Would integrate with price oracle
    return [];
  }

  async getMintHistory(_walletAddress?: Address): Promise<MintHistoryItem[]> {
    // Would query contract events
    return [];
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private _getTierForIndex(index: number, tierProbs: BlindMintTierProbability[]): string {
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

  private _calculateTotalCost(quantity: number, onchainData: BlindMintOnchainData): bigint {
    const mintCost = BigInt(onchainData.cost.value.toString()) * BigInt(quantity);
    const platformFee = BigInt(this._platformFee?.value.toString() || '0') * BigInt(quantity);
    return mintCost + platformFee;
  }

  private _applyGasBuffer(gasEstimate: ethers.BigNumber, gasBuffer?: GasBuffer): ethers.BigNumber {
    if (!gasBuffer) {
      return gasEstimate.mul(120).div(100); // Default 20% buffer
    }
    return gasBuffer.fixed
      ? gasEstimate.add(gasBuffer.fixed)
      : gasEstimate.mul(gasBuffer.multiplier || 120).div(100);
  }

  /**
   * Build ERC-20 approval transaction data
   */
  private _buildApprovalData(spender: string, amount: string): string {
    const approvalInterface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount)',
    ]);
    return approvalInterface.encodeFunctionData('approve', [spender, amount]);
  }

  /**
   * Build mint transaction data
   */
  private _buildMintData(creatorContract: string, claimIndex: number, quantity: number): string {
    // Using the actual mint function signature from the contract
    const mintInterface = new ethers.utils.Interface([
      'function mintReserve(address creatorContract, uint256 claimIndex, uint256 quantity)',
    ]);
    return mintInterface.encodeFunctionData('mintReserve', [creatorContract, claimIndex, quantity]);
  }

  /**
   * Calculate gas limit with buffer for adapter transactions
   */
  private _calculateGasLimitWithBuffer(baseGas: string, gasBuffer?: GasBuffer): string {
    const base = ethers.BigNumber.from(baseGas);
    const buffered = this._applyGasBuffer(base, gasBuffer);
    return buffered.toString();
  }
}

// Export the implementation class as BlindMintProductImpl for tests
export { BlindMintProduct as BlindMintProductImpl };

// Factory function
export function createBlindMintProduct(
  instanceData: InstanceData<BlindMintPublicData>,
  previewData: InstancePreview = {} as InstancePreview,
  options: { httpRPCs?: Record<number, string> } = {},
): BlindMintProduct {
  return new BlindMintProduct(instanceData, previewData, options);
}

// Type guard
export function isBlindMintProduct(product: Product): product is IBlindMintProduct {
  return product?.type === AppType.BLIND_MINT;
}
