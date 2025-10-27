import { createClient, EditionProduct, PreparedPurchase, createAccountViem } from '@manifoldxyz/client-sdk'  

const httpRPCs: Record<number, string> = {}
if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    httpRPCs[1] = `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    httpRPCs[8453] = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
}
    
export const client = createClient({ httpRPCs })