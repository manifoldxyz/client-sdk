import type { Address, AppType, ProductStatus } from './common';
import type { 
  PreparedPurchase, 
  PurchaseParams, 
  PreparePurchaseParams, 
  Order,
  TransactionStep,
  TransactionReceipt
} from './purchase';

// Base Product type as per documentation (lines 1231-1238)
export interface BaseProduct {
  id: string;
  type: AppType;
  data: InstanceData;
  previewData: PreviewData;
}

// Preview Data type as per documentation (lines 1243-1256)
export interface PreviewData {
  title?: string;
  description?: string;
  contract?: Contract;
  thumbnail?: string;
  payoutAddress?: string;
  network?: number;
  startDate?: Date;
  endDate?: Date;
  price?: Money;
}

// Instance Data structure (lines 1479-1488)
export interface InstanceData {
  id: string;
  creator: Workspace;
  publicData: EditionPublicData | BurnRedeemPublicData | BlindMintPublicData;
  appId: number;
  appName: string;
}

// Workspace type (lines 1314-1322)
export interface Workspace {
  id: string;
  slug: string;
  address: string;
  name?: string;
}

// Public Data types for each product
export interface EditionPublicData {
  title: string;
  description?: string;
  asset: Asset;
  network: number;
  contract: Contract;
  extensionAddress: string;
}

export interface BurnRedeemPublicData {
  redeemAsset: Asset;
  network: number;
  redeemContract: Contract;
  extensionAddress: string;
}

export interface BlindMintPublicData {
  title: string;
  description?: string;
  network: number;
  contract: Contract;
  extensionAddress: string;
  tierProbabilities: BlindMintTierProbability;
  pool: BlindMintPool[];
}

// Asset type (lines 1273-1281)
export interface Asset {
  name: string;
  description?: string;
  attributes?: object;
  media?: Media;
}

// Media type (lines 1264-1272)
export interface Media {
  image: string;
  imagePreview?: string;
  animation?: string;
  animationPreview?: string;
}

// Contract type (lines 1331-1342)
export interface Contract {
  networkId: number;
  address: string;
  explorer: Explorer;
  name?: string;
  symbol?: string;
  spec: 'erc1155' | 'erc721';
}

// Explorer type (lines 1364-1371)
export interface Explorer {
  etherscanUrl: string;
  manifoldUrl?: string;
  openseaUrl?: string;
}

// Specific product types that extend base Product (lines 1239-1248)
export interface EditionProduct extends BaseProduct {
  type: AppType.Edition;
  data: InstanceData & { publicData: EditionPublicData };
  previewData: PreviewData;
  onchainData?: EditionOnchainData;

  // Methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<EditionOnchainData>;
}

export interface BurnRedeemProduct extends BaseProduct {
  type: AppType.BurnRedeem;
  data: InstanceData & { publicData: BurnRedeemPublicData };
  previewData: PreviewData;
  onchainData?: BurnRedeemOnchainData;

  // Methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BurnRedeemOnchainData>;
}

export interface BlindMintProduct extends BaseProduct {
  type: AppType.BlindMint;
  data: InstanceData & { publicData: BlindMintPublicData };
  previewData: PreviewData;
  onchainData?: BlindMintOnchainData;

  // Methods
  getAllocations(params: AllocationParams): Promise<AllocationResponse>;
  preparePurchase(params: PreparePurchaseParams): Promise<PreparedPurchase>;
  purchase(params: PurchaseParams): Promise<Order>;
  getStatus(): Promise<ProductStatus>;
  getPreviewMedia(): Promise<Media | undefined>;
  getMetadata(): Promise<ProductMetadata>;
  getInventory(): Promise<ProductInventory>;
  getRules(): Promise<ProductRule>;
  getProvenance(): Promise<ProductProvenance>;
  fetchOnchainData(): Promise<BlindMintOnchainData>;
}

// Audience type enum
export type AudienceType = 'None' | 'Allowlist' | 'RedemptionCode';

// OnchainData types (lines 1489-1530)
export interface EditionOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  audienceType: AudienceType;
  cost: Money;
  paymentReceiver: string;
}

export interface BurnRedeemOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  audienceType: AudienceType;
  cost: Money;
  paymentReceiver: string;
  burnSet: BurnSetData;
}

export interface BlindMintOnchainData {
  totalSupply: number;
  totalMinted: number;
  walletMax: number;
  startDate: Date;
  endDate: Date;
  audienceType: AudienceType;
  cost: Money;
  paymentReceiver: string;
  tokenVariations: number;
  startingTokenId: number;
}

// Additional types from documentation
export interface ProductMetadata {
  name: string;
  description?: string;
}

export interface ProductInventory {
  totalSupply: number;
  totalPurchased: number;
}

export interface ProductRule {
  startDate?: Date;
  endDate?: Date;
  audienceRestriction: 'allowlist' | 'none' | 'redemption-codes';
  maxPerWallet?: number;
}

export interface ProductProvenance {
  creator: Workspace;
  contract?: Contract;
  token?: Token;
  networkId?: number;
}

export interface Token {
  contract: Contract;
  tokenId: string;
  explorer: Explorer;
}

// Enhanced Money type as per documentation (lines 1351-1362)
export interface Money {
  value: bigint;
  decimals: number;
  currency: string;
  erc20: string;
  symbol: string;
  name: string;
  formatted: string;
  formattedUSD: string;
}

// Parameter types
export interface AllocationParams {
  recipientAddress: Address;
}

export interface AllocationResponse {
  isEligible: boolean;
  reason?: string;
  quantity: number;
}

// Burn/Redeem specific types
export interface BurnSetData {
  items: TokenItemRequirement[];
  requiredCount: number;
}

export interface TokenItemRequirement {
  quantity: number;
  burnSpec: 'manifold' | 'openZeppelin' | 'none';
  tokenSpec: 'erc721' | 'erc1155';
  tokenIds?: string[];
  maxTokenId?: string;
  minTokenId?: string;
  contractAddress: string;
  merkleRoot?: string;
  validationType: 'contract' | 'range' | 'merkleTree' | 'any';
}

// BlindMint specific types
export interface BlindMintTierProbability {
  group: string;
  indices: number[];
  rate: number;
}

export interface BlindMintPool {
  index: number;
  metadata: Asset;
}

// Union type for Product
export type Product = EditionProduct | BurnRedeemProduct | BlindMintProduct;

// Re-export purchase-related types
export type {
  PreparePurchaseParams,
  PreparedPurchase,
  PurchaseParams,
  Order,
  TransactionStep,
  TransactionReceipt
} from './purchase';
