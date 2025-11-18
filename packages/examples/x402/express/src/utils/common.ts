// Supported payment networks (Where user will pay using USDC)
export const SUPPORTED_PAYMENT_NETWORKS = [8453, 84532];

// Supported product networks (Where the NFT is minted)
export const SUPPORTED_PRODUCT_NETWORKS = [8453, 11155111];

export const TESTNET_NETWORKS = [84532, 11155111];

export function isTestnet(paymentNetworkId: number): boolean {
  return TESTNET_NETWORKS.includes(paymentNetworkId);
}
