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
  EditionPayload,
  PreparedPurchase,
  TransactionStep,
  TransactionStepExecuteOptions,
  GasBuffer,
  IAccount,
  UniversalTransactionRequest,
  EditionPublicData,
  EditionOnchainData,
  ProductStatus,
  ProductInventory,
  AudienceType,
  EditionProduct as IEditionProduct,
  Contract,
} from '../types';
import { AppType, AppId } from '../types/common';
import type {
  ClaimableMerkleInfo,
  EditionClaimData,
  EditionClaimContract,
  ERC721ClaimData,
  ERC1155ClaimData,
} from '../types/edition';
import * as ethers from 'ethers';

import { createProvider } from '../utils/provider-factory';
import { ContractFactory as ContractFactoryClass } from '../utils/contract-factory';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client';
import manifoldApiClient from '../api/manifold-api';
import { estimateGas } from '../utils/gas-estimation';
import { Money } from '../libs/money';
import type { Cost } from '../types/money';
import type { TransactionReceipt } from '../types/purchase';

// EditionSpec import removed - not needed after refactoring

/**
 * Edition product implementation for standard NFT mints.
 *
 * Edition products allow creators to sell fixed or open edition NFTs
 * with optional allowlists, redemption codes, and pricing tiers.
 * Supports both ERC721 and ERC1155 token standards.
 *
 * @remarks
 * - Follows technical spec CON-2792
 * - Uses Edition claim contracts for minting
 * - Supports allowlist validation with merkle proofs
 * - Handles both public and allowlist sales
 *
 * @public
 */
export class EditionProduct implements IEditionProduct {
  /**
   * Unique instance ID for this product.
   */
  readonly id: number;

  /**
   * Product type identifier (always EDITION).
   */
  readonly type = AppType.EDITION;

  /**
   * Off-chain product data including metadata and configuration.
   */
  readonly data: InstanceData<EditionPublicData>;

  /**
   * Preview data for display purposes.
   */
  readonly previewData: InstancePreview;

  /**
   * On-chain data (pricing, supply, etc.). Populated after calling fetchOnchainData().
   */
  onchainData?: EditionOnchainData;

  // Internal state
  private _httpRPCs?: Record<number, string>;

