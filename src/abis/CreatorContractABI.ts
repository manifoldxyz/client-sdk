/**
 * ERC721 Creator Contract ABI (simplified)
 */
export const CreatorContractABI = [
  // Standard ERC721 functions
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId) external',

  // Creator-specific functions
  'function totalSupply() external view returns (uint256)',
  'function contractURI() external view returns (string)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
] as const;
