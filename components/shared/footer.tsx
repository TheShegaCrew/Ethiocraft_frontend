'use client'

import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-16 font-inter">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-druk-medium text-lg mb-4">
              <div className="w-6 h-6 bg-secondary rounded-full flex items-center justify-center">
                <span className="text-primary text-sm font-bold">E</span>
              </div>
              <span>Ethiopian Crafts</span>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Supporting authentic Ethiopian artisans and their heritage crafts.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-aeonik font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/products" className="hover:text-secondary transition">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?category=textiles" className="hover:text-secondary transition">
                  Textiles
                </Link>
              </li>
              <li>
                <Link href="/products?category=jewelry" className="hover:text-secondary transition">
                  Jewelry
                </Link>
              </li>
              <li>
                <Link href="/products?category=crafts" className="hover:text-secondary transition">
                  Crafts
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-secondary transition">
                  Contact Us
                </Link>
              </li>

              <li>
                <Link href="#" className="hover:text-secondary transition">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-secondary transition">
                  Returns
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-aeonik font-semibold mb-4">Follow Us</h3>
            <div className="flex gap-4">
              <Link
                href="#"
                className="hover:text-secondary transition p-2 rounded-lg hover:bg-primary-foreground/10"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="hover:text-secondary transition p-2 rounded-lg hover:bg-primary-foreground/10"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="hover:text-secondary transition p-2 rounded-lg hover:bg-primary-foreground/10"
              >
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="text-primary-foreground/70">
            © 2026 EthioCraft. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-secondary transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-secondary transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