  /**
   * Creates a new EditionProduct instance.
   *
   * @param instanceData - Product instance data from the API
   * @param previewData - Preview data for the product
   * @param options - Configuration options
   * @param options.httpRPCs - Custom RPC endpoints by network ID
   *
   * @throws {ClientSDKError} If the app ID doesn't match EDITION
   *
   * @internal
   */
  constructor(
    instanceData: InstanceData<EditionPublicData>,
    previewData: InstancePreview,
    options: {
      httpRPCs?: Record<number, string>;
    } = {},
  ) {
    const { httpRPCs } = options;
    this._httpRPCs = httpRPCs;

    // Validate app ID
    if (instanceData.appId !== AppId.EDITION) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Invalid app ID for Edition. Expected ${AppId.EDITION}, received ${instanceData.appId}`,
        { instanceId: String(instanceData.id) },
      );
    }

    // Store instance data with properly typed publicData
    this.data = instanceData;
    this.previewData = previewData;

    this.id = instanceData.id;
  }

  // =============================================================================
  // ONCHAIN DATA FETCHING
  // =============================================================================

  /**
   * Fetches and caches on-chain data for the Edition product.
   *
   * Retrieves information including:
   * - Total supply and minted count
   * - Wallet limits
   * - Pricing information
   * - Start and end dates
   * - Allowlist configuration
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
  async fetchOnchainData(force = false): Promise<EditionOnchainData> {
    if (this.onchainData && !force) {
      return this.onchainData;
    }

    try {
      const contract = this._getClaimContract();

      // Use getClaim method to fetch claim data
      const claimData = await contract.getClaim(this._creatorContract, this.id);

      // Fetch platform fees from contract first
      const networkId = this.data.publicData.network;
      const provider = createProvider({
        networkId,
        customRpcUrls: this._httpRPCs,
      });

      // Fetch standard mint fee
      const mintFee = await contract.MINT_FEE();
      const platformFee = await Money.create({
        value: mintFee,
        networkId,
        provider,
        fetchUSD: true,
      });

      // Fetch merkle mint fee (for allowlist mints)
      const merkleMintFee = await contract.MINT_FEE_MERKLE();
      const merklePlatformFee = await Money.create({
        value: merkleMintFee,
        networkId,
        provider,
        fetchUSD: true,
      });

      // Process into EditionOnchainData format with platform fees
      const onchainData = await this._processClaimData(claimData, platformFee, merklePlatformFee);

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
   * Prepares a purchase transaction for the Edition product.
   *
   * This method:
   * - Validates eligibility (wallet limits, supply, dates, allowlist)
   * - Calculates total cost including gas
   * - Generates transaction data with merkle proofs if needed
   * - Returns prepared transaction steps
   *
   * @param params - Purchase preparation parameters
   * @param params.address - Wallet address making the purchase
   * @param params.recipientAddress - Optional different recipient address
   * @param params.payload - Purchase payload
   * @param params.payload.quantity - Number of tokens to mint (default: 1)
   * @param params.payload.redemptionCode - Optional redemption code
   * @param params.networkId - Optional network ID for cross-chain purchases
   * @param params.gasBuffer - Optional gas buffer configuration
   * @param params.account - Optional, if provided will check if account has sufficient balance to purchase
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
  async preparePurchase(params: PreparePurchaseParams<EditionPayload>): Promise<PreparedPurchase> {
    const { address, payload, account } = params;
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
    if (allocations.quantity !== null && quantity > allocations.quantity) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Quantity exceeds available allocation');
    }

    const onchainData = await this.fetchOnchainData();
    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });

    // Calculate costs
    const productCost = onchainData.cost.multiplyInt(quantity);

    // Use merkle platform fee for allowlist mints, standard fee otherwise
    const isAllowlistMint = onchainData.audienceType === 'Allowlist';
    const feePerMint = isAllowlistMint ? onchainData.merklePlatformFee : onchainData.platformFee;

    const platformFee = feePerMint.multiplyInt(quantity);

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
            execute: async (account: IAccount, options?: TransactionStepExecuteOptions) => {
              await account.switchNetwork(networkId);
              const address = await account.getAddress();
              const gasEstimate = await estimateGas({
                contract: erc20Contract,
                method: 'approve',
                args: [this._extensionAddress, totalCost.raw],
                from: address,
                fallbackGas: ethers.BigNumber.from(200000),
              });

              const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();

              const txRequest: UniversalTransactionRequest = {
                to: tokenAddress,
                data: this._buildApprovalData(this._extensionAddress, totalCost.raw.toString()),
                gasLimit,
                chainId: networkId,
              };

              const confirmation = await account.sendTransactionWithConfirmation(txRequest, {
                confirmations: options?.confirmations || 1,
              });

              const receiptInfo = confirmation.receipt;
              const blockNumber = receiptInfo?.blockNumber ?? confirmation.blockNumber;
              const gasUsedValue = receiptInfo?.gasUsed ?? confirmation.gasUsed;

              return {
                networkId,
                step: approvalStep.id,
                txHash: confirmation.hash,
                blockNumber,
                gasUsed: gasUsedValue ? BigInt(gasUsedValue) : undefined,
              };
            },
          };

          steps.push(approvalStep);
        }
      } else {
        let nativeBalance;
        /**
         * If account is provided, use it to check native balance. (Optimal for cases where account a browser wallet)
         * Otherwise, try fetching from the provider directly. (Either from provided JSON-RPC or Manifold Bridge)
         */
        // Check native balance using provider
        if (account) {
          nativeBalance = await account.getBalance(networkId);
        } else {
          // Try getting from available provider
          try {
            const rawBalance = await provider.getBalance(walletAddress);
            nativeBalance = await Money.create({
              value: rawBalance,
              networkId,
              provider,
              fetchUSD: true,
            });
          } catch (e) {
            console.warn('Unable to fetch native balance from provider, skipping balance check.');
          }
        }
        if (nativeBalance && nativeBalance.isLessThan(totalCost)) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${nativeBalance.formatted}`,
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

    // Generate merkle proofs if needed for allowlist
    const { mintIndices, merkleProofs } = await this._generateMintProofs(walletAddress, quantity);

    const mintStep: TransactionStep = {
      id: 'mint',
      name: 'Mint Edition NFTs',
      type: 'mint',
      description: `Mint ${quantity} NFT(s)`,
      cost: mintCost,
      execute: async (account: IAccount, options?: TransactionStepExecuteOptions) => {
        // This will handle network switch and adding custom network to user wallet if needed
        await account.switchNetwork(networkId);
        const address = await account.getAddress();
        const editionContract = this._getClaimContract();

        const gasEstimate = await estimateGas({
          contract: editionContract,
          method: 'mintProxy',
          args: [this._creatorContract, this.id, quantity, mintIndices, merkleProofs, address],
          from: address,
          value: nativePaymentValue,
        });

        const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();
        const txRequest: UniversalTransactionRequest = {
          to: this._extensionAddress,
          data: this._buildMintData(
            this._creatorContract,
            this.id,
            quantity,
            mintIndices,
            merkleProofs,
            address,
          ),
          value: nativePaymentValue.toString(),
          gasLimit,
          chainId: networkId,
        };

        const confirmation = await account.sendTransactionWithConfirmation(txRequest, {
          confirmations: options?.confirmations || 1,
        });

        const receiptInfo = confirmation.receipt;
        const blockNumber = receiptInfo?.blockNumber ?? confirmation.blockNumber;
        const gasUsedValue = receiptInfo?.gasUsed ?? confirmation.gasUsed;

        return {
          networkId,
          step: mintStep.id,
          txHash: confirmation.hash,
          blockNumber,
          gasUsed: gasUsedValue ? BigInt(gasUsedValue) : undefined,
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
    const { account, preparedPurchase } = params;
    const walletAddress = await account.getAddress();

    // Execute all steps sequentially
    const receipts: TransactionReceipt[] = [];

    for (const step of preparedPurchase.steps) {
      try {
        const receipt = await step.execute(account);
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

  /**
   * Get the contract information
   */
  private get contract(): Contract {
    return this.data.publicData.contract;
  }

  /**
   * Get the creator contract address
   */
  private get _creatorContract(): string {
    return this.data.publicData.contract.contractAddress;
  }

  /**
   * Get the extension address (alias for consistency)
   */
  private get _extensionAddress(): string {
    if (this.contract.spec.toLowerCase() === 'erc721') {
      return this.data.publicData.extensionAddress721.value;
    }
    if (this.contract.spec.toLowerCase() === 'erc1155') {
      return this.data.publicData.extensionAddress1155.value;
    }
    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      `Unsupported contract spec: ${this.contract.spec}`,
    );
  }

  private _getClaimContract() {
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

    return this.data.publicData.contract.spec.toLowerCase() === 'erc721'
      ? factory.createEditionContract(this._extensionAddress)
      : factory.createEdition1155Contract(this._extensionAddress);
  }

  private async _processClaimData(
    claimData: EditionClaimData,
    platformFee: Money,
    merklePlatformFee: Money,
  ): Promise<EditionOnchainData> {
    // Convert dates from unix seconds
    const convertDate = (unixSeconds: number): Date => {
      return new Date(unixSeconds * 1000);
    };

    const networkId = this.data.publicData.network;
    const provider = createProvider({
      networkId,
      customRpcUrls: this._httpRPCs,
    });

    // Create Money object which will fetch all metadata automatically
    const costMoney = await Money.create({
      value: claimData.cost,
      networkId,
      erc20: claimData.erc20,
      provider,
      fetchUSD: true,
    });

    // Determine audience type based on merkle root
    let audienceType: AudienceType = 'None';
    if (claimData.merkleRoot && claimData.merkleRoot !== ethers.constants.HashZero) {
      audienceType = 'Allowlist';
    }

    const isERC721 = this.contract.spec.toLowerCase() === 'erc721';

    // Build the base onchain data
    const baseData = {
      totalMax: claimData.totalMax === 0 ? null : claimData.totalMax,
      total: claimData.total || 0,
      walletMax: claimData.walletMax === 0 ? null : claimData.walletMax,
      startDate: claimData.startDate ? convertDate(claimData.startDate) : null,
      endDate: claimData.endDate ? convertDate(claimData.endDate) : null,
      audienceType,
      cost: costMoney,
      platformFee,
      merklePlatformFee,
      signingAddress: claimData.signingAddress,
      location: claimData.location,
      merkleRoot: claimData.merkleRoot,
      paymentReceiver: claimData.paymentReceiver,
      storageProtocol: claimData.storageProtocol,
    };

    // Return the appropriate type based on contract spec
    if (isERC721) {
      // Type assertion safe due to isERC721 check matching contract type
      return {
        ...baseData,
        identical: (claimData as ERC721ClaimData).identical ?? false,
      };
    } else {
      return {
        ...baseData,
        tokenId: (claimData as ERC1155ClaimData).tokenId?.toString() ?? '0',
      };
    }
  }

  private async _fetchClaimableMerkleInfo(
    _merkleTreeId: number,
    _walletAddress: string,
    _contract: EditionClaimContract,
  ): Promise<ClaimableMerkleInfo> {
    const merkleInfo = await manifoldApiClient.studioClient.public.getMerkleInfo({
      merkleTreeId: _merkleTreeId,
      address: _walletAddress,
      appId: AppId.EDITION,
    });

    const mintIndices = merkleInfo
      .filter((info) => info.value !== undefined)
      .map((claimMerkleInfo) => claimMerkleInfo.value as number);
    const mintIndicesStatus = await _contract.checkMintIndices(
      this.contract.contractAddress,
      this.id,
      mintIndices,
    );
    const claimableMerkleInfo = merkleInfo.filter(
      (info, index) => info.value !== undefined && !mintIndicesStatus[index],
    );

    return {
      merkleProofs: claimableMerkleInfo.map((claimMerkleInfo) => claimMerkleInfo.merkleProof),
      mintIndices: claimableMerkleInfo.map((claimMerkleInfo) => claimMerkleInfo.value as number),
      isInAllowlist: merkleInfo.length > 0,
    };
  }

  private async _generateMintProofs(
    walletAddress: string,
    quantity: number,
  ): Promise<{ mintIndices: number[]; merkleProofs: string[][] }> {
    const onchainData = await this.fetchOnchainData();

    // If no allowlist (merkle root is zero), return empty arrays
    if (onchainData.audienceType !== 'Allowlist') {
      return { mintIndices: [], merkleProofs: [] };
    }

    // For allowlist mints, fetch claimable merkle info
    if (this.data.publicData.instanceAllowlist?.merkleTreeId) {
      const contract = this._getClaimContract();
      const claimableMerkleInfo = await this._fetchClaimableMerkleInfo(
        this.data.publicData.instanceAllowlist.merkleTreeId,
        walletAddress,
        contract,
      );
      return {
        mintIndices: claimableMerkleInfo.mintIndices.slice(0, quantity),
        merkleProofs: claimableMerkleInfo.merkleProofs.slice(0, quantity),
      };
    }

    // Default to empty arrays
    return { mintIndices: [], merkleProofs: [] };
  }

  // =============================================================================
  // PRODUCT INTERFACE IMPLEMENTATION
  // =============================================================================

  async getStatus(): Promise<ProductStatus> {
    const onchainData = await this.fetchOnchainData();
    const now = Date.now();

    // Access totalMax and total from the base properties
    const totalSupply = 'totalMax' in onchainData ? onchainData.totalMax : 0;
    const totalMinted = 'total' in onchainData ? onchainData.total : 0;
    if (onchainData.startDate && now < onchainData.startDate.getTime()) {
      return 'upcoming';
    }
    if (onchainData.endDate && now > onchainData.endDate.getTime()) {
      return 'ended';
    }
    if (totalSupply && totalMinted >= totalSupply) {
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
    const contract = this._getClaimContract();

    // Calculate total available supply
    const totalSupply = onchainData.totalMax || Infinity;
    const total = onchainData.total;
    const availableSupply = Math.max(0, totalSupply - total);

    let availableForWallet = Infinity;
    let isOnAllowlist = false;
    let hasWalletMax = false;

    // Handle allowlist mints following claim-widgets pattern
    if (
      onchainData.audienceType === 'Allowlist' &&
      this.data.publicData.instanceAllowlist?.merkleTreeId
    ) {
      // Fetch claimable merkle info from Manifold API
      const claimableMerkleInfo = await this._fetchClaimableMerkleInfo(
        this.data.publicData.instanceAllowlist.merkleTreeId,
        recipientAddress,
        contract,
      );
      isOnAllowlist = claimableMerkleInfo.isInAllowlist;
      availableForWallet = claimableMerkleInfo.mintIndices.length;
    } else if (onchainData.walletMax && onchainData.walletMax > 0) {
      // Check wallet max for public sales
      hasWalletMax = true;
      const totalMinted = await contract.getTotalMints(
        recipientAddress,
        this.contract.contractAddress,
        this.id,
      );
      availableForWallet = Math.max(0, onchainData.walletMax - totalMinted);
    }

    // Return minimum of supply and wallet availability
    const quantity = Math.min(availableSupply, availableForWallet);

    // Determine the reason for quantity being 0
    let reason: string | undefined;
    if (quantity === 0) {
      if (isOnAllowlist && availableForWallet === 0) {
        reason = 'You have used up all your allotted slots';
      } else if (hasWalletMax && availableForWallet === 0) {
        reason = 'You have reached the maximum per wallet';
      } else if (onchainData.audienceType === 'Allowlist' && !isOnAllowlist) {
        reason = 'You are not on the allowlist';
      } else {
        reason = 'No mints available';
      }
    }

    return {
      isEligible: quantity > 0,
      quantity: quantity === Infinity ? null : quantity, // null indicates no limit
      reason,
    };
  }

  // =============================================================================
  // OTHER PRODUCT METHODS
  // =============================================================================

  async getInventory(): Promise<ProductInventory> {
    const onchainData = await this.fetchOnchainData();
    const totalMax = 'totalMax' in onchainData ? onchainData.totalMax : 0;
    const total = 'total' in onchainData ? onchainData.total : 0;
    return {
      totalSupply: totalMax === null || totalMax === Number.MAX_SAFE_INTEGER ? -1 : totalMax,
      totalPurchased: total,
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();

    const audienceRestriction: AudienceRestriction =
      onchainData.audienceType === 'Allowlist' ? 'allowlist' : 'none';

    return {
      startDate: onchainData.startDate || undefined,
      endDate: onchainData.endDate || undefined,
      audienceRestriction,
      maxPerWallet: onchainData.walletMax || undefined,
    };
  }

  async getProvenance(): Promise<ProductProvenance> {
    return {
      creator: {
        id: this.data.creator.id.toString(),
        slug: this.data.creator.slug || '',
        address: this.data.creator.address || '',
        name: this.data.creator.name,
      },
      contract: this.contract,
      networkId: this.data.publicData.network,
    };
  }

  async getMetadata(): Promise<ProductMetadata> {
    return {
      name: this.data.publicData.title || this.previewData.title || '',
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
  // HELPER METHODS
  // =============================================================================

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
  private _buildMintData(
    creatorContract: string,
    instanceId: number,
    mintCount: number,
    mintIndices: number[],
    merkleProofs: string[][],
    mintFor: string,
  ): string {
    // Using the mintProxy function signature from the Edition contract
    const mintInterface = new ethers.utils.Interface([
      'function mintProxy(address creatorContractAddress, uint256 instanceId, uint16 mintCount, uint32[] mintIndices, bytes32[][] merkleProofs, address mintFor)',
    ]);
    return mintInterface.encodeFunctionData('mintProxy', [
      creatorContract,
      instanceId,
      mintCount,
      mintIndices,
      merkleProofs,
      mintFor,
    ]);
  }
}

// Type guard
export function isEditionProduct(product: Product): product is IEditionProduct {
  return product?.type === AppType.EDITION;
}
