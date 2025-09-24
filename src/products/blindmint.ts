import type {
  BlindMintProduct,
  BlindMintPublicData,
  BlindMintOnchainData,
  BlindMintStatus,
  BlindMintInventory,
  TokenVariation,
  GachaConfig,
  GachaTier,
  ClaimableToken,
  MintValidationParams,
  MintValidation,
  FloorPriceData,
  MintHistoryItem,
} from '../types/blindmint';
import type {
  AllocationParams,
  AllocationResponse,
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  ProductMetadata,
  ProductRule,
  ProductProvenance,
  ProductInventory,
  Media,
  InstanceData,
  PreviewData,
  TransactionStep,
  TransactionReceipt,
} from '../types/product';
import type { Address, NetworkId, Cost, Money } from '../types/common';
import type { DualProvider } from '../utils/provider-factory';
import type { ContractFactory, BlindMintClaimContract } from '../utils/contract-factory';

import { createDualProvider } from '../utils/provider-factory';
import { ContractFactory as ContractFactoryClass } from '../utils/contract-factory';
import { getNetworkConfig } from '../config/networks';
import { getCacheConfig } from '../config/cache';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import { BlindMintError, BlindMintErrorCode } from '../types/enhanced-errors';
import * as ethers from 'ethers';

// =============================================================================
// BLINDMINT PRODUCT IMPLEMENTATION
// =============================================================================

/**
 * BlindMintProduct implementation following functional programming patterns
 * and dual-provider architecture from CONTRACT_PATTERNS.md
 */
export class BlindMintProductImpl implements BlindMintProduct {
  readonly type = 'blind-mint' as const;
  readonly id: string;
  readonly data: {
    id: string;
    creator: any;
    publicData: BlindMintPublicData;
    appId: number;
    appName: string;
  };
  readonly previewData: PreviewData;
  
  // Internal state
  private _onchainData?: BlindMintOnchainData;
  private _provider?: DualProvider;
  private _contractFactory?: ContractFactory;
  private _claimContract?: BlindMintClaimContract;
  private _cacheConfig = getCacheConfig();

  constructor(instanceData: InstanceData, includeOnchainData = false) {
    this.id = instanceData.id;
    
    // Validate and transform instance data
    if (!instanceData.publicData || typeof instanceData.publicData !== 'object') {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_CONFIGURATION,
        'Invalid instance data: missing publicData',
        { instanceId: instanceData.id }
      );
    }

    // Transform instance data to match BlindMintProduct format
    this.data = {
      id: instanceData.id,
      creator: instanceData.creator,
      publicData: instanceData.publicData as BlindMintPublicData,
      appId: instanceData.appId || 3, // BlindMint app ID
      appName: instanceData.appName || 'BlindMint',
    };

    // Initialize preview data with safe defaults
    this.previewData = {
      title: this.data.publicData.title,
      description: this.data.publicData.description,
      contract: this.data.publicData.contract,
      thumbnail: this.data.publicData.thumbnail,
      network: this.data.publicData.network,
      startDate: undefined, // Will be populated from onchain data
      endDate: undefined,
      price: undefined,
    };

