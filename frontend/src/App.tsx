import React from 'react';
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider, ConnectKitButton } from 'connectkit'
import { Toaster } from 'react-hot-toast'
import { config } from './config/web3'
import AaveVaultManager from './components/AaveVaultManager'
import './App.css';

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(90deg,rgba(42, 155, 85, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(83, 237, 119, 1) 100%)',
            padding: '20px',
            fontFamily: '"Montserrat", "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
          }}>
            {/* Wallet connection positioned in top right */}
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '20px'
            }}>
              <ConnectKitButton />
            </div>

            {/* Centered title */}
            <div style={{
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              <h1 style={{
                color: 'white',
                fontSize: '3rem',
                fontWeight: '700',
                margin: 0,
                fontFamily: '"Montserrat", sans-serif',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '-0.5px'
              }}>
                Ramp AAVE USDC vault
              </h1>
            </div>

            {/* Main content card */}
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <AaveVaultManager />
            </div>
          </div>
          
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '10px',
                padding: '16px',
                fontSize: '14px',
                maxWidth: '400px',
              },
              success: {
                style: {
                  background: '#4ade80',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#4ade80',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                  color: '#fff',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#ef4444',
                },
              },
              loading: {
                style: {
                  background: '#3b82f6',
                  color: '#fff',
                },
              },
            }}
          />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
