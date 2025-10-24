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
} from '../types';
import type { Address } from '../types/common';
import { AppType, AppId } from '../types/common';
import type { EditionClaimContract, Edition1155ClaimContract } from '../utils/contract-factory';
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
// Import merkleProofService for potential future allowlist integration
// import { merkleProofService } from '../utils/merkle-proof';

/**
 * Base edition claim data structure
 */
interface BaseEditionClaimData {
  /** Total tokens minted */
  total: number;
  /** Maximum total supply (0 = unlimited) */
  totalMax: number;
  /** Maximum tokens per wallet */
  walletMax?: number;
  /** Start timestamp (Unix seconds) */
  startDate: number;
  /** End timestamp (Unix seconds) */
  endDate: number;
  /** Storage protocol identifier */
  storageProtocol: number;
  /** Merkle root for allowlist */
  merkleRoot?: string;
  /** Metadata location string */
  location: string;
  /** Cost per token in wei */
  cost: ethers.BigNumber;
  /** Payment receiver address */
  paymentReceiver: string;
  /** ERC20 token address (0x0 for ETH) */
  erc20: string;
  /** Signing address for verification */
  signingAddress?: string;
  /** Token ID (for ERC1155) */
  tokenId?: ethers.BigNumber;
  /** Token variations (for ERC721) */
  tokenVariations?: number;
  /** Starting token ID (for ERC721) */
  startingTokenId?: ethers.BigNumber;
  /** Contract version */
  contractVersion?: number;
  /** Whether all tokens are identical */
  identical?: boolean;
}

/**
 * Edition claim data union type to handle both ERC721 and ERC1155 responses
 */
type EditionClaimData = BaseEditionClaimData | { claim: BaseEditionClaimData };

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
  private _creatorContract: Address;
  private _extensionAddress: Address;
  private _platformFee?: Money;
  private _httpRPCs?: Record<number, string>;
  private _isERC1155: boolean;

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

    const publicData = instanceData.publicData;

    // Store instance data with properly typed publicData
    this.data = instanceData;
    this.previewData = previewData;

    this.id = instanceData.id;

    this._creatorContract = publicData.contract.contractAddress;
    this._extensionAddress = publicData.extensionAddress;

    // Determine token standard from contract spec
    this._isERC1155 = publicData.contract.spec === 'erc1155';
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

      // Process into EditionOnchainData format
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
          fallbackGas: ethers.BigNumber.from(300000),
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

  private _getClaimContract(): EditionClaimContract | Edition1155ClaimContract {
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

    // Return appropriate contract based on token standard
    return this._isERC1155
      ? factory.createEdition1155Contract(this._extensionAddress)
      : factory.createEditionContract(this._extensionAddress);
  }

  private async _processClaimData(claimData: EditionClaimData): Promise<EditionOnchainData> {
    // Extract claim data - handle both ERC721 (direct) and ERC1155 (wrapped) formats
    const claim: BaseEditionClaimData = 'claim' in claimData ? claimData.claim : claimData;

    // Handle the actual structure from Edition getClaim method
    const cost = ethers.BigNumber.from(claim.cost);
    const erc20 = claim.erc20;

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
      value: cost,
      networkId,
      erc20,
      provider,
      fetchUSD: true,
    });

    // Determine audience type based on merkle root
    let audienceType: AudienceType = 'None';
    if (claim.merkleRoot && claim.merkleRoot !== ethers.constants.HashZero) {
      audienceType = 'Allowlist';
    }

    return {
      totalSupply: claim.totalMax || 0,
      totalMinted: claim.total || 0,
      walletMax: claim.walletMax || 0,
      startDate: convertDate(claim.startDate),
      endDate: convertDate(claim.endDate),
      audienceType,
      cost: costMoney,
      paymentReceiver: claim.paymentReceiver,
    };
  }

  private async _generateMintProofs(
    _walletAddress: string,
    _quantity: number,
  ): Promise<{ mintIndices: number[]; merkleProofs: string[][] }> {
    const onchainData = await this.fetchOnchainData();

    // If no allowlist (merkle root is zero), return empty arrays
    if (onchainData.audienceType === 'None') {
      return { mintIndices: [], merkleProofs: [] };
    }

    // For allowlist, we would need to fetch the allowlist data from the API
    // This is a simplified implementation - in practice, you'd fetch from Manifold API
    // For now, return empty arrays (public sale scenario)
    return { mintIndices: [], merkleProofs: [] };
  }

  // =============================================================================
  // PRODUCT INTERFACE IMPLEMENTATION
  // =============================================================================

  async getStatus(): Promise<ProductStatus> {
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

    // Check if allowlist is active
    if (onchainData.audienceType === 'Allowlist') {
      // In a real implementation, you would:
      // 1. Fetch allowlist data from Manifold API
      // 2. Use merkleProofService.checkEligibility() to verify eligibility
      // For now, we'll assume public eligibility
    }

    // Calculate available quantity considering wallet max and remaining supply
    let quantity = onchainData.walletMax || Number.MAX_SAFE_INTEGER;

    if (onchainData.totalSupply) {
      const remaining = onchainData.totalSupply - onchainData.totalMinted;
      quantity = Math.min(quantity, remaining);
    }

    // Check current mints for this wallet (simplified)
    const contract = this._getClaimContract();
    try {
      const currentMints = await contract.getTotalMints(
        recipientAddress,
        this._creatorContract,
        this.id,
      );
      const remainingForWallet = Math.max(
        0,
        (onchainData.walletMax || Number.MAX_SAFE_INTEGER) - currentMints,
      );
      quantity = Math.min(quantity, remainingForWallet);
    } catch (error) {
      // If getTotalMints fails, continue with calculated quantity
    }

    return { isEligible: quantity > 0, quantity: Math.max(0, quantity) };
  }

  // =============================================================================
  // OTHER PRODUCT METHODS
  // =============================================================================

  async getInventory(): Promise<ProductInventory> {
    const onchainData = await this.fetchOnchainData();
    return {
      totalSupply:
        onchainData.totalSupply === Number.MAX_SAFE_INTEGER ? -1 : onchainData.totalSupply,
      totalPurchased: onchainData.totalMinted,
    };
  }

  async getRules(): Promise<ProductRule> {
    const onchainData = await this.fetchOnchainData();

    const audienceRestriction: AudienceRestriction =
      onchainData.audienceType === 'Allowlist' ? 'allowlist' : 'none';

    return {
      startDate: onchainData.startDate,
      endDate: onchainData.endDate,
      audienceRestriction,
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
