// Products export index

// BlindMint product implementation
export {
  BlindMintProduct,
  isBlindMintProduct
} from './blindmint';

// Mock implementations for testing
export { createMockProduct } from './mock';

// Re-export product types
export type {
  BlindMintProduct as BlindMintProductType,
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