'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import MintButton from '@/components/MintButton'
import { useState } from 'react'

export default function Home() {
  const [instanceId, setInstanceId] = useState(
    process.env.NEXT_PUBLIC_INSTANCE_ID || ''
  )
  const [quantity, setQuantity] = useState(1)

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Step-by-Step Edition Mint
            </h1>
            <p className="text-lg text-gray-600">
              Experience transparent transaction execution with explicit control over each step
            </p>
          </header>

          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="flex justify-center mb-8">
              <ConnectButton />
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <label htmlFor="instanceId" className="block text-sm font-medium text-gray-700 mb-2">
                  Edition Product Instance ID
                </label>
                <input
                  id="instanceId"
                  type="text"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="Enter instance ID or Manifold URL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Find this in your Manifold Studio product URL
                </p>
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Mint
                </label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="10"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {instanceId && (
              <MintButton instanceId={instanceId} quantity={quantity} />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h2>
            <ol className="space-y-4 text-gray-700">
              <li className="flex">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
                  1
                </span>
                <div>
                  <strong className="block mb-1">Connect Wallet</strong>
                  <span className="text-sm text-gray-600">
                    Connect your wallet using RainbowKit
                  </span>
                </div>
              </li>
              <li className="flex">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
                  2
                </span>
                <div>
                  <strong className="block mb-1">Prepare Purchase</strong>
                  <span className="text-sm text-gray-600">
                    Click "Mint" to prepare the transaction and see all required steps
                  </span>
                </div>
              </li>
              <li className="flex">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
                  3
                </span>
                <div>
                  <strong className="block mb-1">Execute Steps</strong>
                  <span className="text-sm text-gray-600">
                    Review and execute each transaction step individually with full transparency
                  </span>
                </div>
              </li>
              <li className="flex">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-3">
                  4
                </span>
                <div>
                  <strong className="block mb-1">Complete Purchase</strong>
                  <span className="text-sm text-gray-600">
                    After all steps are executed, your Edition NFT is yours!
                  </span>
                </div>
              </li>
            </ol>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Built with Manifold Client SDK</p>
            <div className="mt-2 space-x-4">
              <a
                href="https://docs.manifold.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Documentation
              </a>
              <a
                href="https://github.com/manifoldxyz/client-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}