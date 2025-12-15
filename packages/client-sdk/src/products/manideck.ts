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
  TransactionStep,
  TransactionStepExecuteOptions,
  IAccount,
  GasBuffer,
  UniversalTransactionRequest,
  UniversalTransactionResponse,
  TransactionReceipt,
  Cost,
} from '../types';
import type { Address } from '../types/common';
import { AppType, AppId } from '../types/common';

import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { InstancePreview, PublicInstance } from '@manifoldxyz/studio-apps-client-public';
import { Money } from '../libs/money';
import { convertManifoldContractToContract } from '../utils/common';
import { ERC20ABI, GachaExtensionERC1155ABIv2 } from '../abis';
import { estimateGas } from '../utils';
import { ethers } from 'ethers';

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

  // Internal state
  private _platformFee?: Money;
  private readonly _publicProvider: IPublicProvider;

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
    publicProvider: IPublicProvider,
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
    this._publicProvider = publicProvider;
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
  async fetchOnchainData(force = false): Promise<ManiDeckOnchainData> {
    if (this.onchainData && !force) {
      return this.onchainData;
    }

    const contract = await this._getManiDeckContract();

    try {
      // Use getClaim method like gachapon-widgets
      // Using id as claimIndex
      const claimData = await contract.getClaim(this._creatorContract, this.id);

      // Process into ManiDeckOnchainData format
      const onchainData = await this._processManiDeckData(claimData);

      // Fetch platform fee from contract and create Money object
      const mintFee = await contract.MINT_FEE();
      const networkId = this.data.publicData.network;

      this._platformFee = await Money.create({
        value: mintFee,
        networkId,
        fetchUSD: true,
      });

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
   * @params params.account - Optional, if provided will check if account has sufficient balance to purchase
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
    const { userAddress, recipientAddress, payload, account } = params;
    const quantity = payload?.quantity || 1;
    const networkId = this.data.publicData.network;

    const user = account ? await account.getAddress() : userAddress;
    const recipient = recipientAddress || user;

    if (!user || !validateAddress(user)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid wallet address', {
        user,
      });
    }

    if (!recipient || !validateAddress(recipient)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient wallet address', {
        recipientAddress: recipient,
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
    const allocations = await this.getAllocations({ recipientAddress: recipient });
    if (!allocations.isEligible) {
      throw new ClientSDKError(ErrorCode.NOT_ELIGIBLE, allocations.reason || 'Not eligible');
    }
    if (allocations.quantity !== null && quantity > allocations.quantity) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Quantity exceeds available allocation');
    }

    const onchainData = await this.fetchOnchainData();
    // Calculate costs
    const productCost = onchainData.cost.multiplyInt(quantity);
    const platformFee = this._platformFee
      ? this._platformFee.multiplyInt(quantity)
      : await Money.zero({ networkId });

    // Aggregate costs by currency type
    const costsByToken = new Map<string, Money>();

    // Helper to add cost to map
    const addCostToMap = (cost: Money) => {
      if (cost.isPositive()) {
        const key = cost.address;
        const existing = costsByToken.get(key);
        costsByToken.set(key, existing ? existing.add(cost) : cost);
      }
    };

    addCostToMap(productCost);
    addCostToMap(platformFee);

    // Build steps array
    const steps: TransactionStep[] = [];

    // Check balances and create approvals for each token type
    for (const [tokenAddress, totalCost] of Array.from(costsByToken.entries())) {
      if (totalCost.isERC20()) {
        // Read balance and allowance using publicProvider

        const [balance, currentAllowance] = await Promise.all([
          this._publicProvider.readContract<bigint>({
            contractAddress: tokenAddress,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [user],
            networkId,
          }),
          this._publicProvider.readContract<bigint>({
            contractAddress: tokenAddress,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [user, this._extensionAddress],
            networkId,
          }),
        ]);

        if (balance < BigInt(totalCost.raw.toString())) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${ethers.utils.formatUnits(balance, totalCost.decimals)}`,
          );
        }

        if (currentAllowance < BigInt(totalCost.raw.toString())) {
          const gasEstimate = await estimateGas({
            publicProvider: this._publicProvider,
            contractAddress: tokenAddress,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [this._extensionAddress, totalCost.raw],
            from: user,
            networkId,
          });

          const approvalStep: TransactionStep = {
            id: `approve-${totalCost.symbol.toLowerCase()}`,
            name: `Approve ${totalCost.symbol} Spending`,
            type: 'approve',
            description: `Approve ${totalCost.formatted} ${totalCost.symbol}`,
            transactionData: {
              functionName: 'approve',
              abi: [
                {
                  inputs: [
                    { internalType: 'address', name: 'spender', type: 'address' },
                    { internalType: 'uint256', name: 'amount', type: 'uint256' },
                  ],
                  name: 'approve',
                  outputs: [],
                  stateMutability: 'nonpayable',
                  type: 'function',
                },
              ],
              args: [this._extensionAddress, totalCost.raw.toString()],
              value: BigInt('0'),
              contractAddress: tokenAddress,
              transactionData: this._buildApprovalData(
                this._extensionAddress,
                totalCost.raw.toString(),
              ),
              gasEstimate: BigInt(gasEstimate.toString()), // Will be updated with actual estimate
              networkId,
            },
            execute: async (account: IAccount, options?: TransactionStepExecuteOptions) => {
              await account.switchNetwork(networkId);
              const address = await account.getAddress();
              const gasEstimate = await estimateGas({
                publicProvider: this._publicProvider,
                contractAddress: tokenAddress,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [this._extensionAddress, totalCost.raw],
                from: address,
                networkId,
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

              const transactionReceipt = this._buildTransactionReceipt(confirmation, networkId);

              return {
                transactionReceipt,
              };
            },
          };

          steps.push(approvalStep);
        }
      } else {
        // Check native balance using provider
        if (account) {
          const nativeBalance = await account.getBalance(networkId);

          if (nativeBalance && nativeBalance.isLessThan(totalCost)) {
            throw new ClientSDKError(
              ErrorCode.INSUFFICIENT_FUNDS,
              `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${nativeBalance.formatted}`,
            );
          }
        }
      }
    }

    // Calculate native payment value for mint transaction
    const nativePaymentValue = costsByToken.get(ethers.constants.AddressZero)?.raw
      ? BigInt(costsByToken.get(ethers.constants.AddressZero)!.raw.toString())
      : 0n;

    // Build cost breakdown for mint step and enhanced cost
    const nativeCost = costsByToken.get(ethers.constants.AddressZero);
    const erc20Costs = Array.from(costsByToken.entries())
      .filter(([address]) => address !== ethers.constants.AddressZero)
      .map(([, cost]) => cost);

    // Build Cost structure (reuse the already computed values)
    const resolvedNativeCost = nativeCost ?? (await Money.zero({ networkId }));

    const totalUsdValue =
      (productCost.formattedUSD ? parseFloat(productCost.formattedUSD) : 0) +
      (platformFee.formattedUSD ? parseFloat(platformFee.formattedUSD) : 0);

    const cost: Cost = {
      totalUSD: totalUsdValue > 0 ? totalUsdValue.toFixed(2) : '0',
      total: {
        native: resolvedNativeCost,
        erc20s: erc20Costs,
      },
      breakdown: {
        product: productCost,
        platformFee,
      },
    };

    // Build mint step
    const mintCost: { native?: Money; erc20s?: Money[] } = {};
    if (nativeCost) mintCost.native = nativeCost;
    if (erc20Costs.length > 0) mintCost.erc20s = erc20Costs;

    const gasEstimate = await estimateGas({
      publicProvider: this._publicProvider,
      contractAddress: this._extensionAddress,
      abi: GachaExtensionERC1155ABIv2,
      functionName: 'mintReserve',
      args: [this._creatorContract, this.id, quantity],
      from: user,
      networkId,
      value: nativePaymentValue,
    });

    const mintStep: TransactionStep = {
      id: 'mint',
      name: 'Mint BlindMint NFTs',
      type: 'mint',
      description: `Mint ${quantity} random NFT(s)`,
      cost: mintCost,
      transactionData: {
        functionName: 'mintReserve',
        args: [this._creatorContract, this.id, quantity],
        abi: [
          {
            inputs: [
              { internalType: 'address', name: 'creatorContractAddress', type: 'address' },
              { internalType: 'uint256', name: 'instanceId', type: 'uint256' },
              { internalType: 'uint32', name: 'mintCount', type: 'uint32' },
            ],
            name: 'mintReserve',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
          },
        ],
        contractAddress: this._extensionAddress,
        value: BigInt(nativePaymentValue.toString()),
        transactionData: this._buildMintData(this._creatorContract, this.id, quantity),
        gasEstimate: BigInt(gasEstimate.toString()), // Default estimate, will be updated
        networkId,
      },
      execute: async (account: IAccount, options?: TransactionStepExecuteOptions) => {
        // This will handle network switch and adding custom network to user wallet if needed
        await account.switchNetwork(networkId);
        const minterAddress = await account.getAddress();

        const gasEstimate = await estimateGas({
          publicProvider: this._publicProvider,
          contractAddress: this._extensionAddress,
          abi: GachaExtensionERC1155ABIv2,
          functionName: 'mintReserve',
          args: [this._creatorContract, this.id, quantity],
          from: minterAddress,
          networkId,
          value: nativePaymentValue,
        });

        const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();
        const txRequest: UniversalTransactionRequest = {
          to: this._extensionAddress,
          data: this._buildMintData(this._creatorContract, this.id, quantity),
          value: nativePaymentValue.toString(),
          gasLimit,
          chainId: networkId,
        };
        const confirmation = await account.sendTransactionWithConfirmation(txRequest, {
          confirmations: options?.confirmations || 1,
        });
        const transactionReceipt = this._buildTransactionReceipt(confirmation, networkId);

        return {
          transactionReceipt,
        };
      },
    };

    steps.push(mintStep);

    return {
      cost,
      steps,
      isEligible: true,
    };
  }

  async purchase(params: PurchaseParams) {
    const { account, preparedPurchase } = params;

    // Execute all steps sequentially
    const receipts: Receipt[] = [];

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
            receipts: receipts.map((item) => item.transactionReceipt),
            error: error as Error,
          },
        );
      }
    }

    const finalReceipt = receipts[receipts.length - 1];
    if (!finalReceipt) {
      throw new ClientSDKError(ErrorCode.TRANSACTION_FAILED, 'No Receipt found');
    }

    return {
      transactionReceipt: finalReceipt.transactionReceipt,
      order: finalReceipt.order,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================
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

  private _buildTransactionReceipt(
    response: UniversalTransactionResponse,
    networkId: number,
  ): TransactionReceipt {
    const fallbackReceipt = (
      response as {
        receipt?: { blockNumber?: number; gasUsed?: string | number | bigint };
      }
    ).receipt;

    const resolvedBlockNumber =
      response.blockNumber ?? fallbackReceipt?.blockNumber ?? response.logs?.[0]?.blockNumber;

    const rawGasUsed = response.gasUsed ?? fallbackReceipt?.gasUsed ?? undefined;

    const normalizeGasUsed = (value: string | number | bigint | undefined): bigint | undefined => {
      if (value === undefined) {
        return undefined;
      }

      if (typeof value === 'bigint') {
        return value;
      }

      // BigNumber case removed - no longer needed

      if (typeof value === 'number') {
        return BigInt(Math.trunc(value));
      }

      return BigInt(value);
    };

    return {
      networkId,
      txHash: response.hash,
      blockNumber: resolvedBlockNumber,
      gasUsed: normalizeGasUsed(rawGasUsed),
    };
  }

  private _applyGasBuffer(gasEstimate: bigint, gasBuffer?: GasBuffer): bigint {
    if (!gasBuffer) {
      return gasEstimate;
    }
    return gasBuffer.fixed
      ? gasEstimate + BigInt(gasBuffer.fixed.toString())
      : (gasEstimate * BigInt(Math.floor((gasBuffer.multiplier || 1.2) * 100))) / 100n;
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

  private async _getManiDeckContract() {
    const networkId = this.data.publicData.network || 1;

    // Return a wrapper object that uses publicProvider for contract reads
    return {
      getClaim: async (creatorContract: string, instanceId: number) => {
        const result = await this._publicProvider.readContract<{
          storageProtocol: number;
          total: number;
          totalMax: number;
          startDate: number;
          endDate: number;
          startingTokenId: bigint;
          tokenVariations: number;
          location: string;
          paymentReceiver: string;
          cost: bigint;
          erc20: string;
        }>({
          contractAddress: this._extensionAddress,
          abi: GachaExtensionERC1155ABIv2,
          functionName: 'getClaim',
          args: [creatorContract, instanceId],
          networkId,
        });
        return result;
      },
      MINT_FEE: async () => {
        const result = await this._publicProvider.readContract<bigint>({
          contractAddress: this._extensionAddress,
          abi: GachaExtensionERC1155ABIv2,
          functionName: 'MINT_FEE',
          networkId,
        });
        return result;
      },
    };
  }

  private async _processManiDeckData(claimData: {
    storageProtocol: number;
    total: number;
    totalMax: number;
    startDate: number;
    endDate: number;
    startingTokenId: bigint;
    tokenVariations: number;
    location: string;
    paymentReceiver: string;
    cost: bigint;
    erc20: string;
  }): Promise<ManiDeckOnchainData> {
    // Handle the actual structure from ABIv2 getClaim
    const cost = claimData.cost;
    const address = claimData.erc20;

    // Convert dates from unix seconds
    const convertDate = (unixSeconds: number): Date | undefined => {
      return !unixSeconds ? undefined : new Date(unixSeconds * 1000);
    };

    const networkId = this.data.publicData.network;

    // Create Money object which will fetch all metadata automatically
    const costMoney = await Money.create({
      value: cost,
      networkId,
      address,
      fetchUSD: true,
    });

    return {
      totalSupply: claimData.totalMax || 0,
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

  async getStatus(): Promise<ManiDeckStatus> {
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
    const onchainData = await this.fetchOnchainData();
    const publicData = this.data.publicData;

    return publicData.pool.map((item) => ({
      tokenId: parseInt(onchainData.startingTokenId) + (item.seriesIndex - 1), // seriesIndex is 1-based
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

  private get _creatorContract(): Address {
    return this.data.publicData.contract.contractAddress;
  }

  private get _extensionAddress(): Address {
    return this.data.publicData.extensionAddress1155.value;
  }
}

// Type guard
export function isManiDeckProduct(product: unknown): product is IManiDeckProduct {
  return (product as IManiDeckProduct)?.type === AppType.MANI_DECK;
}
