import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { http, custom } from 'wagmi';
import {
  base,
  mainnet,
  sepolia,
} from 'wagmi/chains';
import { createPublicProviderWagmi } from '@manifoldxyz/client-sdk';


export function getWagmiConfig(){
    return getDefaultConfig({
        appName: 'Manifold Mint Example',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [mainnet, base, sepolia],
        transports: {
          [mainnet.id]: process.env.NEXT_PUBLIC_RPC_URL_MAINNET ? http(process.env.NEXT_PUBLIC_RPC_URL_MAINNET) : http(),
          [sepolia.id]: process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ? http(process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA) : http(),
          [base.id]:  process.env.NEXT_PUBLIC_RPC_URL_BASE ? http(process.env.NEXT_PUBLIC_RPC_URL_BASE) : http(),
        },
        ssr: true,
    })
}

export function getPublicProvider(){
    return createPublicProviderWagmi({config: getWagmiConfig()})
}