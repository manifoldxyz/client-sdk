// Products export index

// BlindMint product implementation
export { BlindMintProduct, isBlindMintProduct } from './blindmint';

// Re-export product types
export type {
  BlindMintProduct as BlindMintProductType,
  BlindMintPublicData,
  BlindMintOnchainData,
  BlindMintStatus,
  BlindMintInventory,
  TokenVariation,
  GachaTier,
  ClaimableToken,
  MintValidationParams,
  MintValidation,
} from '../types/blindmint';

export type {
  Product,
  EditionProduct,
  BurnRedeemProduct,
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
