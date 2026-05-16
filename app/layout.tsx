import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { HeaderProvider } from '@/lib/header-context'
import { AuthProvider } from '@/lib/auth-context'
import { CartProvider } from '@/lib/cart-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import ToastProvider from '@/components/ToastProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

const aeonik = localFont({
  src: [
    {
      path: '../public/fonts/Aeonik Font/New Aeonik Trials/AeonikTRIAL-Regular.otf',
      weight: '400',
      style: 'normal',
    },

    {
      path: '../public/fonts/Aeonik Font/New Aeonik Trials/AeonikTRIAL-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-aeonik'
})

const drukMedium = localFont({
  src: '../public/fonts/druk-trial-cufonfonts/DrukWide-Medium-Trial.otf',
  variable: '--font-druk-medium'
})
const logo = localFont({
  src: '../public/fonts/swera (1)/Swera Regular Demo.otf',
  variable: '--font-logo'
})

export const metadata: Metadata = {
  title: 'Ethiopian Handcraft Marketplace',
  description: 'Discover authentic Ethiopian handcrafted products from skilled artisans',
  generator: 'v0.app',
}

export const viewport = {
  themeColor: '#D4AF37',
  userScalable: 'no',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${aeonik.variable} ${drukMedium.variable} ${logo.variable} font-inter antialiased bg-background text-foreground`}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <HeaderProvider>
                {children}
                <ToastProvider />
              </HeaderProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
