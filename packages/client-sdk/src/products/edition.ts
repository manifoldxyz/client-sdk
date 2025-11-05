import type {
  Product,
  AllocationParams,
  AllocationResponse,
  PreparePurchaseParams,
  PurchaseParams,
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
  Receipt,
  TransactionReceipt,
  TokenOrder,
  TokenOrderItem,
  Token,
  EditionPublicDataResponse,
  IPublicProvider,
} from '../types';
import { AppType, AppId } from '../types/common';
import type {
  ClaimableMerkleInfo,
  EditionClaimData,
  ERC721ClaimData,
  ERC1155ClaimData,
} from '../types/edition';
import * as ethers from 'ethers';
import { validateAddress } from '../utils/validation';
import { ClientSDKError, ErrorCode } from '../types/errors';
import type { InstancePreview } from '@manifoldxyz/studio-apps-client-public';
import manifoldApiClient from '../api/manifold-api';
import { estimateGas } from '../utils/gas-estimation';
import { Money } from '../libs/money';
import type { Cost } from '../types/money';
import type { UniversalTransactionResponse } from '../types/account-adapter';
import { convertManifoldContractToContract } from '../utils/common';
import { ClaimExtensionERC1155ABI, ClaimExtensionERC721ABI, ERC20ABI } from '../abis';