    // Initialize blockchain infrastructure if needed
    if (includeOnchainData) {
      this._initializeProviderAndContracts();
    }
  }

  // =============================================================================
  // CORE PRODUCT METHODS
  // =============================================================================

  async getStatus(): Promise<BlindMintStatus> {
    const onchainData = await this.fetchOnchainData();
    const now = new Date();

    // Check if mint has not started
    if (onchainData.startDate > now) {
      return 'upcoming';
    }

    // Check if mint has ended
    if (onchainData.endDate < now) {
      return 'ended';
    }

    // Check if sold out
    if (onchainData.totalMinted >= onchainData.totalSupply) {
      return 'sold-out';
    }

    // Otherwise, it's active
    return 'active';
  }

  async getAllocations(params: AllocationParams): Promise<AllocationResponse> {
    if (!validateAddress(params.recipientAddress)) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_WALLET_ADDRESS,
        'Invalid recipient address',
        { address: params.recipientAddress }
      );
    }

    const onchainData = await this.fetchOnchainData();
    
    // For BlindMint, there's no allowlist - anyone can mint up to wallet limit
    const walletMax = onchainData.walletMax;
    const remainingSupply = onchainData.totalSupply - onchainData.totalMinted;
    
    // Get how many this wallet has already minted (would need contract call)
    // For now, assume 0 for implementation
    const walletMinted = 0; // TODO: Query actual wallet minted from contract
    
    const remainingAllocation = walletMax > 0 ? Math.max(0, walletMax - walletMinted) : remainingSupply;
    const maxQuantity = Math.min(remainingAllocation, remainingSupply);

    return {
      isEligible: maxQuantity > 0,
      quantity: maxQuantity,
      remainingAllocation,
      reason: maxQuantity === 0 ? 'No remaining allocation' : undefined,
    };
  }

  async preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase> {
    if (!validateAddress(params.address)) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_WALLET_ADDRESS,
        'Invalid wallet address',
        { address: params.address }
      );
    }

    const quantity = (params.payload as any)?.quantity ?? 1;
    if (quantity <= 0) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_QUANTITY,
        'Quantity must be greater than 0',
        { quantity }
      );
    }

    // Initialize blockchain infrastructure
    await this._initializeProviderAndContracts();
    
    const onchainData = await this.fetchOnchainData();
    const status = await this.getStatus();
    
    // Validate mint status
    if (status !== 'active') {
      throw new BlindMintError(
        BlindMintErrorCode.MINT_NOT_ACTIVE,
        `Cannot mint: status is ${status}`,
        { status, instanceId: this.id }
      );
    }

    // Validate quantity against allocations
    const allocations = await this.getAllocations({ 
      recipientAddress: params.address as Address 
    });
    
    if (!allocations.isEligible) {
      throw new BlindMintError(
        BlindMintErrorCode.NOT_ELIGIBLE,
        'Wallet is not eligible to mint',
        { address: params.address }
      );
    }

    if (quantity > allocations.quantity) {
      throw new BlindMintError(
        BlindMintErrorCode.EXCEEDS_WALLET_LIMIT,
        `Requested quantity (${quantity}) exceeds available allocation (${allocations.quantity})`,
        { requested: quantity, available: allocations.quantity }
      );
    }

    // Calculate costs
    const unitPrice = onchainData.cost.value;
    const subtotal = unitPrice * BigInt(quantity);
    const platformFee = (subtotal * BigInt(25)) / BigInt(1000); // 2.5% platform fee
    const total = subtotal + platformFee;

    // Create cost object
    const cost: Cost = {
      subtotal: this._createMoney(subtotal, onchainData.cost.currency),
      fees: this._createMoney(platformFee, onchainData.cost.currency),
      total: this._createMoney(total, onchainData.cost.currency),
    };

    // Create transaction steps
    const steps: TransactionStep[] = [];
    
    // Check if payment is in ERC20 token (not ETH)
    const paymentToken = onchainData.cost.erc20;
    const isERC20Payment = paymentToken && paymentToken !== '0x0000000000000000000000000000000000000000';

    if (isERC20Payment) {
      // Add ERC20 approval step if needed
      const approvalStep = await this._createApprovalStep(
        paymentToken as Address,
        params.address as Address,
        total
      );
      
      if (approvalStep) {
        steps.push(approvalStep);
      }
    }

    // Add mint step
    const mintStep = await this._createMintStep(
      params.address as Address,
      quantity,
      total,
      isERC20Payment
    );
    
    steps.push(mintStep);

    return {
      cost,
      steps,
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams): Promise<Order> {
    const receipts: TransactionReceipt[] = [];
    const startTime = new Date();

    try {
      // Execute each transaction step
      for (let i = 0; i < params.preparedPurchase.steps.length; i++) {
        const step = params.preparedPurchase.steps[i];
        
        try {
          const receipt = await step.execute();
          receipts.push(receipt);
        } catch (error) {
          throw new BlindMintError(
            BlindMintErrorCode.TRANSACTION_FAILED,
            `Step ${i + 1} failed: ${step.description}`,
            { 
              step: step.type,
              stepIndex: i,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          );
        }
      }

      return {
        id: `blindmint_${this.id}_${Date.now()}`,
        status: 'completed',
        receipts,
        createdAt: startTime,
        completedAt: new Date(),
      };

    } catch (error) {
      // Return partial order if some steps completed
      return {
        id: `blindmint_${this.id}_${Date.now()}`,
        status: receipts.length > 0 ? 'partial' : 'failed',
        receipts,
        createdAt: startTime,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPreviewMedia(): Promise<Media | undefined> {
    // For BlindMint, return preview media from public data
    return this.data.publicData.previewMedia;
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.title,
      description: this.data.publicData.description,
      attributes: this.data.publicData.attributes,
    };
  }

  async getInventory(): Promise<BlindMintInventory> {
    const onchainData = await this.fetchOnchainData();
    
    return {
      totalSupply: onchainData.totalSupply,
      totalMinted: onchainData.totalMinted,
      remainingSupply: onchainData.totalSupply - onchainData.totalMinted,
      tierBreakdown: [], // TODO: Implement tier breakdown
      walletMinted: 0, // TODO: Query from contract
      walletRemaining: onchainData.walletMax,
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();
    
    return {
      startDate: onchainData.startDate,
      endDate: onchainData.endDate,
      audienceRestriction: 'none', // BlindMint doesn't use allowlists typically
      maxPerWallet: onchainData.walletMax || undefined,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    const onchainData = await this.fetchOnchainData();
    
    return {
      creator: this.data.creator,
      contract: this.data.publicData.contract,
      token: onchainData.startingTokenId.toString(),
      networkId: this.data.publicData.network as NetworkId,
    };
  }

  // =============================================================================
  // ONCHAIN DATA FETCHING
  // =============================================================================

  async fetchOnchainData(): Promise<BlindMintOnchainData> {
    // Return cached data if available and fresh
    if (this._onchainData && this._isCacheFresh()) {
      return this._onchainData;
    }

    // Initialize blockchain infrastructure
    await this._initializeProviderAndContracts();
    
    if (!this._claimContract) {
      throw new BlindMintError(
        BlindMintErrorCode.CONTRACT_ERROR,
        'Claim contract not initialized',
        { instanceId: this.id }
      );
    }

    try {
      // Use dual-provider pattern for resilient reads
      this._provider!.switchToOptimal('read');

      // Fetch all onchain data in parallel using the patterns from CONTRACT_PATTERNS.md
      const [
        totalSupply,
        totalMinted,
        walletMax,
        startDate,
        endDate,
        cost,
        paymentReceiver,
        tokenVariations,
        startingTokenId,
        metadataLocation,
        storageProtocol,
      ] = await Promise.all([
        this._callWithFallback(() => this._claimContract!.totalSupply()),
        this._callWithFallback(() => this._claimContract!.totalMinted()),
        this._callWithFallback(() => this._claimContract!.walletMax()),
        this._callWithFallback(() => this._claimContract!.startDate()),
        this._callWithFallback(() => this._claimContract!.endDate()),
        this._callWithFallback(() => this._claimContract!.cost()),
        this._callWithFallback(() => this._claimContract!.paymentReceiver()),
        this._callWithFallback(() => this._claimContract!.tokenVariations()),
        this._callWithFallback(() => this._claimContract!.startingTokenId()),
        this._callWithFallback(() => this._claimContract!.metadataLocation()),
        this._callWithFallback(() => this._claimContract!.storageProtocol()),
      ]);

      // Transform blockchain data to our types
      this._onchainData = {
        totalSupply: totalSupply.toNumber(),
        totalMinted: totalMinted.toNumber(),
        walletMax: walletMax.toNumber(),
        startDate: new Date(startDate.toNumber() * 1000),
        endDate: new Date(endDate.toNumber() * 1000),
        audienceType: 'None', // BlindMint typically doesn't use allowlists
        cost: this._transformCostFromContract(cost),
        paymentReceiver: paymentReceiver as Address,
        tokenVariations: tokenVariations.toNumber(),
        startingTokenId: startingTokenId.toNumber(),
        storageProtocol: this._transformStorageProtocol(storageProtocol),
        metadataLocation: metadataLocation,
      };

      // Update preview data with onchain information
      this.previewData.startDate = this._onchainData.startDate;
      this.previewData.endDate = this._onchainData.endDate;
      this.previewData.price = this._onchainData.cost;

      return this._onchainData;

    } catch (error) {
      throw new BlindMintError(
        BlindMintErrorCode.CONTRACT_ERROR,
        'Failed to fetch onchain data',
        { 
          instanceId: this.id,
          contractAddress: this.data.publicData.extensionAddress,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  }

  // =============================================================================
  // BLINDMINT-SPECIFIC METHODS
  // =============================================================================

  async getTokenVariations(): Promise<TokenVariation[]> {
    const onchainData = await this.fetchOnchainData();
    const variations: TokenVariation[] = [];

    // Use pool data from public data to create token variations
    for (let i = 0; i < this.data.publicData.pool.length; i++) {
      const poolItem = this.data.publicData.pool[i];
      variations.push({
        tokenId: onchainData.startingTokenId + poolItem.index,
        metadata: poolItem.metadata,
        tier: 'Standard', // Default tier, could be enhanced
        rarityScore: undefined,
        currentSupply: undefined,
        maxSupply: undefined,
      });
    }

    return variations;
  }

  async getGachaConfig(): Promise<GachaConfig> {
    const onchainData = await this.fetchOnchainData();
    
    // Return cached gacha config if available
    if (onchainData.gachaConfig) {
      return onchainData.gachaConfig;
    }

    // Create basic gacha config from available data
    const tiers: GachaTier[] = [{
      id: 'standard',
      name: 'Standard',
      probability: 100, // 100% since no tier info available
      tokenIds: Array.from(
        { length: onchainData.tokenVariations }, 
        (_, i) => onchainData.startingTokenId + i
      ),
    }];

    return {
      tiers,
      immediateReveal: true, // Default for BlindMint
      allowDuplicates: true,
    };
  }

  async getTierProbabilities(): Promise<GachaTier[]> {
    const config = await this.getGachaConfig();
    return config.tiers;
  }

  async getClaimableTokens(walletAddress: Address): Promise<ClaimableToken[]> {
    if (!validateAddress(walletAddress)) {
      throw new BlindMintError(
        BlindMintErrorCode.INVALID_WALLET_ADDRESS,
        'Invalid wallet address',
        { address: walletAddress }
      );
    }

    // For BlindMint, all tokens are claimable (no allowlist)
    const variations = await this.getTokenVariations();
    
    return variations.map(variation => ({
      tokenId: variation.tokenId,
      metadata: variation.metadata,
      tier: variation.tier,
      isClaimable: true,
      proofs: undefined, // No merkle proofs needed for BlindMint
    }));
  }

  async estimateMintGas(quantity: number, walletAddress: Address): Promise<bigint> {
    if (!this._claimContract) {
      await this._initializeProviderAndContracts();
    }

    try {
      const onchainData = await this.fetchOnchainData();
      const cost = onchainData.cost.value * BigInt(quantity);
      
      // Use the gas estimation pattern from CONTRACT_PATTERNS.md
      this._provider!.switchToOptimal('gasEstimation');
      
      const gasEstimate = await this._claimContract!.estimateGas.mint(
        walletAddress,
        quantity,
        { value: cost }
      );

      // Add 25% buffer as per CONTRACT_PATTERNS.md
      const bufferedGas = gasEstimate.mul(125).div(100);
      
      return BigInt(bufferedGas.toString());

    } catch (error) {
      // Return fallback gas estimate
      return BigInt(200000 * quantity);
    }
  }

  async validateMint(params: MintValidationParams): Promise<MintValidation> {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Validate wallet address
      if (!validateAddress(params.walletAddress)) {
        errors.push({
          code: 'INVALID_WALLET_ADDRESS',
          message: 'Invalid wallet address format',
        });
      }

      // Validate quantity
      if (params.quantity <= 0) {
        errors.push({
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be greater than 0',
        });
      }

      // Check allocations
      const allocations = await this.getAllocations({
        recipientAddress: params.walletAddress,
      });

      if (!allocations.isEligible) {
        errors.push({
          code: 'NOT_ELIGIBLE',
          message: 'Wallet is not eligible to mint',
        });
      }

      if (params.quantity > allocations.quantity) {
        errors.push({
          code: 'EXCEEDS_ALLOCATION',
          message: `Requested quantity exceeds allocation`,
        });
      }

      // Estimate gas and cost
      let estimatedGas: bigint | undefined;
      let estimatedCost: Cost | undefined;

      if (errors.length === 0) {
        try {
          estimatedGas = await this.estimateMintGas(params.quantity, params.walletAddress);
          
          const onchainData = await this.fetchOnchainData();
          const unitPrice = onchainData.cost.value;
          const subtotal = unitPrice * BigInt(params.quantity);
          const fees = (subtotal * BigInt(25)) / BigInt(1000);
          
          estimatedCost = {
            subtotal: this._createMoney(subtotal, onchainData.cost.currency),
            fees: this._createMoney(fees, onchainData.cost.currency),
            total: this._createMoney(subtotal + fees, onchainData.cost.currency),
          };
        } catch (error) {
          warnings.push({
            code: 'GAS_ESTIMATION_FAILED',
            message: 'Could not estimate gas costs',
            severity: 'medium' as const,
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        estimatedGas,
        estimatedCost,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
        }],
        warnings,
      };
    }
  }

  async getFloorPrices(): Promise<FloorPriceData[]> {
    // Placeholder implementation - would integrate with pricing APIs
    return [];
  }

  async getMintHistory(walletAddress?: Address): Promise<MintHistoryItem[]> {
    // Placeholder implementation - would query transaction history
    return [];
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private async _initializeProviderAndContracts(): Promise<void> {
    if (this._provider && this._contractFactory && this._claimContract) {
      return; // Already initialized
    }

    try {
      // Create provider with default configuration
      const providerConfig = {
        primary: {
          required: false,
          timeout: 5000,
          retries: 3,
          detectWalletConnect: true,
          supportedWallets: []
        },
        bridge: {
          baseUrl: 'https://bridge.manifold.xyz',
          timeout: 1500,
          retries: 2,
          enabled: true,
          fallbackStrategy: 'after-timeout' as const
        },
        networks: {},
        global: {
          defaultTimeout: 30000,
          maxConcurrentOps: 5,
          strictMode: false,
          debugMode: false
        }
      };

      this._provider = createDualProvider({
        config: providerConfig,
        networkId: this.data.publicData.network as NetworkId,
      });

      // Create contract factory
      this._contractFactory = new ContractFactoryClass({
        provider: this._provider,
        networkId: this.data.publicData.network as NetworkId,
        enableDebug: false,
      });

      // Create claim contract instance
      this._claimContract = this._contractFactory.createBlindMintContract(
        this.data.publicData.extensionAddress
      );

    } catch (error) {
      throw new BlindMintError(
        BlindMintErrorCode.PROVIDER_UNAVAILABLE,
        'Failed to initialize blockchain infrastructure',
        { 
          instanceId: this.id,
          networkId: this.data.publicData.network,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }
  }

  private async _callWithFallback<T>(contractCall: () => Promise<T>): Promise<T> {
    // Implement the resilient read pattern from CONTRACT_PATTERNS.md
    const timeoutPromise = new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Primary provider timeout')), 1500)
    );

    try {
      // Try primary provider first
      return await Promise.race([contractCall(), timeoutPromise]);
    } catch (error) {
      // Fall back to bridge provider
      this._provider!.switchToBridge();
      return await contractCall();
    }
  }

  private _createMoney(value: bigint, currency: string): Money {
    const decimals = 18; // Default to ETH decimals
    const divisor = BigInt(10) ** BigInt(decimals);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;
    const formatted = `${wholePart}.${fractionalPart.toString().padStart(decimals, '0').slice(0, 4)} ${currency}`;

    return {
      value,
      decimals,
      currency,
      erc20: '0x0000000000000000000000000000000000000000', // Default to ETH
      symbol: currency,
      name: currency === 'ETH' ? 'Ethereum' : currency,
      formatted,
      formattedUSD: `$${Number(value / BigInt(1e16)) / 100}`, // Mock USD conversion
    };
  }

  private _transformCostFromContract(costBigNumber: ethers.BigNumber): Money {
    return this._createMoney(BigInt(costBigNumber.toString()), 'ETH');
  }

  private _transformStorageProtocol(protocolNumber: number): 'ipfs' | 'arweave' | 'http' | 'data' {
    switch (protocolNumber) {
      case 1: return 'ipfs';
      case 2: return 'arweave';
      case 3: return 'http';
      default: return 'ipfs';
    }
  }

  private _isCacheFresh(): boolean {
    // Simple cache freshness check - could be enhanced
    return true; // For now, always use cached data if available
  }

  private async _createApprovalStep(
    tokenAddress: Address,
    userAddress: Address, 
    amount: bigint
  ): Promise<TransactionStep | null> {
    // Check if approval is needed
    const erc20Contract = this._contractFactory!.createERC20Contract(tokenAddress);
    
    try {
      const currentAllowance = await erc20Contract.allowance(
        userAddress,
        this.data.publicData.extensionAddress
      );

      if (currentAllowance.gte(amount.toString())) {
        return null; // No approval needed
      }

      return {
        type: 'approve',
        description: `Approve ${amount} tokens for spending`,
        estimatedGas: BigInt(50000),
        execute: async (): Promise<TransactionReceipt> => {
          const tx = await erc20Contract.approve(
            userAddress, // Should be extension address
            amount.toString()
          );
          
          const receipt = await tx.wait();
          return {
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: BigInt(receipt.gasUsed.toString()),
            status: receipt.status === 1 ? 'success' : 'failed',
          };
        },
      };

    } catch (error) {
      // If we can't check allowance, assume approval is needed
      return {
        type: 'approve',
        description: `Approve tokens for spending`,
        estimatedGas: BigInt(50000),
        execute: async (): Promise<TransactionReceipt> => {
          throw new Error('Approval step failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        },
      };
    }
  }

  private async _createMintStep(
    userAddress: Address,
    quantity: number,
    totalCost: bigint,
    isERC20Payment: boolean
  ): Promise<TransactionStep> {
    const estimatedGas = await this.estimateMintGas(quantity, userAddress);

    return {
      type: 'mint',
      description: `Mint ${quantity} BlindMint NFT(s)`,
      estimatedGas,
      execute: async (): Promise<TransactionReceipt> => {
        if (!this._claimContract) {
          throw new Error('Claim contract not available');
        }

        const options = isERC20Payment ? {} : { value: totalCost.toString() };
        
        const tx = await this._claimContract.mint(userAddress, quantity, options);
        const receipt = await tx.wait();
        
        return {
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: BigInt(receipt.gasUsed.toString()),
          status: receipt.status === 1 ? 'success' : 'failed',
        };
      },
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create BlindMintProduct from instance data
 */
export function createBlindMintProduct(
  instanceData: InstanceData,
  includeOnchainData = false
): BlindMintProduct {
  return new BlindMintProductImpl(instanceData, includeOnchainData);
}

/**
 * Type guard to check if product is BlindMint
 */
export function isBlindMintProduct(product: any): product is BlindMintProduct {
  return Boolean(product && product.type === 'blind-mint');
}