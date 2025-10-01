import type {
  BlindMintPublicData,
  BlindMintOnchainData,
  BlindMintStatus,
  BlindMintInventory,
  TokenVariation,
  GachaTier,
  ClaimableToken,
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
  TransactionStepExecuteOptions,
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
import type { InstancePreview } from '@manifoldxyz/studio-apps-client';
import { estimateGas } from '../utils/gas-estimation';
import { Money } from '../libs/money';
import type { Cost } from '../types/money';
import type { TransactionReceipt } from '../types/purchase';

/**
 * BlindMint product implementation for mystery/gacha-style NFT mints.
 *
 * BlindMint products allow creators to offer randomized NFTs with different
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
export class BlindMintProduct implements IBlindMintProduct {
  /**
   * Unique instance ID for this product.
   */
  readonly id: number;

  /**
   * Product type identifier (always BLIND_MINT).
   */
  readonly type = AppType.BLIND_MINT;

  /**
   * Off-chain product data including metadata and configuration.
   */
  readonly data: InstanceData<BlindMintPublicData>;

  /**
   * Preview data for display purposes.
   */
  readonly previewData: InstancePreview;

  /**
   * On-chain data (pricing, supply, etc.). Populated after calling fetchOnchainData().
   */
  onchainData?: BlindMintOnchainData;

  // Internal state
  private _creatorContract: Address;
  private _extensionAddress: Address;
  private _platformFee?: Money;
  private _httpRPCs?: Record<number, string>;

  /**
   * Creates a new BlindMintProduct instance.
   *
   * @param instanceData - Product instance data from the API
   * @param previewData - Preview data for the product
   * @param options - Configuration options
   * @param options.httpRPCs - Custom RPC endpoints by network ID
   *
   * @throws {ClientSDKError} If the app ID doesn't match BLIND_MINT_1155
   *
   * @internal
   */
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
  // ONCHAIN DATA FETCHING
  // =============================================================================

  /**
   * Fetches and caches on-chain data for the BlindMint product.
   *
   * Retrieves information including:
   * - Total supply and minted count
   * - Pricing information
   * - Wallet limits
   * - Start and end dates
   * - Token variations and probabilities
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

  /**
   * Prepares a purchase transaction for the BlindMint product.
   *
   * This method:
   * - Validates eligibility (wallet limits, supply, dates)
   * - Calculates total cost including gas
   * - Generates transaction data
   * - Returns prepared transaction steps
   *
   * @param params - Purchase preparation parameters
   * @param params.address - Wallet address making the purchase
   * @param params.recipientAddress - Optional different recipient address
   * @param params.payload - Purchase payload
   * @param params.payload.quantity - Number of tokens to mint (default: 1)
   * @param params.networkId - Optional network ID for cross-chain purchases
   * @param params.gasBuffer - Optional gas buffer configuration
   *
   * @returns PreparedPurchase object with cost breakdown and transaction steps
   *
   * @throws {ClientSDKError} With error codes:
   * - `INVALID_INPUT` - Invalid address or quantity
   * - `NOT_ELIGIBLE` - Wallet not eligible to purchase
   * - `SOLD_OUT` - Product sold out
   * - `LIMIT_REACHED` - Wallet limit reached
   * - `NOT_STARTED` - Sale hasn't started
   * - `ENDED` - Sale has ended
   * - `INSUFFICIENT_FUNDS` - Insufficient balance
   *
   * @example
   * ```typescript
   * const prepared = await product.preparePurchase({
   *   address: '0x123...',
   *   payload: { quantity: 2 },
   *   gasBuffer: { multiplier: 0.25 } // 25% gas buffer
   * });
   *
   * console.log(`Total cost: ${prepared.cost.total.formatted}`);
   * console.log(`Gas estimate: ${prepared.gasEstimate.formatted}`);
   * ```
   *
   * @public
   */
  async preparePurchase(
    params: PreparePurchaseParams<BlindMintPayload>,
  ): Promise<PreparedPurchase> {
    const { address, payload } = params;
    const quantity = payload?.quantity || 1;
    const networkId = this.data.publicData.network;
    const walletAddress = address;

    if (!validateAddress(walletAddress)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid wallet address', {
        walletAddress,
      });
    }

    // Check status first
    const status = await this.getStatus();
    if (status === 'upcoming') {
      throw new ClientSDKError(ErrorCode.NOT_STARTED, 'Sale has not started', {
        instanceId: String(this.id),
        mintStatus: status,
      });
    }
    if (status === 'ended') {
      throw new ClientSDKError(ErrorCode.ENDED, 'Sale has ended', {
        instanceId: String(this.id),
        mintStatus: status,
      });
    }
    if (status === 'sold-out') {
      throw new ClientSDKError(ErrorCode.SOLD_OUT, 'Product is sold out', {
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

    // Calculate costs
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

    const contractFactory = new ContractFactoryClass({
      provider,
      networkId,
    });

    // Check balances and create approvals for each token type
    for (const [tokenAddress, totalCost] of Array.from(costsByToken.entries())) {
      if (totalCost.isERC20()) {
        const erc20Contract = contractFactory.createERC20Contract(tokenAddress);
        const [balance, currentAllowance] = await Promise.all([
          erc20Contract.balanceOf(walletAddress),
          erc20Contract.allowance(walletAddress, this._extensionAddress),
        ]);

        if (balance.lt(totalCost.raw)) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${ethers.utils.formatUnits(balance, totalCost.decimals)}`,
          );
        }

        if (currentAllowance.lt(totalCost.raw)) {
          const approvalStep: TransactionStep = {
            id: `approve-${totalCost.symbol.toLowerCase()}`,
            name: `Approve ${totalCost.symbol} Spending`,
            type: 'approve',
            description: `Approve ${totalCost.formatted} ${totalCost.symbol}`,
            execute: async (
              accountAdapter: IAccountAdapter,
              options?: TransactionStepExecuteOptions,
            ) => {
              await accountAdapter.switchNetwork(networkId);

              const gasEstimate = await estimateGas({
                contract: erc20Contract,
                method: 'approve',
                args: [this._extensionAddress, totalCost.raw],
                from: accountAdapter.address,
                fallbackGas: ethers.BigNumber.from(200000),
              });

              const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();

              const txRequest: UniversalTransactionRequest = {
                to: tokenAddress,
                data: this._buildApprovalData(this._extensionAddress, totalCost.raw.toString()),
                gasLimit,
                chainId: networkId,
              };

              const confirmation = await accountAdapter.sendTransactionWithConfirmation(txRequest, {
                confirmations: options?.confirmations || 1,
              });

              const receiptInfo = confirmation.receipt;
              const blockNumber = receiptInfo?.blockNumber ?? confirmation.blockNumber;
              const gasUsedValue = receiptInfo?.gasUsed ?? confirmation.gasUsed;
              const status = receiptInfo?.status ?? confirmation.status ?? 'confirmed';

              return {
                networkId,
                step: approvalStep.id,
                txHash: confirmation.hash,
                blockNumber,
                gasUsed: gasUsedValue ? BigInt(gasUsedValue) : undefined,
                status,
              };
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
      execute: async (accountAdapter: IAccountAdapter, options?: TransactionStepExecuteOptions) => {
        // This will handle network switch and adding custom network to user wallet if needed
        await accountAdapter.switchNetwork(networkId);

        const blindMintContract = contractFactory.createBlindMintContract(this._extensionAddress);
        const gasEstimate = await estimateGas({
          contract: blindMintContract,
          method: 'mintReserve',
          args: [this._creatorContract, this.id, quantity],
          from: accountAdapter.address,
          value: nativePaymentValue,
          fallbackGas: ethers.BigNumber.from(300000),
        });

        const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();

        const txRequest: UniversalTransactionRequest = {
          to: this._extensionAddress,
          data: this._buildMintData(this._creatorContract, this.id, quantity),
          value: nativePaymentValue.toString(),
          gasLimit,
          chainId: networkId,
        };

        const confirmation = await accountAdapter.sendTransactionWithConfirmation(txRequest, {
          confirmations: options?.confirmations || 1,
        });

        const receiptInfo = confirmation.receipt;
        const blockNumber = receiptInfo?.blockNumber ?? confirmation.blockNumber;
        const gasUsedValue = receiptInfo?.gasUsed ?? confirmation.gasUsed;
        const status = receiptInfo?.status ?? confirmation.status ?? 'confirmed';

        return {
          networkId,
          step: mintStep.id,
          txHash: confirmation.hash,
          blockNumber,
          gasUsed: gasUsedValue ? BigInt(gasUsedValue) : undefined,
          status,
        };
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
      status: 'completed',
      buyer: { walletAddress },
      total: preparedPurchase.cost,
      items: [],
    };
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
      provider,
      networkId,
    });
    return factory.createBlindMintContract(this._extensionAddress);
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
    const convertDate = (unixSeconds: number): Date | undefined => {
      return !unixSeconds ? undefined : new Date(unixSeconds * 1000);
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
      startDate: convertDate(claimData.startDate),
      endDate: convertDate(claimData.endDate),
      audienceType: 'None', // Will be updated based on merkle root if needed
      cost: costMoney,
      paymentReceiver: claimData.paymentReceiver,
      tokenVariations: claimData.tokenVariations,
      startingTokenId: claimData.startingTokenId ? claimData.startingTokenId.toString() : '0',
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
      return 'ended';
    }
    if (onchainData.totalSupply && onchainData.totalMinted >= onchainData.totalSupply) {
      return 'sold-out';
    }
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
    if (onchainData.totalSupply !== Number.MAX_SAFE_INTEGER) {
      const remaining = onchainData.totalSupply - onchainData.totalMinted;
      quantity = Math.min(quantity, remaining);
    }

    return { isEligible: true, quantity };
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
      return gasEstimate;
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
  private _buildMintData(creatorContract: string, instanceId: number, quantity: number): string {
    // Using the actual mint function signature from the contract
    const mintInterface = new ethers.utils.Interface([
      'function mintReserve(address creatorContractAddress,uint256 instanceId,uint32 mintCount)',
    ]);
    return mintInterface.encodeFunctionData('mintReserve', [creatorContract, instanceId, quantity]);
  }

  /**
   * Calculate gas limit with buffer for adapter transactions
   */
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