type MintedTokenAllocation = {
  tokenId: string;
  quantity: number;
};

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
  private readonly _publicProvider: IPublicProvider;

  /**
   * Creates a new EditionProduct instance.
   *
   * @param instanceData - Product instance data from the API
   * @param previewData - Preview data for the product
   * @param publicProvider - Public provider for blockchain interactions
   *
   * @throws {ClientSDKError} If the app ID doesn't match EDITION
   *
   * @internal
   */
  constructor(
    instanceData: InstanceData<EditionPublicDataResponse>,
    previewData: InstancePreview,
    publicProvider: IPublicProvider,
  ) {
    // Validate app ID
    if (instanceData.appId !== AppId.EDITION) {
      throw new ClientSDKError(
        ErrorCode.INVALID_INPUT,
        `Invalid app ID for Edition. Expected ${AppId.EDITION}, received ${instanceData.appId}`,
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
          instanceData.creator.slug,
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
      const contract = await this._getClaimContract();

      // Use getClaim method to fetch claim data
      const claimData = await contract.getClaim(this._creatorContract, this.id);

      // Fetch platform fees from contract first
      const networkId = this.data.publicData.network;

      // Fetch standard mint fee
      const mintFee = await contract.MINT_FEE();
      const platformFee = await Money.create({
        value: mintFee,
        networkId,
        fetchUSD: true,
      });

      // Fetch merkle mint fee (for allowlist mints)
      const merkleMintFee = await contract.MINT_FEE_MERKLE();
      const merklePlatformFee = await Money.create({
        value: merkleMintFee,
        networkId,
        fetchUSD: true,
      });

      // Process into EditionOnchainData format with platform fees
      const onchainData = await this._processClaimData(claimData, platformFee, merklePlatformFee);

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
    const { userAddress, recipientAddress, payload, account } = params;
    const quantity = payload?.quantity || 1;
    const networkId = this.data.publicData.network;

    // The address that will trigger and fund the transaction
    const user = account ? await account.getAddress() : userAddress;
    const recipient = recipientAddress || user;

    if (!validateAddress(user)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid user wallet address', {
        user,
      });
    }

    if (!validateAddress(recipient)) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Invalid recipient wallet address', {
        recipient,
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

        if (balance < totalCost.value) {
          throw new ClientSDKError(
            ErrorCode.INSUFFICIENT_FUNDS,
            `Insufficient ${totalCost.symbol} balance. Need ${totalCost.formatted} but have ${ethers.utils.formatUnits(balance, totalCost.decimals)}`,
          );
        }

        if (currentAllowance < totalCost.value) {
          const gasEstimate = await estimateGas({
            publicProvider: this._publicProvider,
            contractAddress: tokenAddress,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [this._extensionAddress, totalCost.value],
            from: user,
            networkId,
          });

          const approvalStep: TransactionStep = {
            id: `approve-${totalCost.symbol.toLowerCase()}`,
            name: `Approve ${totalCost.symbol} Spending`,
            type: 'approve',
            description: `Approve ${totalCost.formatted} ${totalCost.symbol}`,
            transactionData: {
              value: BigInt('0'),
              contractAddress: tokenAddress,
              transactionData: this._buildApprovalData(
                this._extensionAddress,
                totalCost.value.toString(),
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
                args: [this._extensionAddress, totalCost.value],
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

              const transactionReceipt = this._buildTransactionReceipt(confirmation);

              return {
                transactionReceipt,
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
            const rawBalance = await this._publicProvider.getBalance({
              address: user,
              networkId,
            });
            nativeBalance = await Money.create({
              value: BigInt(rawBalance.toString()),
              networkId,
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

    // Generate merkle proofs if needed for allowlist
    const { mintIndices, merkleProofs } = await this._generateMintProofs(recipient, quantity);

    // estimate gas
    const gasEstimate = await estimateGas({
      publicProvider: this._publicProvider,
      contractAddress: this._extensionAddress,
      abi: ClaimExtensionERC721ABI,
      functionName: 'mintProxy',
      args: [this._creatorContract, this.id, quantity, mintIndices, merkleProofs, recipient],
      from: user,
      networkId,
      value: nativePaymentValue,
    });

    const mintData = this._buildMintData(
      this._creatorContract,
      this.id,
      quantity,
      mintIndices,
      merkleProofs,
      recipient,
    );

    const mintStep: TransactionStep = {
      id: 'mint',
      name: 'Mint Edition NFTs',
      type: 'mint',
      description: `Mint ${quantity} NFT(s)`,
      cost: mintCost,
      transactionData: {
        contractAddress: this._extensionAddress,
        value: BigInt(nativePaymentValue.toString()),
        transactionData: mintData, // Will be populated with actual mint data
        gasEstimate: BigInt(gasEstimate.toString()), // Default estimate, will be updated
        networkId,
      },
      execute: async (account: IAccount, options?: TransactionStepExecuteOptions) => {
        // This will handle network switch and adding custom network to user wallet if needed
        await account.switchNetwork(networkId);
        const walletAddress = await account.getAddress();
        const mintToAddress = recipientAddress || walletAddress;
        // Generate merkle proofs if needed for allowlist
        const { mintIndices, merkleProofs } = await this._generateMintProofs(
          mintToAddress,
          quantity,
        );

        const mintData = this._buildMintData(
          this._creatorContract,
          this.id,
          quantity,
          mintIndices,
          merkleProofs,
          mintToAddress,
        );

        const gasEstimate = await estimateGas({
          publicProvider: this._publicProvider,
          contractAddress: this._extensionAddress,
          abi: ClaimExtensionERC721ABI,
          functionName: 'mintProxy',
          args: [
            this._creatorContract,
            this.id,
            quantity,
            mintIndices,
            merkleProofs,
            mintToAddress,
          ],
          from: walletAddress,
          networkId,
          value: nativePaymentValue,
        });

        const gasLimit = this._applyGasBuffer(gasEstimate, params.gasBuffer).toString();
        const txRequest: UniversalTransactionRequest = {
          to: this._extensionAddress,
          data: mintData,
          value: nativePaymentValue.toString(),
          gasLimit,
          chainId: networkId,
        };

        const confirmation = await account.sendTransactionWithConfirmation(txRequest, {
          confirmations: options?.confirmations || 1,
        });

        const transactionReceipt = this._buildTransactionReceipt(confirmation);
        const logs = confirmation.logs ?? [];
        const mintedAllocations = this._parseMintedTokensFromLogs(
          logs,
          walletAddress,
          mintToAddress,
        );

        const order = this._buildTokenOrder(mintToAddress, mintedAllocations, cost);

        return {
          transactionReceipt,
          order,
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
    if (!finalReceipt?.order) {
      throw new ClientSDKError(
        ErrorCode.TRANSACTION_FAILED,
        'Unable to obtain order details from purchase transaction',
      );
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
    const spec = this.contract.spec as string;
    if (spec.toLowerCase() === 'erc721') {
      return this.data.publicData.extensionAddress721.value;
    }
    if (spec.toLowerCase() === 'erc1155') {
      return this.data.publicData.extensionAddress1155.value;
    }
    throw new ClientSDKError(
      ErrorCode.INVALID_INPUT,
      `Unsupported contract spec: ${this.contract.spec}`,
    );
  }

  private async _getClaimContract() {
    const networkId = this.data.publicData.network || 1;

    // Return a wrapper object that uses publicProvider for contract reads
    return {
      getClaim: async (creatorContract: string, instanceId: number) => {
        const spec = this.contract.spec as string;
        const isERC721 = spec.toLowerCase() === 'erc721';

        if (isERC721) {
          const result = await this._publicProvider.readContract<ERC721ClaimData>({
            contractAddress: this._extensionAddress,
            abi: ClaimExtensionERC721ABI,
            functionName: 'getClaim',
            args: [creatorContract, instanceId],
            networkId,
          });
          return result;
        } else {
          const result = await this._publicProvider.readContract<ERC1155ClaimData>({
            contractAddress: this._extensionAddress,
            abi: ClaimExtensionERC1155ABI,
            functionName: 'getClaim',
            args: [creatorContract, instanceId],
            networkId,
          });
          return result;
        }
      },
      MINT_FEE: async () => {
        const result = await this._publicProvider.readContract<bigint>({
          contractAddress: this._extensionAddress,
          abi: ClaimExtensionERC721ABI,
          functionName: 'MINT_FEE',
          networkId,
        });
        return result;
      },
      MINT_FEE_MERKLE: async () => {
        const result = await this._publicProvider.readContract<bigint>({
          contractAddress: this._extensionAddress,
          abi: ClaimExtensionERC721ABI,
          functionName: 'MINT_FEE_MERKLE',
          networkId,
        });
        return result;
      },
      getTotalMints: async (wallet: string, creatorContract: string, instanceId: number) => {
        // This is typically the same as getUserMints for most contracts
        const result = await this._publicProvider.readContract<number>({
          contractAddress: this._extensionAddress,
          abi: ClaimExtensionERC721ABI,
          functionName: 'getTotalMints',
          args: [wallet, creatorContract, instanceId],
          networkId,
        });
        return result;
      },
      checkMintIndices: async (
        creatorContract: string,
        instanceId: number,
        mintIndices: number[],
      ) => {
        const result = await this._publicProvider.readContract<boolean[]>({
          contractAddress: this._extensionAddress,
          abi: ClaimExtensionERC721ABI,
          functionName: 'checkMintIndices',
          args: [creatorContract, instanceId, mintIndices],
          networkId,
        });
        return result;
      },
    };
  }

  private async _processClaimData(
    claimData: EditionClaimData,
    platformFee: Money,
    merklePlatformFee: Money,
  ): Promise<EditionOnchainData> {
    // Convert dates from unix seconds
    const convertDate = (unixSeconds: number | bigint): Date => {
      const seconds = typeof unixSeconds === 'bigint' ? Number(unixSeconds) : unixSeconds;
      return new Date(seconds * 1000);
    };

    const networkId = this.data.publicData.network;

    // Create Money object which will fetch all metadata automatically
    const costMoney = await Money.create({
      value: typeof claimData.cost === 'bigint' ? claimData.cost : BigInt(claimData.cost),
      networkId,
      erc20: claimData.erc20,
      fetchUSD: true,
    });

    // Determine audience type based on merkle root
    let audienceType: AudienceType = 'None';
    if (claimData.merkleRoot && claimData.merkleRoot !== ethers.constants.HashZero) {
      audienceType = 'Allowlist';
    }

    const spec = this.contract.spec as string;
    const isERC721 = spec.toLowerCase() === 'erc721';

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
  ): Promise<ClaimableMerkleInfo> {
    const merkleInfo = await manifoldApiClient.studioClient.public.getMerkleInfo({
      merkleTreeId: _merkleTreeId,
      address: _walletAddress,
      appId: AppId.EDITION,
    });
    const mintIndices = merkleInfo
      .filter((info) => info.value !== undefined)
      .map((claimMerkleInfo) => claimMerkleInfo.value as number);

    // Call checkMintIndices directly using the wrapper object
    const contract = await this._getClaimContract();
    const mintIndicesStatus = await contract.checkMintIndices(
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
      const claimableMerkleInfo = await this._fetchClaimableMerkleInfo(
        this.data.publicData.instanceAllowlist.merkleTreeId,
        walletAddress,
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
    const contract = await this._getClaimContract();

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
      availableForWallet = Math.max(0, onchainData.walletMax - Number(totalMinted));
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
    const image = this.data.publicData.asset.image || this.previewData.thumbnail;
    const imagePreview = this.data.publicData.asset.image_preview || this.previewData.thumbnail;
    const animation = this.data.publicData.asset.animation;
    const animationPreview = this.data.publicData.asset.animation_preview;

    return {
      image,
      imagePreview,
      animation,
      animationPreview,
    };
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private _buildTransactionReceipt(response: UniversalTransactionResponse): TransactionReceipt {
    const resolvedBlockNumber = response.blockNumber;

    const rawGasUsed = response.gasUsed;

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
      networkId: response.chainId,
      txHash: response.hash,
      blockNumber: resolvedBlockNumber,
      gasUsed: normalizeGasUsed(rawGasUsed),
    };
  }

  private _parseMintedTokensFromLogs(
    logs: UniversalTransactionResponse['logs'],
    walletAddress: string,
    recipientAddress: string,
  ): MintedTokenAllocation[] {
    if (!logs || logs.length === 0) {
      return [];
    }

    const contractAddress = this.contract.contractAddress.toLowerCase();
    const zeroAddress = ethers.constants.AddressZero.toLowerCase();
    const targetAddresses = new Set([walletAddress.toLowerCase(), recipientAddress.toLowerCase()]);

    const allocations: MintedTokenAllocation[] = [];
    const spec = this.contract.spec as string;
    const contractSpec = spec.toLowerCase();

    if (contractSpec === 'erc721') {
      const iface = new ethers.utils.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
      ]);

      for (const log of logs) {
        if (!log.topics?.length) {
          continue;
        }
        if (log.address?.toLowerCase() !== contractAddress) {
          continue;
        }

        try {
          const parsed = iface.parseLog({
            topics: log.topics,
            data: log.data,
          });

          const from = (parsed.args.from as string).toLowerCase();
          if (from !== zeroAddress) {
            continue;
          }

          const to = (parsed.args.to as string).toLowerCase();
          if (!targetAddresses.has(to)) {
            continue;
          }
          if (parsed?.args?.tokenId) {
            const tokenId = (parsed.args.tokenId as bigint).toString();
            allocations.push({ tokenId, quantity: 1 });
          }
        } catch {
          // Non-transfer logs will fail to parse - ignore gracefully
        }
      }

      return allocations;
    }

    const iface = new ethers.utils.Interface([
      'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
      'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
    ]);

    for (const log of logs) {
      if (log.address?.toLowerCase() !== contractAddress) {
        continue;
      }

      try {
        const parsed = iface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        const from = (parsed.args.from as string).toLowerCase();
        if (from !== zeroAddress) {
          continue;
        }

        const to = (parsed.args.to as string).toLowerCase();
        if (!targetAddresses.has(to)) {
          continue;
        }

        if (parsed.name === 'TransferSingle') {
          const tokenId = (parsed.args.id as bigint).toString();
          const quantity = Number((parsed.args.id as bigint).toString());
          if (!Number.isNaN(quantity) && quantity > 0) {
            allocations.push({ tokenId, quantity });
          }
        } else if (parsed.name === 'TransferBatch') {
          const ids = Array.from(parsed.args.ids as unknown as Iterable<bigint | number | string>);
          const values = Array.from(
            // eslint-disable-next-line @typescript-eslint/unbound-method
            parsed.args.values as unknown as Iterable<bigint | number | string>,
          );

          ids.forEach((idValue, index) => {
            const tokenId = idValue.toString();
            const rawQuantity = values[index];
            const quantityString =
              typeof rawQuantity === 'bigint'
                ? rawQuantity.toString()
                : typeof rawQuantity === 'number'
                  ? rawQuantity.toString()
                  : typeof rawQuantity === 'string'
                    ? rawQuantity
                    : '0';
            const quantity = Number(quantityString);

            if (!Number.isNaN(quantity) && quantity > 0) {
              allocations.push({ tokenId, quantity });
            }
          });
        }
      } catch {
        // Ignore logs that aren't ERC1155 transfer events
      }
    }

    return allocations;
  }

  private _buildTokenOrder(
    recipientAddress: string,
    allocations: MintedTokenAllocation[],
    cost: Cost,
  ): TokenOrder {
    const totalQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
    if (totalQuantity <= 0) {
      return {
        recipientAddress,
        total: cost,
        items: [],
      };
    }

    const perUnitCost = this._divideCost(cost, totalQuantity);

    const items: TokenOrderItem[] = allocations.map((allocation) => ({
      quantity: allocation.quantity,
      token: this._buildToken(allocation.tokenId),
      total: this._scaleCost(perUnitCost, allocation.quantity),
    }));

    return {
      recipientAddress,
      total: cost,
      items,
    };
  }

  private _buildToken(tokenId: string): Token {
    return {
      networkId: this.data.publicData.network,
      contract: this.contract,
      tokenId,
      explorerUrl: this.contract.explorer,
      media: this._getTokenMedia(),
    };
  }

  private _getTokenMedia(): Media {
    const asset = this.data.publicData.asset;
    const fallbackImage =
      asset.image || asset.image_url || this.previewData.thumbnail || asset.animation || '';
    const fallbackPreview = asset.image_preview || this.previewData.thumbnail || fallbackImage;

    return {
      image: fallbackImage,
      imagePreview: fallbackPreview,
      animation: asset.animation,
      animationPreview: asset.animation_preview,
    };
  }

  private _divideCost(cost: Cost, divisor: number): Cost {
    if (divisor <= 0) {
      throw new ClientSDKError(ErrorCode.INVALID_INPUT, 'Divisor must be greater than zero');
    }

    const divideUsd = (value: string): string => {
      const numeric = parseFloat(value || '0');
      if (!Number.isFinite(numeric)) {
        return '0';
      }
      const divided = numeric / divisor;
      return divided === 0 ? '0' : divided.toFixed(2);
    };

    return {
      totalUSD: divideUsd(cost.totalUSD),
      total: {
        native: cost.total.native.divideInt(divisor),
        erc20s: cost.total.erc20s.map((money) => money.divideInt(divisor)),
      },
      breakdown: {
        product: cost.breakdown.product.divideInt(divisor),
        platformFee: cost.breakdown.platformFee.divideInt(divisor),
      },
    };
  }

  private _scaleCost(cost: Cost, scalar: number): Cost {
    const scaleUsd = (value: string): string => {
      const numeric = parseFloat(value || '0');
      if (!Number.isFinite(numeric) || scalar === 0) {
        return '0';
      }
      const scaled = numeric * scalar;
      return scaled === 0 ? '0' : scaled.toFixed(2);
    };

    return {
      totalUSD: scaleUsd(cost.totalUSD),
      total: {
        native: cost.total.native.multiply(scalar),
        erc20s: cost.total.erc20s.map((money) => money.multiply(scalar)),
      },
      breakdown: {
        product: cost.breakdown.product.multiply(scalar),
        platformFee: cost.breakdown.platformFee.multiply(scalar),
      },
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
